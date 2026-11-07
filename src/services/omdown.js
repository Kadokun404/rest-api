import fs from "node:fs"
import { Readable } from "node:stream"
import { finished } from "node:stream/promises"

const BASE_URL = "https://www.omdown.site"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

export const SUPPORTED_PLATFORMS = [
    [/(?:^|\.)shortdrama\.tiktok\.com$/i, "PineDrama"],
    [/(?:^|\.)tiktok\.com$/i, "TikTok"],
    [/(?:^|\.)(?:douyin\.com|iesdouyin\.com)$/i, "Douyin"],
    [/(?:^|\.)(?:kuaishou\.com|kwai\.com)$/i, "Kuaishou"],
    [/(?:^|\.)(?:snackvideo\.com|sck\.io)$/i, "SnackVideo"],
    [/(?:^|\.)(?:xiaohongshu\.com|rednote\.com|xhslink\.com)$/i, "RedNote"],
    [/(?:^|\.)(?:youtu\.be|youtube\.com)$/i, "YouTube"],
    [/(?:^|\.)(?:instagram\.com|instagr\.am|ig\.me)$/i, "Instagram"],
    [/(?:^|\.)(?:twitter\.com|x\.com|t\.co)$/i, "X"],
    [/(?:^|\.)(?:facebook\.com|fb\.watch|fb\.com)$/i, "Facebook"],
    [/(?:^|\.)threads\.(?:net|com)$/i, "Threads"],
    [/(?:^|\.)(?:bsky\.app|bsky\.social)$/i, "Bluesky"],
    [/(?:^|\.)(?:reddit\.com|redd\.it)$/i, "Reddit"],
    [/(?:^|\.)capcut\.com$/i, "CapCut"],
    [/(?:^|\.)snapchat\.com$/i, "Snapchat"],
    [/(?:^|\.)twitch\.tv$/i, "Twitch"],
    [/(?:^|\.)(?:bilibili\.com|bilibili\.tv|b23\.tv|bili\.im)$/i, "Bilibili"],
    [/(?:^|\.)(?:dailymotion\.com|dai\.ly)$/i, "Dailymotion"],
    [/(?:^|\.)lahelu\.com$/i, "Lahelu"],
    [/(?:^|\.)(?:spotify\.com|spoti\.fi)$/i, "Spotify"],
    [/(?:^|\.)soundcloud\.com$/i, "SoundCloud"],
    [/(?:^|\.)(?:music\.apple\.com|apple\.co)$/i, "Apple Music"],
    [/(?:^|\.)(?:pinterest\.(?:com|co\.[a-z]{2}|[a-z]{2,3})|pin\.it)$/i, "Pinterest"],
    [/(?:^|\.)deviantart\.com$/i, "DeviantArt"],
    [/(?:^|\.)pixiv\.net$/i, "Pixiv"],
    [/(?:^|\.)mangadex\.org$/i, "MangaDex"],
    [/(?:^|\.)imgur\.com$/i, "Imgur"]
]

/**
 * Deteksi platform berdasarkan URL input
 * @param {string} url
 * @returns {string|null} Nama platform (misal "TikTok", "YouTube", "PineDrama")
 */
export function detectPlatform(url) {
    if (!url || typeof url !== "string") return null
    try {
        const raw = url.trim()
        const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
        const parsed = new URL(withProto)
        const match = SUPPORTED_PLATFORMS.find(([regex]) => regex.test(parsed.hostname))
        return match ? match[1] : null
    } catch {
        return null
    }
}

let cachedSession = {
    cookie: null,
    expiresAt: 0
}

/**
 * Ambil cookie session aktif dari omdown.site (om_sec)
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<string>}
 */
export async function getSession(forceRefresh = false) {
    const now = Date.now()
    if (!forceRefresh && cachedSession.cookie && cachedSession.expiresAt > now) {
        return cachedSession.cookie
    }

    const res = await fetch(`${BASE_URL}/en`, {
        headers: {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9"
        },
        signal: AbortSignal.timeout(15000)
    })

    const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : []
    const cookies = setCookies.map(c => c.split(";")[0].trim()).join("; ")

    if (!cookies) {
        throw new Error("Gagal menginisialisasi session omdown (tidak menerima cookie).")
    }

    cachedSession = {
        cookie: cookies,
        expiresAt: now + 4 * 60 * 60 * 1000 // Cache 4 jam
    }

    return cookies
}

/**
 * Ekstrak metadata & link unduhan media dari omdown.site
 * @param {string} targetUrl URL media (TikTok, YouTube, IG, Spotify, dll)
 * @param {object} [options]
 * @param {string} [options.platform] Override nama platform jika perlu
 * @param {string} [options.locale="id"] Bahasa respons ("id" | "en")
 * @param {boolean} [options.forceRefresh=false]
 */
export async function resolve(targetUrl, { platform, locale = "id", forceRefresh = false } = {}) {
    const cleanUrl = String(targetUrl || "").trim()
    if (!cleanUrl) throw new Error("URL tidak boleh kosong")

    const detected = platform || detectPlatform(cleanUrl)
    if (!detected) {
        throw new Error("Platform URL tidak didukung oleh omdown.")
    }

    let cookie = await getSession(forceRefresh)

    async function sendRequest(sessCookie) {
        return await fetch(`${BASE_URL}/api/media/resolve`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": USER_AGENT,
                "Accept": "*/*",
                "Accept-Language": "en-US,en;q=0.9",
                "Origin": BASE_URL,
                "Referer": `${BASE_URL}/en`,
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                "Cookie": sessCookie
            },
            body: JSON.stringify({
                url: cleanUrl,
                platform: detected,
                locale
            }),
            signal: AbortSignal.timeout(30000)
        })
    }

    let res = await sendRequest(cookie)

    // Jika ditolak karena session expired / invocation blocked, coba refresh session sekali
    if (res.status === 401 || res.status === 403) {
        cookie = await getSession(true)
        res = await sendRequest(cookie)
    }

    const data = await res.json().catch(() => ({}))

    if (!data?.success) {
        // Coba sekali lagi dengan session baru jika error access denied
        if (data?.error?.includes("Access denied") && !forceRefresh) {
            cookie = await getSession(true)
            const retryRes = await sendRequest(cookie)
            const retryData = await retryRes.json().catch(() => ({}))
            if (retryData?.success) {
                return formatResolveResult(retryData.data, detected)
            }
        }
        throw new Error(data?.error || `Gagal mengekstrak media (HTTP ${res.status})`)
    }

    return formatResolveResult(data.data, detected)
}

/**
 * Format hasil data dari API omdown
 */
function formatResolveResult(data, detectedPlatform) {
    const formats = Array.isArray(data.formats) ? data.formats : []

    const cleanFormats = formats.map(f => {
        let streamUrl = f.downloadUrl || ""
        if (streamUrl && streamUrl.startsWith("/")) {
            const glue = streamUrl.includes("?") ? "&" : "?"
            streamUrl = `${BASE_URL}${streamUrl}${glue}download=1`
        }

        return {
            id: f.id,
            label: f.label,
            description: f.description || "",
            kind: f.kind || "video",
            quality: f.quality || "",
            ext: f.ext || (f.kind === "audio" ? "mp3" : "mp4"),
            hasWatermark: Boolean(f.hasWatermark),
            downloadUrl: streamUrl
        }
    })

    let thumb = data.thumbnailUrl || null
    if (thumb && thumb.startsWith("/")) {
        thumb = `${BASE_URL}${thumb}`
    }

    let preview = data.previewUrl || null
    if (preview && preview.startsWith("/")) {
        preview = `${BASE_URL}${preview}`
    }

    return {
        platform: data.platform || detectedPlatform,
        title: data.title || "Media",
        duration: data.durationLabel || null,
        thumbnailUrl: thumb,
        previewUrl: preview,
        previewKind: data.previewKind || "video",
        author: data.author || "",
        rawUrl: data.rawUrl || "",
        isCarousel: Boolean(data.isCarousel),
        stats: data.stats || {},
        music: data.music || null,
        formats: cleanFormats
    }
}

/**
 * Unduh media stream langsung ke file lokal
 * @param {string} downloadUrl URL stream atau download
 * @param {string} outputPath Path tujuan file
 * @returns {Promise<string>}
 */
export async function downloadMedia(downloadUrl, outputPath) {
    if (!downloadUrl) throw new Error("downloadUrl tidak valid")

    const cookie = await getSession()
    const targetUrl = downloadUrl.startsWith("http") ? downloadUrl : `${BASE_URL}${downloadUrl}`

    const res = await fetch(targetUrl, {
        headers: {
            "User-Agent": USER_AGENT,
            "Referer": `${BASE_URL}/en`,
            "Cookie": cookie
        },
        signal: AbortSignal.timeout(120000)
    })

    if (!res.ok) {
        throw new Error(`Gagal mengunduh file media (HTTP ${res.status})`)
    }

    const fileStream = fs.createWriteStream(outputPath)
    await finished(Readable.fromWeb(res.body).pipe(fileStream))
    return outputPath
}

/**
 * Fetch buffer media/thumbnail dari omdown
 * @param {string} url
 * @returns {Promise<Buffer|null>}
 */
export async function fetchBuffer(url) {
    if (!url) return null
    try {
        const cookie = await getSession()
        const targetUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`
        const res = await fetch(targetUrl, {
            headers: {
                "User-Agent": USER_AGENT,
                "Referer": `${BASE_URL}/en`,
                "Cookie": cookie
            },
            signal: AbortSignal.timeout(20000)
        })
        if (res.ok) {
            return Buffer.from(await res.arrayBuffer())
        }
    } catch {}
    return null
}

export default {
    BASE_URL,
    SUPPORTED_PLATFORMS,
    detectPlatform,
    getSession,
    resolve,
    downloadMedia,
    fetchBuffer
}
