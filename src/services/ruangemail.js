import fs from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import axios from "axios"
import nodemailer from "nodemailer"
import { ImapFlow } from "imapflow"
import { simpleParser } from "mailparser"

const BASE_URL = "https://ruang.email"
const SMTP_HOST = "mx1.ruang.email"
const SMTP_PORT = 465
const IMAP_HOST = "mx1.ruang.email"
const IMAP_PORT = 993

const AUTH_FILE = path.resolve("data/ruangemail-auth.json")

const DEFAULT_AUTH = {
    email: "kado@sang.ceo",
    password: "kadokun765",
    baseUrl: BASE_URL,
    smtpHost: SMTP_HOST,
    smtpPort: SMTP_PORT,
    imapHost: IMAP_HOST,
    imapPort: IMAP_PORT
}

/**
 * Baca konfigurasi akun aktif
 */
export async function getStoredAuth() {
    try {
        if (!existsSync(AUTH_FILE)) return DEFAULT_AUTH
        const content = await fs.readFile(AUTH_FILE, "utf-8")
        const parsed = JSON.parse(content)
        return { ...DEFAULT_AUTH, ...parsed }
    } catch {
        return DEFAULT_AUTH
    }
}

/**
 * Simpan konfigurasi akun
 */
export async function setStoredAuth(data) {
    try {
        await fs.mkdir(path.dirname(AUTH_FILE), { recursive: true })
        await fs.writeFile(AUTH_FILE, JSON.stringify(data, null, 2))
        return true
    } catch {
        return false
    }
}

/**
 * Buat instance Nodemailer SMTP Transporter untuk Ruang Email
 * Sesuai panduan resmi https://ruang.email/guide
 * @param {object} [auth]
 * @param {string} [auth.email]
 * @param {string} [auth.password]
 * @param {string} [auth.host]
 * @param {number} [auth.port]
 */
export function createSmtpTransporter(auth = {}) {
    const user = auth.email || DEFAULT_AUTH.email
    const pass = auth.password || DEFAULT_AUTH.password
    const host = auth.smtpHost || auth.host || SMTP_HOST
    const port = Number(auth.smtpPort || auth.port || SMTP_PORT)

    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
            user,
            pass
        },
        tls: {
            rejectUnauthorized: false
        }
    })
}

/**
 * Buat instance ImapFlow untuk akses kotak surat IMAP Ruang Email
 * @param {object} [auth]
 */
export function createImapClient(auth = {}) {
    const user = auth.email || DEFAULT_AUTH.email
    const pass = auth.password || DEFAULT_AUTH.password
    const host = auth.imapHost || auth.host || IMAP_HOST
    const port = Number(auth.imapPort || auth.port || IMAP_PORT)

    return new ImapFlow({
        host,
        port,
        secure: true,
        auth: {
            user,
            pass
        },
        tls: {
            rejectUnauthorized: false
        },
        connectionTimeout: 6000,
        greetingTimeout: 6000,
        socketTimeout: 10000,
        logger: false
    })
}

/**
 * Instance axios untuk webmail REST API fallback
 */
const client = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Origin": BASE_URL,
        "Referer": `${BASE_URL}/`
    }
})

/**
 * Cek autentikasi login via SMTP Nodemailer & Webmail API
 */
export async function checkAuth(email, password) {
    const auth = (!email || !password) ? await getStoredAuth() : { email, password }
    
    // 1. Verifikasi kredensial lewat SMTP Nodemailer
    const transporter = createSmtpTransporter(auth)
    await transporter.verify()

    // 2. Cek juga ke Webmail API jika memungkinkan
    try {
        await client.post("/api/webmail/auth", {
            email: auth.email,
            password: auth.password
        })
    } catch {}

    return { success: true, email: auth.email }
}

/**
 * Mengambil daftar folder (INBOX, Sent, Drafts, Archive, Junk, Trash)
 */
export async function getFolders(email, password) {
    const auth = (!email || !password) ? await getStoredAuth() : { email, password }
    try {
        const res = await client.post("/api/webmail/folders", {
            email: auth.email,
            password: auth.password
        })
        return res.data?.folders || []
    } catch {
        return ["INBOX", "Sent", "Trash", "Junk", "Drafts"]
    }
}

/**
 * Mengambil daftar pesan di folder tertentu (IMAP dengan fallback ke REST API)
 */
export async function getMessages({ email, password, folder = "INBOX", limit = 20, query = "" } = {}) {
    const auth = (!email || !password) ? await getStoredAuth() : { email, password }

    // Prioritas 1: Gunakan IMAP jika tersedia
    try {
        const imap = createImapClient(auth)
        await imap.connect()
        const lock = await imap.getMailboxLock(folder)
        const messages = []

        try {
            const total = imap.mailbox.exists
            if (total > 0) {
                const fetchRange = `${Math.max(1, total - limit + 1)}:*`
                for await (const message of imap.fetch(fetchRange, { envelope: true, source: true, flags: true })) {
                    let parsed = null
                    try {
                        parsed = await simpleParser(message.source)
                    } catch {}

                    const subject = parsed?.subject || message.envelope?.subject || "(Tanpa Subjek)"
                    const fromAddr = parsed?.from?.text || message.envelope?.from?.[0]?.address || "Unknown"
                    const rawDate = parsed?.date || message.envelope?.date || new Date()
                    let dateStr = new Date().toISOString()
                    if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
                        dateStr = rawDate.toISOString()
                    } else if (rawDate) {
                        const parsedD = new Date(rawDate)
                        if (!isNaN(parsedD.getTime())) dateStr = parsedD.toISOString()
                    }
                    const bodyText = parsed?.text || ""
                    const bodyHtml = parsed?.html || ""
                    const otpData = extractOtpOrLink(`${subject} ${bodyText} ${bodyHtml}`)

                    // Filter query jika ada
                    if (query) {
                        const qLower = query.toLowerCase()
                        const match = subject.toLowerCase().includes(qLower) ||
                                      fromAddr.toLowerCase().includes(qLower) ||
                                      bodyText.toLowerCase().includes(qLower)
                        if (!match) continue
                    }

                    messages.push({
                        id: String(message.uid || message.seq),
                        uid: message.uid,
                        seq: message.seq,
                        subject,
                        from: fromAddr,
                        date: dateStr,
                        otp: otpData.otp || null,
                        link: otpData.links?.[0] || null,
                        links: otpData.links || [],
                        body_text: bodyText,
                        body_html: bodyHtml,
                        flags: Array.from(message.flags || [])
                    })
                }
            }
        } finally {
            lock.release()
            await imap.logout().catch(() => {})
        }

        // Urutkan dari yang paling baru ke lama
        messages.reverse()
        return {
            success: true,
            total: messages.length,
            messages
        }
    } catch (imapErr) {
        // Fallback: REST API Webmail sesuai dev update ruang.email
        try {
            const res = await client.post("/api/webmail/messages", {
                email: auth.email,
                password: auth.password,
                folder,
                page: 1,
                limit
            })
            const rawMsgs = res.data?.messages || []
            const messages = rawMsgs.map(m => {
                const otpData = extractOtpOrLink(`${m.subject || ""} ${m.body_text || ""}`)
                return {
                    id: String(m.id),
                    subject: m.subject || "(Tanpa Subjek)",
                    from: m.from || "Unknown",
                    date: m.date || new Date().toISOString(),
                    seen: Boolean(m.seen),
                    otp: otpData.otp || null,
                    link: otpData.links?.[0] || null,
                    links: otpData.links || [],
                    body_text: m.body_text || "",
                    body_html: m.body_html || ""
                }
            })
            return {
                success: true,
                total: res.data?.total || messages.length,
                page: res.data?.page || 1,
                messages
            }
        } catch {
            throw new Error(`Gagal memuat pesan email: ${imapErr.message}`)
        }
    }
}

/**
 * Mengambil detail pesan berdasarkan ID (IMAP / REST)
 */
export async function getMessage({ email, password, folder = "INBOX", id } = {}) {
    if (!id) throw new Error("ID pesan harus disertakan")
    const auth = (!email || !password) ? await getStoredAuth() : { email, password }

    try {
        const imap = createImapClient(auth)
        await imap.connect()
        const lock = await imap.getMailboxLock(folder)
        try {
            const message = await imap.fetchOne(id, { source: true, envelope: true }, { uid: true }).catch(() => null)
                || await imap.fetchOne(id, { source: true, envelope: true }).catch(() => null)

            if (message && message.source) {
                const parsed = await simpleParser(message.source)
                const rawDate = parsed.date || message.envelope?.date || new Date()
                let dateStr = new Date().toISOString()
                if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
                    dateStr = rawDate.toISOString()
                } else if (rawDate) {
                    const parsedD = new Date(rawDate)
                    if (!isNaN(parsedD.getTime())) dateStr = parsedD.toISOString()
                }

                return {
                    id: String(id),
                    messageId: parsed.messageId || message.envelope?.messageId || null,
                    subject: parsed.subject || "(Tanpa Subjek)",
                    from: parsed.from?.text || "Unknown",
                    to: parsed.to?.text || auth.email,
                    date: dateStr,
                    body_text: parsed.text || "",
                    body_html: parsed.html || "",
                    attachments: (parsed.attachments || []).map(a => ({
                        filename: a.filename,
                        contentType: a.contentType,
                        size: a.size
                    }))
                }
            }
        } finally {
            lock.release()
            await imap.logout().catch(() => {})
        }
    } catch {}

    // Fallback: Webmail API
    const res = await client.post("/api/webmail/message", {
        email: auth.email,
        password: auth.password,
        folder,
        id
    })
    return res.data?.message || res.data
}

/**
 * Mengambil kapasitas kuota mailbox
 */
export async function getQuota(email, password) {
    const auth = (!email || !password) ? await getStoredAuth() : { email, password }
    try {
        const res = await client.post("/api/webmail/quota", {
            email: auth.email,
            password: auth.password
        })
        return res.data
    } catch {
        return { used_bytes: 0, quota_bytes: 5368709120, unlimited: false }
    }
}

/**
 * Mengirim email baru menggunakan Nodemailer via SMTP mx1.ruang.email:465
 * Dilengkapi fallback ke Webmail REST API jika diperlukan
 */
export async function sendEmail({
    email,
    password,
    to,
    subject = "(Tanpa Subjek)",
    body_text = "",
    body_html = "",
    from_addr,
    from_name,
    cc = "",
    bcc = "",
    attachments = [],
    inReplyTo,
    references
} = {}) {
    if (!to) throw new Error("Alamat email penerima ('to') harus disertakan")
    const auth = (!email || !password) ? await getStoredAuth() : { email, password }

    const sender = from_addr || auth.email
    const senderName = from_name || sender.split("@")[0]

    // 1. Kirim via SMTP Nodemailer (Rekomendasi Utama Ruang Email)
    try {
        const transporter = createSmtpTransporter(auth)
        const mailOptions = {
            from: `"${senderName}" <${sender}>`,
            to,
            subject,
            text: body_text || body_html.replace(/<[^>]+>/g, ""),
            html: body_html || (body_text ? `<p>${body_text.replace(/\n/g, "<br>")}</p>` : undefined)
        }

        if (cc) mailOptions.cc = cc
        if (bcc) mailOptions.bcc = bcc
        if (attachments && attachments.length > 0) mailOptions.attachments = attachments
        if (inReplyTo) mailOptions.inReplyTo = inReplyTo
        if (references) mailOptions.references = references

        const info = await transporter.sendMail(mailOptions)

        return {
            success: true,
            messageId: info.messageId,
            response: info.response,
            method: "smtp_nodemailer",
            message: `Email berhasil terkirim via SMTP ruang.email (nodemailer)`
        }
    } catch (smtpErr) {
        console.warn("[ruangemail] SMTP Nodemailer gagal, mencoba fallback ke Webmail API:", smtpErr.message)

        // 2. Fallback: REST API Webmail
        const payload = {
            email: auth.email,
            password: auth.password,
            from_addr: sender,
            from_name: senderName,
            to,
            cc,
            bcc,
            subject,
            body_html: body_html || `<p>${body_text.replace(/\n/g, "<br>")}</p>`,
            body_text: body_text || body_html.replace(/<[^>]+>/g, ""),
            attachments
        }

        const res = await client.post("/api/webmail/send", payload)
        return {
            ...res.data,
            method: "webmail_rest_fallback"
        }
    }
}

/**
 * Ekstrak OTP / kode verifikasi dan tautan verifikasi dari email
 */
export function extractOtpOrLink(content = "") {
    if (!content) return { otp: null, links: [] }

    // 1. Format WhatsApp / SMS / Google ber-hyphen (e.g. 561-548, G-123456)
    const hyphenMatch = content.match(/\b(?:(?:g|c)-)?(\d{3}[-\s]\d{3})\b/i) ||
                        content.match(/(?:code|otp|kode|pin|verification|verifikasi)[^\w\d]*([a-z0-9]{3,4}[- ]?[a-z0-9]{3,4})\b/i)

    // 2. Keyword + digit code (4-8 digits)
    const kwDigitMatch = content.match(/\b(?:otp|kode|code|pin|verification|verifikasi)\b[^\w\d]*([0-9]{4,8})\b/i)

    // 3. Keyword + alphanumeric (wajib mengandung angka, 4-8 karakter)
    const kwAlnumMatch = content.match(/\b(?:otp|kode|code|pin|verification|verifikasi)\b[^\w\d]*([a-z0-9]*[0-9][a-z0-9]{3,7})\b/i)

    // 4. Standalone 4-8 digit angka (abaikan tahun 2020-2030 jika tanpa keyword)
    const numMatch = content.match(/(?:^|\D)(\d{4,8})(?:\D|$)/)

    let otp = hyphenMatch ? hyphenMatch[1].trim() : (kwDigitMatch ? kwDigitMatch[1].trim() : (kwAlnumMatch ? kwAlnumMatch[1].trim() : null))
    if (!otp && numMatch) {
        const candidate = numMatch[1].trim()
        if (!/^(202[0-9]|2030)$/.test(candidate)) {
            otp = candidate
        }
    }

    // Cari link verifikasi / magic link
    const links = []
    const linkRegex = /(https?:\/\/[^\s"'<>]+(?:verify|confirm|auth|token|activate|login|signin|sign-in|action|link)[^\s"'<>]*)/gi
    let match
    while ((match = linkRegex.exec(content)) !== null) {
        links.push(match[1])
    }

    // Fallback: ambil link http/https umum jika link spesifik tidak ditemukan
    if (!links.length) {
        const anyUrlRegex = /(https?:\/\/[^\s"'<>]+)/gi
        while ((match = anyUrlRegex.exec(content)) !== null) {
            links.push(match[1])
        }
    }

    return {
        otp,
        links: [...new Set(links)]
    }
}

/**
 * Pendaftaran domain & email baru di portal ruang.email
 */
export async function registerCustomDomain({ domain, name, username, password, owner_pass = "" }) {
    if (!domain || !name || !username || !password) {
        throw new Error("Parameter domain, name, username, dan password wajib diisi")
    }
    const cleanDomain = domain.toLowerCase().trim()
    const cleanUsername = username.toLowerCase().trim()
    const res = await axios.post("https://ruang.email/register/api/custom-domain", {
        domain: cleanDomain,
        name: name.trim(),
        username: cleanUsername,
        password,
        owner_pass
    }, {
        headers: { "Content-Type": "application/json" },
        timeout: 25000
    })
    return res.data
}

/**
 * Buat akun email baru di bawah domain pemilik (API v1 ruang.email)
 * @param {object} params
 * @param {string} params.domain
 * @param {string} params.owner_pass
 * @param {string} params.username
 * @param {string} params.password
 * @param {string} [params.name]
 * @param {number} [params.quota_mb]
 */
export async function createUser({ domain, owner_pass, username, password, name = "User", quota_mb = 1024 }) {
    if (!domain || !owner_pass || !username || !password) {
        throw new Error("Parameter domain, owner_pass, username, dan password wajib diisi")
    }
    const cleanDomain = domain.toLowerCase().trim()
    const cleanUsername = username.toLowerCase().trim()
    const res = await axios.post(`${BASE_URL}/manage/api/create-user`, {
        domain: cleanDomain,
        owner_pass,
        username: cleanUsername,
        password,
        name: name.trim(),
        quota_mb: Number(quota_mb) || 1024
    }, {
        headers: { "Content-Type": "application/json" },
        timeout: 25000
    })

    if (res.data?.success && res.data?.email) {
        await addStoredAccount({
            email: res.data.email,
            password,
            domain: cleanDomain,
            name: name.trim()
        })
    }
    return res.data
}

/**
 * Hapus akun email di bawah domain pemilik (API v1 ruang.email)
 * @param {object} params
 * @param {string} params.domain
 * @param {string} params.owner_pass
 * @param {string} params.email
 */
export async function deleteUser({ domain, owner_pass, email }) {
    if (!domain || !owner_pass || !email) {
        throw new Error("Parameter domain, owner_pass, dan email wajib diisi")
    }
    const cleanDomain = domain.toLowerCase().trim()
    const cleanEmail = email.toLowerCase().trim()
    const res = await axios.post(`${BASE_URL}/manage/api/delete-user`, {
        domain: cleanDomain,
        owner_pass,
        email: cleanEmail
    }, {
        headers: { "Content-Type": "application/json" },
        timeout: 25000
    })

    if (res.data?.success) {
        const accounts = await getStoredAccounts()
        const filtered = accounts.filter(a => a.email.toLowerCase() !== cleanEmail)
        if (filtered.length !== accounts.length) {
            await saveStoredAccounts(filtered)
        }
    }
    return res.data
}

/**
 * Verifikasi status DNS Cloudflare untuk domain ruang.email
 */
export async function verifyDns({ domain, email }) {
    if (!domain) throw new Error("Nama domain wajib diisi")
    const cleanDomain = domain.toLowerCase().trim()
    const cleanEmail = email ? email.toLowerCase().trim() : `admin@${cleanDomain}`
    const res = await axios.post("https://ruang.email/register/api/verify-dns", {
        domain: cleanDomain,
        email: cleanEmail
    }, {
        headers: { "Content-Type": "application/json" },
        timeout: 25000
    })
    return res.data
}

/**
 * Mengambil file konfigurasi Cloudflare DNS BIND Zone (.txt) siap import
 */
export async function getZoneFile(domain) {
    if (!domain) throw new Error("Nama domain wajib diisi")
    const cleanDomain = domain.toLowerCase().trim()
    const res = await axios.get(`https://ruang.email/api/export-zone?domain=${encodeURIComponent(cleanDomain)}`, {
        timeout: 25000,
        responseType: "text"
    })
    return res.data
}

const ACCOUNTS_FILE = path.resolve("data/ruangemail-accounts.json")

/**
 * Mengambil daftar akun email yang tersimpan
 */
export async function getStoredAccounts() {
    try {
        if (!existsSync(ACCOUNTS_FILE)) {
            const auth = await getStoredAuth()
            const initial = [{
                email: auth.email,
                password: auth.password,
                domain: auth.email.split("@")[1] || "",
                name: "Primary",
                active: true
            }]
            await saveStoredAccounts(initial)
            return initial
        }
        const content = await fs.readFile(ACCOUNTS_FILE, "utf-8")
        return JSON.parse(content) || []
    } catch {
        return []
    }
}

/**
 * Menyimpan daftar akun email
 */
export async function saveStoredAccounts(accounts = []) {
    try {
        await fs.mkdir(path.dirname(ACCOUNTS_FILE), { recursive: true })
        await fs.writeFile(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), "utf-8")
        return true
    } catch {
        return false
    }
}

/**
 * Menambahkan atau mengupdate akun email di daftar
 */
export async function addStoredAccount({ email, password, domain, name = "" }) {
    if (!email || !password) throw new Error("Email dan password wajib diisi")
    const accounts = await getStoredAccounts()
    const cleanEmail = email.toLowerCase().trim()
    const cleanDomain = domain || cleanEmail.split("@")[1] || ""

    const idx = accounts.findIndex(a => a.email.toLowerCase() === cleanEmail)
    const entry = {
        email: cleanEmail,
        password,
        domain: cleanDomain,
        name: name || cleanEmail.split("@")[0],
        updatedAt: Date.now()
    }

    if (idx !== -1) {
        accounts[idx] = { ...accounts[idx], ...entry }
    } else {
        accounts.push(entry)
    }

    await saveStoredAccounts(accounts)
    return entry
}

/**
 * Berpindah akun aktif (switch account)
 */
export async function switchStoredAccount(query) {
    if (!query) throw new Error("Sertakan email atau nomor akun yang ingin dipilih")
    const accounts = await getStoredAccounts()
    if (!accounts.length) throw new Error("Belum ada akun tersimpan")

    let target = null
    const cleanQuery = String(query).trim().toLowerCase()

    // 1. Cek jika query berupa index (1, 2, ...)
    if (/^\d+$/.test(cleanQuery)) {
        const idx = Number(cleanQuery) - 1
        if (idx >= 0 && idx < accounts.length) {
            target = accounts[idx]
        }
    }

    // 2. Cek jika query cocok dengan email atau domain
    if (!target) {
        target = accounts.find(a => a.email.toLowerCase() === cleanQuery || a.email.toLowerCase().includes(cleanQuery))
    }

    if (!target) {
        throw new Error(`Akun "${query}" tidak ditemukan di daftar`)
    }

    // Update status active
    accounts.forEach(a => {
        a.active = (a.email.toLowerCase() === target.email.toLowerCase())
    })
    await saveStoredAccounts(accounts)

    // Set auth aktif
    await setStoredAuth({
        email: target.email,
        password: target.password,
        baseUrl: BASE_URL
    })

    return target
}

export default {
    BASE_URL,
    SMTP_HOST,
    SMTP_PORT,
    IMAP_HOST,
    IMAP_PORT,
    getStoredAuth,
    setStoredAuth,
    createSmtpTransporter,
    createImapClient,
    checkAuth,
    getFolders,
    getMessages,
    getMessage,
    getQuota,
    sendEmail,
    extractOtpOrLink,
    registerCustomDomain,
    createUser,
    deleteUser,
    verifyDns,
    getZoneFile,
    getStoredAccounts,
    saveStoredAccounts,
    addStoredAccount,
    switchStoredAccount
}
