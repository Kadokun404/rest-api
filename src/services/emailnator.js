/**
 * Emailnator API Client & Scraper (emailnator.js)
 * Author: ayashiiiyo & Kadokun
 * Source: https://www.emailnator.com
 */

export const HOST = "https://www.emailnator.com"

export const API = {
    generate: `${HOST}/api/generate-email`,
    bulk: `${HOST}/api/generate-bulk-email`,
    inbox: `${HOST}/api/message-list`,
    extend: `${HOST}/api/extend-email`,
    message: `${HOST}/api/message`,
    deleteMessage: `${HOST}/api/delete-message`
}

export const EMAIL_TYPES = {
    domain: 1,
    plusGmail: 2,
    dotGmail: 3,
    googleMail: 8
}

export const TYPE_BY_ID = Object.fromEntries(
    Object.entries(EMAIL_TYPES).map(([name, id]) => [id, name])
)

const DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json",
    "Content-Type": "application/json",
    Origin: HOST,
    Referer: `${HOST}/`
}

const BULK_CHUNK = 500
const MESSAGE_LIMIT = 10
const DEFAULT_TIMEOUT_MS = 30000

function withTimeout(ms = DEFAULT_TIMEOUT_MS) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), ms)
    return { signal: ctrl.signal, done: () => clearTimeout(timer) }
}

/**
 * Fetch wrapper dengan auto-retry saat rate limit / 503 / temporarily unavailable
 */
async function fetchSafe(url, options = {}, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        const { signal, done } = withTimeout(options.timeoutMs || DEFAULT_TIMEOUT_MS)
        try {
            const res = await fetch(url, {
                ...options,
                headers: { ...DEFAULT_HEADERS, ...options.headers },
                signal
            })

            const text = await res.text()
            let json = null
            try {
                json = JSON.parse(text)
            } catch {}

            const isTemporarilyUnavailable = res.status === 503 ||
                res.status === 429 ||
                json?.message?.includes("temporarily unavailable") ||
                text.includes("temporarily unavailable")

            if (isTemporarilyUnavailable && attempt < retries) {
                console.warn(`[emailnator] Server sibuk (${res.status}), retry ke-${attempt}...`)
                await new Promise(r => setTimeout(r, attempt * 1200))
                continue
            }

            if (!res.ok) {
                const err = new Error(
                    `HTTP ${res.status} ${res.statusText}${json ? `: ${JSON.stringify(json)}` : `: ${text.slice(0, 300)}`}`
                )
                err.status = res.status
                err.body = json ?? text
                throw err
            }

            if (json === null) {
                const err = new Error(`Non-JSON response: ${text.slice(0, 300)}`)
                err.status = res.status
                err.body = text
                throw err
            }

            return json
        } finally {
            done()
        }
    }
}

function resolveIds(input) {
    if (input === undefined || input === null) return Object.values(EMAIL_TYPES)
    if (typeof input === "number") return [input]
    if (typeof input === "string") {
        const id = EMAIL_TYPES[input] ?? Number(input)
        return Number.isFinite(id) ? [id] : Object.values(EMAIL_TYPES)
    }
    if (Array.isArray(input)) {
        const ids = []
        for (const item of input) {
            if (typeof item === "number") {
                ids.push(item)
            } else if (typeof item === "string") {
                const id = EMAIL_TYPES[item] ?? Number(item)
                if (Number.isFinite(id)) ids.push(id)
            }
        }
        return ids.length ? ids : Object.values(EMAIL_TYPES)
    }
    if (typeof input === "object") {
        return resolveIds(Object.keys(input).filter((key) => input[key]))
    }
    throw new TypeError("ids must be a number, string, array, or type map")
}

function normalizeAddress(raw, fallbackIds) {
    if (!raw?.email) return null
    const typeId = Number(raw.email_type_id ?? fallbackIds[0] ?? 0)
    return {
        email: String(raw.email).trim(),
        type: raw.type ?? null,
        typeId: Number.isFinite(typeId) ? typeId : null,
        typeName: TYPE_BY_ID[typeId] ?? null,
        inboxUrl: `${HOST}/inbox#${String(raw.email).trim()}`
    }
}

function normalizeMessage(raw) {
    return {
        id: raw?.id ?? raw?.message_id ?? null,
        from: raw?.from ?? raw?.sender ?? null,
        subject: raw?.subject ?? null,
        preview: raw?.preview ?? raw?.snippet ?? null,
        body: raw?.content ?? raw?.body ?? raw?.html ?? raw?.message ?? null,
        receivedAt: raw?.received_at ?? raw?.date ?? raw?.created_at ?? null,
        hasAttachments: Boolean(raw?.has_attachments),
        attachments: Array.isArray(raw?.attachments) ? raw.attachments : [],
        raw
    }
}

/**
 * Generate disposable email dengan fallback otomatis jika salah satu tipe sibuk
 * @param {Array<number|string>|number|string|null} [ids=null]
 * @param {object} [options]
 */
export async function generateEmail(ids = null, options = {}) {
    let typeIds = resolveIds(ids)

    try {
        const json = await fetchSafe(API.generate, {
            method: "POST",
            body: JSON.stringify({ ids: typeIds }),
            timeoutMs: options.timeoutMs
        }, 3)

        if (json.status !== "success") {
            throw new Error(json.message ?? json.error ?? "generate-email failed")
        }
        return normalizeAddress(json, typeIds)
    } catch (err) {
        // Fallback coba tipe domain kustom jika pool Gmail sedang padat
        if (err.message?.includes("temporarily unavailable") || err.status === 503) {
            console.warn("[emailnator] Fallback generate tipe [1] (domain kustom)...")
            const fallbackJson = await fetchSafe(API.generate, {
                method: "POST",
                body: JSON.stringify({ ids: [1] }),
                timeoutMs: options.timeoutMs
            }, 2)

            if (fallbackJson.status === "success") {
                return normalizeAddress(fallbackJson, [1])
            }
        }
        throw err
    }
}

/**
 * Generate email secara massal (bulk)
 */
export async function generateBulk(count = 10, ids = null, options = {}) {
    const total = Number(count)
    if (!Number.isFinite(total) || total <= 0) {
        throw new TypeError("count must be a positive number")
    }
    const typeIds = resolveIds(ids)
    const maxAttempts = Math.max(1, Number(options.maxAttempts) || 5)
    const seen = new Map()
    const errors = []
    let attempts = 0

    while (seen.size < Math.floor(total) && attempts < maxAttempts) {
        attempts += 1
        const batch = Math.min(Math.floor(total) - seen.size, BULK_CHUNK)
        try {
            const json = await fetchSafe(API.bulk, {
                method: "POST",
                body: JSON.stringify({ ids: typeIds, count: batch }),
                timeoutMs: options.timeoutMs ?? 60000
            }, 3)

            if (json.status !== "success") {
                errors.push(json.message ?? json.error ?? "generate-bulk-email failed")
            } else {
                for (const item of json.results ?? []) {
                    const address = normalizeAddress(item, typeIds)
                    if (address && !seen.has(address.email)) seen.set(address.email, address)
                }
                if (!(json.results ?? []).length) {
                    errors.push("empty batch")
                }
            }
        } catch (error) {
            errors.push(error.message)
        }

        if (options.delayMs) {
            await new Promise((resolve) => setTimeout(resolve, options.delayMs))
        }
    }

    const addresses = [...seen.values()]
    return {
        requested: Math.floor(total),
        received: addresses.length,
        unique: addresses.length,
        complete: addresses.length >= Math.floor(total),
        attempts,
        errors,
        addresses
    }
}

/**
 * Cek kotak masuk / inbox pesan email
 * @param {string} email
 * @param {object} [options]
 */
export async function getInbox(email, options = {}) {
    if (!email || typeof email !== "string") {
        throw new TypeError("email must be a non-empty string")
    }

    const json = await fetchSafe(API.inbox, {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), limit: options.limit ?? 20 }),
        timeoutMs: options.timeoutMs
    }, 3)

    if (json.status !== "success") {
        throw new Error(json.message ?? json.error ?? "message-list failed")
    }
    const messages = (json.messages ?? []).map(normalizeMessage)
    return {
        email: email.trim(),
        messages,
        count: Number(json.message_count ?? messages.length) || 0,
        limit: Number(json.message_limit ?? MESSAGE_LIMIT) || MESSAGE_LIMIT,
        upgradeAvailable: Boolean(json.upgrade_available),
        full: Number(json.message_count ?? 0) >= Number(json.message_limit ?? MESSAGE_LIMIT)
    }
}

/**
 * Baca isi pesan spesifik berdasarkan messageId
 * @param {string} messageId
 * @param {object} [options]
 */
export async function getMessage(messageId, options = {}) {
    if (!messageId || typeof messageId !== "string") {
        throw new TypeError("messageId must be a non-empty string")
    }

    const json = await fetchSafe(`${API.message}/${encodeURIComponent(messageId)}`, {
        timeoutMs: options.timeoutMs
    }, 3)

    return normalizeMessage(json)
}

/**
 * Hapus pesan dari kotak masuk
 * @param {string} messageId
 * @param {object} [options]
 */
export async function deleteMessage(messageId, options = {}) {
    if (!messageId || typeof messageId !== "string") {
        throw new TypeError("messageId must be a non-empty string")
    }

    const json = await fetchSafe(`${API.deleteMessage}/${encodeURIComponent(messageId)}`, {
        method: "DELETE",
        timeoutMs: options.timeoutMs
    }, 2)

    return {
        ok: json.status === "success",
        message: json.message ?? null,
        raw: json
    }
}

export async function createInbox(ids = null, options = {}) {
    return await generateEmail(ids, options)
}

export default {
    HOST,
    API,
    EMAIL_TYPES,
    TYPE_BY_ID,
    generateEmail,
    generateBulk,
    getInbox,
    getMessage,
    deleteMessage,
    createInbox
}
