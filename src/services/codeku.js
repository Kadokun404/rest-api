import fs from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
const allPaths = { codekuAuth: "/tmp/codeku-auth.json" };

const BASE_URL = "https://codeku.theresav.eu"
const AUTH_FILE = allPaths?.codekuAuth || path.resolve("data/codeku-auth.json")

const DEFAULT_CREDENTIALS = {
    email: "kadokun_6908@gmail.com",
    password: "Password123!@#",
    name: "Arashii"
}

const SUPPORTED_LANGUAGES = new Set(["html", "javascript", "other", "python", "typescript"])

export function normalizeLanguage(lang = "") {
    const l = String(lang).toLowerCase().trim().replace(/^\./, "")
    if (l === "js" || l === "javascript" || l === "mjs" || l === "cjs") return "javascript"
    if (l === "ts" || l === "typescript") return "typescript"
    if (l === "py" || l === "python") return "python"
    if (l === "html" || l === "htm") return "html"
    if (SUPPORTED_LANGUAGES.has(l)) return l
    return "other"
}

export function extractCodekuId(input = "") {
    if (!input) return null
    const raw = String(input).trim()
    const urlMatch = raw.match(/codeku\.theresav\.eu\/(?:raw\/)?([a-zA-Z0-9_\-]+)/i)
    if (urlMatch) return urlMatch[1]
    if (/^[a-zA-Z0-9_\-]{4,20}$/.test(raw) && !raw.includes(".")) return raw
    return null
}

async function readStoredAuth() {
    try {
        if (!existsSync(AUTH_FILE)) return null
        const content = await fs.readFile(AUTH_FILE, "utf-8")
        return JSON.parse(content)
    } catch {
        return null
    }
}

async function writeStoredAuth(data) {
    try {
        await fs.mkdir(path.dirname(AUTH_FILE), { recursive: true })
        await fs.writeFile(AUTH_FILE, JSON.stringify(data, null, 2))
    } catch (e) {
        console.error("[codeku] failed to save auth file:", e)
    }
}

/**
 * Mendapatkan cookie session aktif, login ulang jika belum ada / expired
 */
export async function getCodekuSession() {
    let auth = await readStoredAuth()

    // Cek apakah session masih aktif
    if (auth?.cookie && auth?.token) {
        try {
            const check = await fetch(`${BASE_URL}/api/auth/get-session`, {
                headers: {
                    Cookie: auth.cookie,
                    Origin: BASE_URL
                },
                signal: AbortSignal.timeout(10000)
            })
            if (check.ok) {
                const sessionData = await check.json().catch(() => null)
                if (sessionData?.user) {
                    return auth
                }
            }
        } catch {}
    }

    // Login ulang via Better Auth
    const creds = auth?.credentials || DEFAULT_CREDENTIALS
    const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Origin: BASE_URL
        },
        body: JSON.stringify({
            email: creds.email,
            password: creds.password
        }),
        signal: AbortSignal.timeout(15000)
    })

    if (!res.ok) {
        const errText = await res.text().catch(() => "")
        throw new Error(`Gagal login Codeku (${res.status}): ${errText || "Invalid credentials"}`)
    }

    const setCookie = res.headers.get("set-cookie")
    const body = await res.json()
    const sessionTokenMatch = setCookie?.match(/__Secure-better-auth\.session_token=([^;]+)/)
    const token = body.token || sessionTokenMatch?.[1] || ""

    const newAuth = {
        cookie: setCookie ? setCookie.split(";")[0] : `__Secure-better-auth.session_token=${token}`,
        token,
        user: body.user,
        credentials: creds,
        updatedAt: Date.now()
    }

    await writeStoredAuth(newAuth)
    return newAuth
}

/**
 * Upload code snippet ke Codeku
 * @param {object} params
 * @param {string} params.title
 * @param {string} params.code
 * @param {string} [params.language]
 * @param {string} [params.description]
 * @param {string[]} [params.tags]
 * @param {boolean} [params.isLocked]
 * @param {string} [params.password]
 */
export async function createSnippet({
    title = "Untitled Snippet",
    code,
    language = "javascript",
    description = "",
    tags = [],
    isLocked = false,
    password = ""
}) {
    if (!code || typeof code !== "string" || !code.trim()) {
        throw new Error("Code tidak boleh kosong")
    }

    const auth = await getCodekuSession()
    const normalizedLang = normalizeLanguage(language)

    const payload = {
        title: title.trim() || "Untitled Snippet",
        code: code.trim(),
        language: normalizedLang,
        description: description.trim(),
        tags: Array.isArray(tags) && tags.length ? tags.map(t => String(t).trim().toLowerCase()) : ["javascript", "scraper"],
        isLocked: Boolean(isLocked),
        password: password || ""
    }

    const res = await fetch(`${BASE_URL}/api/snippets`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Origin: BASE_URL,
            Cookie: auth.cookie,
            Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000)
    })

    if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || `HTTP ${res.status}`)
    }

    const data = await res.json()
    const snippet = data.snippet || data
    const id = snippet.id

    return {
        ok: true,
        id,
        url: `${BASE_URL}/${id}`,
        rawUrl: `${BASE_URL}/raw/${id}`,
        title: snippet.title || title,
        language: snippet.language || normalizedLang,
        snippet
    }
}

/**
 * Ambil detail snippet Codeku
 * @param {string} id
 */
export async function getSnippet(id) {
    if (!id) throw new Error("ID snippet tidak valid")
    const res = await fetch(`${BASE_URL}/api/snippets/${encodeURIComponent(id)}`, {
        signal: AbortSignal.timeout(20000)
    })
    if (!res.ok) throw new Error(`Snippet tidak ditemukan (HTTP ${res.status})`)
    return await res.json()
}

/**
 * Ambil kode mentah / raw dari Codeku
 * @param {string} id
 */
export async function getRawSnippet(id) {
    if (!id) throw new Error("ID snippet tidak valid")
    const res = await fetch(`${BASE_URL}/raw/${encodeURIComponent(id)}`, {
        signal: AbortSignal.timeout(20000)
    })
    if (!res.ok) throw new Error(`Raw snippet tidak ditemukan (HTTP ${res.status})`)
    return await res.text()
}

export default {
    BASE_URL,
    getCodekuSession,
    createSnippet,
    getSnippet,
    getRawSnippet,
    extractCodekuId,
    normalizeLanguage
}
