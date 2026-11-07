/**
 * MioHentai Scraper & Video Downloader Service
 * Scraper modern untuk MioHentai (https://miohentai.com/)
 * 
 * Features:
 * - Search video hentai anime HD via official backend search AJAX
 * - Browse latest video release dengan pagination
 * - Detail extractor: direct MP4 stream, cover, thumbnail, tags, studio, duration, views & rating
 * - Buffer fetcher untuk preview media di WhatsApp
 * 
 * How to use:
 * ```javascript
 * import { searchMiohentai, getLatestMiohentai, getMiohentaiDetail } from "#helper/services/miohentai.js"
 * 
 * // 1. Cari video
 * const searchResults = await searchMiohentai("adam")
 * console.log(searchResults)
 * 
 * // 2. Video rilis terbaru
 * const latest = await getLatestMiohentai(1)
 * console.log(latest)
 * 
 * // 3. Ambil detail & link streaming direct MP4
 * const detail = await getMiohentaiDetail("https://miohentai.com/modaete-yo-adam-kun-episode-1/")
 * console.log(detail.videoUrl)
 * ```
 * 
 * Author: Arashi & Kadokun
 * Noted: Direct video MP4 link didukung oleh cdn.miohentai.com tanpa bypass CAPTCHA.
 */

import { load } from "cheerio"

const BASE_URL = "https://miohentai.com"
const DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": `${BASE_URL}/`,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
}

/**
 * Normalisasi URL atau slug MioHentai
 * @param {string} input 
 * @returns {string}
 */
export function normalizeMiohentaiUrl(input) {
    if (!input || typeof input !== "string") return ""
    const clean = input.trim()
    if (/^https?:\/\//i.test(clean)) return clean
    const slug = clean.replace(/^\/+|\/+$/g, "")
    return `${BASE_URL}/${slug}/`
}

/**
 * Ekstrak slug dari URL
 * @param {string} url 
 * @returns {string}
 */
export function extractSlug(url) {
    if (!url || typeof url !== "string") return ""
    try {
        const parsed = new URL(url.startsWith("http") ? url : `${BASE_URL}/${url.replace(/^\/+/, "")}`)
        return parsed.pathname.replace(/^\/+|\/+$/g, "")
    } catch {
        return url.replace(/https?:\/\/[^/]+\//, "").replace(/^\/+|\/+$/g, "")
    }
}

/**
 * Ambil buffer file dari URL (image / preview)
 * @param {string} url 
 * @param {RequestInit} [options] 
 * @returns {Promise<Buffer|null>}
 */
export async function fetchBuffer(url, options = {}) {
    if (!url || typeof url !== "string") return null
    try {
        const res = await fetch(url, {
            headers: {
                ...DEFAULT_HEADERS,
                ...(options.headers || {})
            },
            ...options
        })
        if (!res.ok) return null
        const arrayBuf = await res.arrayBuffer()
        return Buffer.from(arrayBuf)
    } catch (e) {
        console.warn(`[miohentai] Gagal fetch buffer ${url}:`, e.message)
        return null
    }
}

/**
 * Cari anime video di MioHentai
 * @param {string} query kata kunci pencarian
 * @param {object} [options]
 * @param {number} [options.page=1] nomor halaman
 * @param {"relevance"|"recent"|"views"|"rating"} [options.sort="relevance"] sorting order
 * @returns {Promise<Array<{ id: number, title: string, views: string, rating: number, url: string, thumb: string, slug: string }>>}
 */
export async function searchMiohentai(query, { page = 1, sort = "relevance" } = {}) {
    const q = String(query || "").trim()
    const endpoint = `${BASE_URL}/wp-admin/admin-ajax.php?action=se-search&mykeyword=${encodeURIComponent(q)}&sort=${encodeURIComponent(sort)}&paged=${page}`
    
    const res = await fetch(endpoint, {
        headers: {
            ...DEFAULT_HEADERS,
            "Referer": `${BASE_URL}/search/`,
            "X-Requested-With": "XMLHttpRequest"
        }
    })

    if (!res.ok) {
        throw new Error(`Gagal menghubungi server MioHentai (HTTP ${res.status})`)
    }

    const data = await res.json().catch(() => ({}))
    const posts = Array.isArray(data.posts) ? data.posts : []

    return posts.map(p => ({
        id: p.ID,
        title: String(p.title || "").replace(/&#8211;/g, "-").replace(/&amp;/g, "&").trim(),
        views: String(p.views || "0"),
        rating: Number(p.rate) || 0,
        url: p.url || `${BASE_URL}/?p=${p.ID}`,
        thumb: p.image || null,
        slug: extractSlug(p.url || "")
    }))
}

/**
 * Ambil daftar video terbaru (Latest Releases) dari MioHentai
 * @param {number} [page=1] 
 * @returns {Promise<Array<{ id: number, title: string, views: string, rating: number, url: string, thumb: string, slug: string }>>}
 */
export async function getLatestMiohentai(page = 1) {
    return await searchMiohentai("", { page, sort: "recent" })
}

/**
 * Ambil detail video & direct stream MP4 link dari MioHentai
 * @param {string} urlOrSlug URL halaman video atau slug
 * @returns {Promise<{
 *   id?: number,
 *   title: string,
 *   url: string,
 *   videoUrl: string|null,
 *   thumbnail: string|null,
 *   poster: string|null,
 *   description: string,
 *   studio: string|null,
 *   tags: string[],
 *   duration: string|null,
 *   views: number|string|null,
 *   rating: number|null,
 *   nextEpisode: { id: number, title: string, url: string, thumbnail: string }|null
 * }>}
 */
export async function getMiohentaiDetail(urlOrSlug) {
    const targetUrl = normalizeMiohentaiUrl(urlOrSlug)
    if (!targetUrl) throw new Error("URL atau slug MioHentai tidak valid")

    const res = await fetch(targetUrl, {
        headers: {
            ...DEFAULT_HEADERS,
            "Referer": `${BASE_URL}/`
        }
    })

    if (!res.ok) {
        throw new Error(`Gagal membuka halaman video MioHentai (HTTP ${res.status})`)
    }

    const html = await res.text()
    const $ = load(html)

    // 1. Ekstrak boot configuration player videojs
    let videoBoot = null
    $("script").each((_, el) => {
        const text = $(el).text()
        if (text.includes("window.videoPlayerBootConfig =")) {
            const m = text.match(/window\.videoPlayerBootConfig\s*=\s*(\{[\s\S]*?\});/)
            if (m) {
                try {
                    videoBoot = JSON.parse(m[1])
                } catch {}
            }
        }
    })

    // 2. Ekstrak data JSON-LD (Schema.org VideoObject & Article)
    let videoObject = null
    let articleObject = null
    $("script[type='application/ld+json']").each((_, el) => {
        try {
            const data = JSON.parse($(el).text())
            if (data["@type"] === "VideoObject") videoObject = data
            if (Array.isArray(data["@graph"])) {
                for (const item of data["@graph"]) {
                    if (item["@type"] === "VideoObject") videoObject = item
                    if (item["@type"] === "Article") articleObject = item
                }
            }
        } catch {}
    })

    const title = (
        $("h1").first().text().trim() ||
        videoObject?.name ||
        $("title").text().replace(/\s*[-|]\s*MioHentai.*$/i, "").trim()
    ).replace(/&#8211;/g, "-").replace(/&amp;/g, "&")

    const videoUrl = videoBoot?.videoSrc || videoObject?.contentUrl || null
    const thumbnail = videoObject?.thumbnailUrl || $("meta[property='og:image']").attr("content") || null
    const poster = videoBoot?.posterUrl || null
    const description = (
        videoObject?.description ||
        $("meta[name='description']").attr("content") ||
        $("meta[property='og:description']").attr("content") ||
        ""
    ).replace(/&#8211;/g, "-").replace(/&amp;/g, "&").trim()

    const studio = $(".studio, a[href*='/studio/']").first().text().trim() || null

    // Kumpulkan tags
    const rawTags = articleObject?.keywords || []
    let tags = Array.isArray(rawTags) ? rawTags : String(rawTags).split(",").map(t => t.trim())
    if (!tags.length) {
        tags = $("a[href*='/tag/']").map((_, el) => $(el).text().trim().split("\n")[0]).get()
    }
    // Bersihkan duplikat & potong maksimal 10 tags
    tags = [...new Set(tags.map(t => t.trim()).filter(Boolean))].slice(0, 10)

    let duration = null
    if (videoObject?.duration) {
        duration = videoObject.duration.replace(/^PT/i, "").toLowerCase()
    }

    const views = videoObject?.interactionStatistic?.userInteractionCount || videoBoot?.postId || null
    const rating = videoObject?.aggregateRating?.ratingValue ? Number(videoObject.aggregateRating.ratingValue) : null

    const nextEpisode = videoBoot?.nextEpisode ? {
        id: videoBoot.nextEpisode.id,
        title: String(videoBoot.nextEpisode.title || "").replace(/&#8211;/g, "-").replace(/&amp;/g, "&").trim(),
        url: videoBoot.nextEpisode.url,
        thumbnail: videoBoot.nextEpisode.thumbnail || null
    } : null

    return {
        id: videoBoot?.postId || null,
        title,
        url: targetUrl,
        videoUrl,
        thumbnail,
        poster,
        description,
        studio,
        tags,
        duration,
        views,
        rating,
        nextEpisode
    }
}

export default {
    searchMiohentai,
    getLatestMiohentai,
    getMiohentaiDetail,
    fetchBuffer,
    normalizeMiohentaiUrl,
    extractSlug
}
