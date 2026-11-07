/**
 * Helper / Scrape: NekoPoi Search & Details (nekopoi.js)
 * Author : Arashii & Kadokun
 * Source : https://nekopoi.care
 * 
 * Menggunakan kombinasi WordPress REST API resmi untuk search/latest posts
 * dan parsing DOM Cheerio untuk streaming player embed & download mirrors.
 */

import * as cheerio from "cheerio"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import fs from "node:fs"
import { pipeline } from "node:stream/promises"
import { Readable } from "node:stream"
const config = { apikey: { theresav: process.env.THERESAV_API_KEY || "araqshi", rule34: { user_id: process.env.RULE34_USER_ID || "7010186", api_key: process.env.RULE34_API_KEY || "dbcb6813a47b997a07ceedbe4eaef3b0e38c0d0fdb5665642622e49af6b2239c9232945c552358cde2cd92bf377ed7b33cf1b784993aa121b2c45b9468bcde35" } } };

const execFileAsync = promisify(execFile)

const BASE_URL = "https://nekopoi.care"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

const HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "application/json, text/html, */*"
}

/**
 * Fetch buffer dari URL
 * @param {string} url 
 * @returns {Promise<Buffer|null>}
 */
export async function fetchBuffer(url) {
    if (!url) return null
    try {
        const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(15000) })
        if (!res.ok) return null
        return Buffer.from(await res.arrayBuffer())
    } catch {
        return null
    }
}

/**
 * Decode HTML entities sederhana
 * @param {string} str 
 * @returns {string}
 */
function cleanText(str = "") {
    return String(str || "")
        .replace(/&#8211;/g, "-")
        .replace(/&#8216;|&#8217;/g, "'")
        .replace(/&#8220;|&#8221;/g, '"')
        .replace(/&#038;/g, "&")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim()
}

/**
 * Ekstrak slug dari URL nekopoi atau input mentah
 * @param {string} input 
 * @returns {string}
 */
export function extractSlug(input = "") {
    const raw = String(input || "").trim()
    const match = raw.match(/nekopoi\.care\/([a-zA-Z0-9_\-]+)/i)
    if (match?.[1]) return match[1].replace(/^\/+|\/+$/g, "")
    return raw
        .replace(/^(?:view|dl|download):\s*/i, "")
        .replace(/^(?:view|dl|download)\s+/i, "")
        .replace(/^\/+|\/+$/g, "")
}

/**
 * Cari anime / video di NekoPoi berdasarkan kata kunci
 * @param {string} keyword
 * @param {number} [limit=10]
 * @returns {Promise<Array<{ id: number, slug: string, title: string, date: string, url: string, thumb: string|null }>>}
 */
export async function search(keyword, limit = 10) {
    const q = String(keyword || "").trim()
    if (!q) throw new TypeError("Kata kunci pencarian tidak boleh kosong")

    const endpoint = `${BASE_URL}/wp-json/wp/v2/posts?search=${encodeURIComponent(q)}&per_page=${Math.min(limit, 20)}&_embed=wp:featuredmedia`

    const res = await fetch(endpoint, {
        headers: HEADERS,
        signal: AbortSignal.timeout(15000)
    })

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Gagal menghubungi server NekoPoi`)
    }

    const posts = await res.json().catch(() => [])
    if (!Array.isArray(posts)) return []

    return posts.map((p) => {
        const thumb = p._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null
        return {
            id: p.id,
            slug: p.slug,
            title: cleanText(p.title?.rendered),
            date: p.date ? p.date.split("T")[0] : "-",
            url: p.link || `${BASE_URL}/${p.slug}/`,
            thumb
        }
    })
}

/**
 * Ambil daftar rilisan anime / video terbaru di NekoPoi
 * @param {number} [page=1]
 * @param {number} [limit=10]
 * @param {number|null} [categoryId=null] - 2: Hentai, 682: 2D Animation, 81: 3D, 4: JAV
 * @returns {Promise<Array<{ id: number, slug: string, title: string, date: string, url: string, thumb: string|null }>>}
 */
export async function getLatest(page = 1, limit = 10, categoryId = null) {
    let endpoint = `${BASE_URL}/wp-json/wp/v2/posts?page=${page}&per_page=${Math.min(limit, 20)}&_embed=wp:featuredmedia`
    if (categoryId) endpoint += `&categories=${categoryId}`

    const res = await fetch(endpoint, {
        headers: HEADERS,
        signal: AbortSignal.timeout(15000)
    })

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Gagal mengambil rilisan terbaru NekoPoi`)
    }

    const posts = await res.json().catch(() => [])
    if (!Array.isArray(posts)) return []

    return posts.map((p) => {
        const thumb = p._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null
        return {
            id: p.id,
            slug: p.slug,
            title: cleanText(p.title?.rendered),
            date: p.date ? p.date.split("T")[0] : "-",
            url: p.link || `${BASE_URL}/${p.slug}/`,
            thumb
        }
    })
}

/**
 * Ambil detail anime/video lengkap: thumbnail, player embeds, resolusi, dan download mirrors
 * @param {string} slugOrUrl 
 * @returns {Promise<{
 *   title: string,
 *   slug: string,
 *   url: string,
 *   thumbnail: string|null,
 *   series: string|null,
 *   originalTitle: string|null,
 *   producers: string|null,
 *   duration: string|null,
 *   genre: string|null,
 *   actress: string|null,
 *   streams: string[],
 *   downloads: Array<{ resolution: string, links: Array<{ name: string, url: string }> }>
 * }>}
 */
export async function getDetail(slugOrUrl) {
    const slug = extractSlug(slugOrUrl)
    if (!slug) throw new TypeError("Slug atau URL NekoPoi tidak boleh kosong")

    const pageUrl = slugOrUrl.startsWith("http") ? slugOrUrl : `${BASE_URL}/${slug}/`

    const res = await fetch(pageUrl, {
        headers: {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        },
        signal: AbortSignal.timeout(20000)
    })

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Konten NekoPoi tidak ditemukan`)
    }

    const html = await res.text()
    const $ = cheerio.load(html)

    const title = cleanText($("meta[property='og:title']").attr("content") || $("h1.entry-title").text() || $("title").text())
    const thumbnail = $("meta[property='og:image']").attr("content") || null
    const series = $(".nk-player-series-title").text().trim() || null

    const info = {}
    $("p").each((_, p) => {
        const text = $(p).text().trim()
        if (text.includes("Original Title")) info.originalTitle = text.split(":")[1]?.trim()
        if (text.includes("Producers")) info.producers = text.split(":")[1]?.trim()
        if (text.includes("Duration")) info.duration = text.split(":")[1]?.trim()
        if (text.includes("Genre")) info.genre = text.split(":")[1]?.trim()
        if (text.includes("Actress")) info.actress = text.split(":")[1]?.trim()
    })

    // Ekstrak streaming embed iframe
    const streams = []
    $(".nk-player-frame iframe").each((_, el) => {
        const src = $(el).attr("src")
        if (src && !streams.includes(src)) streams.push(src)
    })

    // Ekstrak download links per resolusi
    const downloads = []
    $(".nk-download-row").each((_, row) => {
        const name = $(row).find(".nk-download-name").text().trim()
        const links = []
        $(row).find(".nk-download-links a").each((_, a) => {
            const linkName = $(a).text().trim()
            const linkUrl = $(a).attr("href")
            if (linkUrl) {
                links.push({ name: linkName, url: linkUrl })
            }
        })
        if (name && links.length) {
            downloads.push({ resolution: name, links })
        }
    })

    return {
        title,
        slug,
        url: pageUrl,
        thumbnail,
        series,
        originalTitle: info.originalTitle || null,
        producers: info.producers || null,
        duration: info.duration || null,
        genre: info.genre || null,
        actress: info.actress || null,
        streams,
        downloads
    }
}

/**
 * Ekstrak m3u8 playlist dari streampoi.com embed
 * @param {string} embedUrl 
 * @param {string} [preferredQuality="360p"] Pilihan: 360p, 480p, 720p
 * @returns {Promise<string|null>}
 */
export async function getStreampoiM3u8(embedUrl, preferredQuality = "360p") {
    if (!embedUrl || !embedUrl.includes("streampoi.com")) return null

    const res = await fetch(embedUrl, {
        headers: {
            "User-Agent": USER_AGENT,
            "Referer": `${BASE_URL}/`
        },
        signal: AbortSignal.timeout(15000)
    })

    if (!res.ok) return null
    const html = await res.text()
    const match = html.match(/file:\s*["\x27](https:\/\/[^"\x27]+\.m3u8[^"\x27]*)["\x27]/)
    if (!match?.[1]) return null

    const masterM3u8 = match[1]

    try {
        const mRes = await fetch(masterM3u8, {
            headers: {
                "User-Agent": USER_AGENT,
                "Referer": "https://streampoi.com/",
                "Sec-Fetch-Mode": "cors"
            },
            signal: AbortSignal.timeout(15000)
        })

        if (!mRes.ok) return masterM3u8
        const mText = await mRes.text()
        const lines = mText.split("\n").map(l => l.trim()).filter(Boolean)
        const subStreams = lines.filter(l => l.startsWith("http") && l.includes(".m3u8"))

        if (subStreams.length > 0) {
            // Urutan subStreams di streampoi: [0] = 360p (_l), [1] = 480p (_n), [2] = 720p (_h)
            if (preferredQuality === "720p" && subStreams.length >= 3) {
                return subStreams[2]
            } else if (preferredQuality === "480p" && subStreams.length >= 2) {
                return subStreams[1]
            }
            return subStreams[0]
        }
    } catch (e) {
        console.warn("[nekopoi] Gagal parse master m3u8, fallback ke master:", e.message)
    }

    return masterM3u8
}

/**
 * Bypass ouo.io link via Theresav API
 * @param {string} ouoUrl 
 * @returns {Promise<string|null>}
 */
export async function bypassOuo(ouoUrl) {
    if (!ouoUrl || !/ouo\.(io|press)/i.test(ouoUrl)) return null
    try {
        const res = await fetch(
            `https://api.theresav.eu/api/bypass/ouo?url=${encodeURIComponent(ouoUrl)}`,
            {
                headers: { "x-apikey": config.apikey.theresav },
                signal: AbortSignal.timeout(40000)
            }
        )
        if (!res.ok) return null
        const data = await res.json()
        if (data.status && data.bypassed_url) {
            return data.bypassed_url
        }
    } catch (e) {
        console.warn("[nekopoi] Gagal bypass ouo link:", e.message)
    }
    return null
}

/**
 * Cari download source terbaik (streampoi m3u8 atau Pixeldrain direct download)
 * @param {object} detail 
 * @returns {Promise<{ type: "m3u8"|"direct", url: string, quality?: string, fileName?: string }|null>}
 */
export async function resolveDownloadSource(detail) {
    if (!detail) return null

    // 1. Cek stream streampoi.com
    const streampoiUrl = detail.streams?.find(s => s.includes("streampoi.com"))
    if (streampoiUrl) {
        const m3u8 = await getStreampoiM3u8(streampoiUrl, "480p")
        if (m3u8) {
            return {
                type: "m3u8",
                url: m3u8,
                quality: "480p"
            }
        }
    }

    // 2. Cek download mirrors (Pixeldrain / GoFile dll)
    if (Array.isArray(detail.downloads) && detail.downloads.length > 0) {
        // Prioritaskan resolusi 360p / 480p agar cepat & sesuai limit WA
        const sortedDownloads = [...detail.downloads].sort((a, b) => {
            const getResNum = str => {
                const m = (str || "").match(/(\d+)p/i)
                return m ? parseInt(m[1], 10) : 999
            }
            return getResNum(a.resolution) - getResNum(b.resolution)
        })

        for (const dlRow of sortedDownloads) {
            const pixeldrainLink = dlRow.links?.find(l => /pixeldrain/i.test(l.name))
            if (pixeldrainLink?.url) {
                const bypassed = await bypassOuo(pixeldrainLink.url)
                if (bypassed) {
                    const match = bypassed.match(/pixeldrain\.(?:com|net)\/(?:u|api\/file)\/(\w+)/i)
                    if (match?.[1]) {
                        const fileId = match[1]
                        return {
                            type: "direct",
                            url: `https://pixeldrain.com/api/file/${fileId}?download`,
                            fileId,
                            quality: dlRow.resolution.match(/\d+p/i)?.[0] || "360p",
                            source: "Pixeldrain"
                        }
                    }
                }
            }
        }

        // Coba link mirror lain jika Pixeldrain belum ketemu
        for (const dlRow of sortedDownloads) {
            for (const link of dlRow.links || []) {
                if (/pixeldrain/i.test(link.name)) continue
                const bypassed = await bypassOuo(link.url)
                if (bypassed && /pixeldrain\.(?:com|net)/i.test(bypassed)) {
                    const match = bypassed.match(/pixeldrain\.(?:com|net)\/(?:u|api\/file)\/(\w+)/i)
                    if (match?.[1]) {
                        return {
                            type: "direct",
                            url: `https://pixeldrain.com/api/file/${match[1]}?download`,
                            fileId: match[1],
                            quality: dlRow.resolution.match(/\d+p/i)?.[0] || "360p",
                            source: "Pixeldrain"
                        }
                    }
                }
            }
        }
    }

    return null
}

/**
 * Download file langsung via pipeline stream
 * @param {string} url 
 * @param {string} outputPath 
 * @param {object} [options]
 * @returns {Promise<string>}
 */
export async function downloadDirectFile(url, outputPath, options = {}) {
    const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(options.timeout || 300000)
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: Gagal mengunduh file`)
    const fileStream = fs.createWriteStream(outputPath)
    await pipeline(Readable.fromWeb(res.body), fileStream)
    return outputPath
}

/**
 * Download video MP4 dari m3u8 streampoi menggunakan ffmpeg remux
 * @param {string} m3u8Url 
 * @param {string} outputPath 
 * @param {object} [options]
 * @returns {Promise<string>}
 */
export async function downloadNekopoiStream(m3u8Url, outputPath, options = {}) {
    const headers = [
        "Referer: https://streampoi.com/",
        `User-Agent: ${USER_AGENT}`,
        "Sec-Fetch-Mode: cors",
        "Accept: */*",
        "Accept-Language: *"
    ].join("\r\n") + "\r\n"

    const args = [
        "-y",
        "-headers", headers,
        "-i", m3u8Url,
        ...(options.duration ? ["-t", String(options.duration)] : []),
        "-c", "copy",
        "-bsf:a", "aac_adtstoasc",
        outputPath
    ]

    await execFileAsync("ffmpeg", args, { timeout: options.timeout || 300000 })
    return outputPath
}

export default {
    BASE_URL,
    search,
    getLatest,
    getDetail,
    extractSlug,
    getStreampoiM3u8,
    bypassOuo,
    resolveDownloadSource,
    downloadDirectFile,
    downloadNekopoiStream,
    fetchBuffer
}
