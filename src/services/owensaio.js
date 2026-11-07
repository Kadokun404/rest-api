/**
 * Helper / Service: Owens AIO Downloader (owensaio.js)
 * Author: Arashii & Kadokun
 * 
 * Scraper resmi endpoint backend Owens AIO (https://owens.my.id/aio)
 * Mendukung ekstraksi video/audio tanpa watermark untuk TikTok, YouTube, Instagram, X (Twitter), Facebook, dll.
 */

const BASE_URL = "https://owens.my.id/aio"
const API_URL = `${BASE_URL}/api.php`
const PROXY_KEY = "aiokey151"

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

/**
 * Format detik ke format mm:ss atau hh:mm:ss
 * @param {number|string} sec 
 * @returns {string}
 */
export function formatDuration(sec) {
    const s = Math.floor(Number(sec) || 0)
    if (s <= 0) return "-"
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const rem = s % 60
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`
    }
    return `${m.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`
}

/**
 * Buat link download melalui server proxy Owens (jika direct link terhambat CORS/Hotlink)
 * @param {string} mediaUrl - URL file media asli
 * @param {string} filename - Nama file yang diinginkan
 * @returns {string}
 */
export function getProxyDownloadUrl(mediaUrl, filename = "download.mp4") {
    if (!mediaUrl) return ""
    return `${API_URL}?dl=1&key=${encodeURIComponent(PROXY_KEY)}&url=${encodeURIComponent(mediaUrl)}&name=${encodeURIComponent(filename)}`
}

/**
 * Unduh dan ekstrak metadata media dari berbagai platform via Owens AIO
 * @param {string} url - Link postingan (TikTok, YouTube, IG, dll)
 * @returns {Promise<{
 *   success: boolean,
 *   title: string,
 *   source: string,
 *   thumbnail: string,
 *   duration: number,
 *   durationFormatted: string,
 *   video: string,
 *   audio: string,
 *   medias: Array<{ type: "video"|"audio", quality: string, ext: string, size: number|null, url: string }>
 * }>}
 */
export async function downloadAio(url) {
    const targetUrl = String(url || "").trim()
    if (!targetUrl) {
        throw new TypeError("URL media tidak boleh kosong")
    }

    const endpoint = `${API_URL}?url=${encodeURIComponent(targetUrl)}`

    const res = await fetch(endpoint, {
        method: "GET",
        headers: {
            "User-Agent": USER_AGENT,
            "X-Requested-With": "fetch",
            "Accept": "application/json",
            "Referer": `${BASE_URL}/`
        },
        signal: AbortSignal.timeout(30000)
    })

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Gagal menghubungi server Owens AIO`)
    }

    const json = await res.json().catch(() => null)
    if (!json) {
        throw new Error("Server Owens AIO mengembalikan respon bukan JSON")
    }

    if (!json.success || !json.data) {
        throw new Error(json.error || "Media tidak ditemukan atau link belum didukung.")
    }

    const data = json.data

    return {
        success: true,
        title: data.title || "Untitled Media",
        source: data.source || "Unknown",
        thumbnail: data.thumbnail || null,
        duration: data.duration || 0,
        durationFormatted: formatDuration(data.duration),
        video: data.video || null,
        audio: data.audio || null,
        medias: Array.isArray(data.medias) ? data.medias : []
    }
}
