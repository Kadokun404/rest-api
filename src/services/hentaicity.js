/**
 * Helper / Scrape: HentaiCity Video & Gallery Search & Scraper (hentaicity.js)
 * Author: Arashi & Kadokun
 * 
 * Scraper untuk https://www.hentaicity.com
 * Fitur:
 * - Search Video: daftar video, thumbnail, durasi, uploader, views, rating
 * - Search Gallery (Pics): daftar album gambar, jumlah foto, cover
 * - Get Video Detail: direct MP4 (berbagai resolusi: default, mobile, 480p, 720p, 1080p), m3u8 playlist, embed URL, tags, sinopsis
 * - Get Gallery Detail: list gambar full resolusi dari CDN
 */

import axios from "axios"
import * as cheerio from "cheerio"

const BASE_URL = "https://www.hentaicity.com"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const http = axios.create({
    headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,id;q=0.8"
    },
    timeout: 20000
})

/**
 * Ekstrak slug atau ID dari URL hentaicity
 * @param {string} input 
 * @returns {string}
 */
export function extractSlug(input) {
    let str = String(input || "").trim()
    str = str.replace(/\.html$/i, "")
    const match = str.match(/(?:video|gallery)\/([^/?#]+)/i)
    if (match?.[1]) return match[1]
    return str.split("/").filter(Boolean).pop() || str
}

/**
 * Normalisasi URL relatif ke absolut
 * @param {string} path 
 * @returns {string|null}
 */
function normalizeUrl(path) {
    if (!path) return null
    if (path.startsWith("http://") || path.startsWith("https://")) return path
    return `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`
}

/**
 * Cari video di HentaiCity
 * @param {string} query 
 * @returns {Promise<Array<{id: string, slug: string, title: string, duration: string, isHD: boolean, views: string, rating: string, thumb: string, trailer: string, url: string}>>}
 */
export async function searchVideos(query) {
    const q = String(query || "").trim()
    if (!q) throw new TypeError("Query pencarian video tidak boleh kosong")

    const searchUrl = `${BASE_URL}/search/video/${encodeURIComponent(q)}`
    const { data } = await http.get(searchUrl)
    const $ = cheerio.load(data)

    const results = []
    const seen = new Set()

    $("div.item, .item-video").each((_, el) => {
        const item = $(el)
        const link = item.find("a").first().attr("href")
        if (!link || !link.includes("/video/")) return

        const cleanLink = normalizeUrl(link.replace(/\/click\/\d+-\d+\//, "/"))
        const slug = extractSlug(cleanLink)
        if (!slug || seen.has(slug)) return
        seen.add(slug)

        const title = item.find("a.video-title, a.title, a[title]").first().text().trim() || item.find("a[title]").attr("title") || slug
        const thumb = item.find("img").attr("src") || item.find("img").attr("data-src") || null
        const duration = item.find("span.time").text().trim() || "-"
        const isHD = item.find("span.flag-hd").length > 0
        const trailer = item.find("video").attr("src") || null

        // rating & views
        const infoSpans = item.find(".info span")
        const rating = infoSpans.eq(0).text().trim() || "-"
        const views = infoSpans.eq(1).text().trim() || "-"

        results.push({
            id: slug,
            slug,
            title,
            duration,
            isHD,
            rating,
            views,
            thumb: normalizeUrl(thumb),
            trailer: normalizeUrl(trailer),
            url: cleanLink
        })
    })

    return results
}

/**
 * Cari galeri foto (Pics) di HentaiCity
 * @param {string} query 
 * @returns {Promise<Array<{id: string, slug: string, title: string, picsCount: string, views: string, rating: string, thumb: string, url: string}>>}
 */
export async function searchGalleries(query) {
    const q = String(query || "").trim()
    if (!q) throw new TypeError("Query pencarian galeri tidak boleh kosong")

    const searchUrl = `${BASE_URL}/search/gallery/${encodeURIComponent(q)}`
    const { data } = await http.get(searchUrl)
    const $ = cheerio.load(data)

    const results = []
    const seen = new Set()

    $("div.item, .item-gallery, .item-pic").each((_, el) => {
        const item = $(el)
        const link = item.find("a").first().attr("href")
        if (!link || !link.includes("/gallery/")) return

        const cleanLink = normalizeUrl(link.replace(/\/click\/\d+-\d+\//, "/"))
        const slug = extractSlug(cleanLink)
        if (!slug || seen.has(slug)) return
        seen.add(slug)

        const title = item.find("a.gallery-title, a.title, a[title]").first().text().trim() || item.find("a[title]").attr("title") || slug
        const thumb = item.find("img").attr("src") || item.find("img").attr("data-src") || null
        const picsCount = item.find("span.time").text().trim() || "-"

        const infoSpans = item.find(".info span")
        const rating = infoSpans.eq(0).text().trim() || "-"
        const views = infoSpans.eq(1).text().trim() || "-"

        results.push({
            id: slug,
            slug,
            title,
            picsCount,
            rating,
            views,
            thumb: normalizeUrl(thumb),
            url: cleanLink
        })
    })

    return results
}

/**
 * Ambil detail video anime di HentaiCity (termasuk direct download MP4 & streaming m3u8)
 * @param {string} slugOrUrl 
 * @returns {Promise<{id: string, slug: string, title: string, uploader: string, duration: string, uploadDate: string, views: string, poster: string, embedUrl: string, m3u8: string, directMp4: string, qualities: Array<{quality: string, url: string}>, tags: string[], url: string}>}
 */
export async function getVideoDetail(slugOrUrl) {
    const slug = extractSlug(slugOrUrl)
    if (!slug) throw new Error("Slug atau URL video HentaiCity tidak valid")

    const pageUrl = slugOrUrl.startsWith("http") ? slugOrUrl : `${BASE_URL}/video/${slug}.html`
    const { data } = await http.get(pageUrl)
    const $ = cheerio.load(data)

    const title = $("h1").first().text().trim() || $("title").text().replace(/\s*-\s*Hentai City.*/i, "").trim()
    const video = $("video#video-id, video").first()
    const poster = video.attr("poster") || $("meta[property='og:image']").attr("content") || null
    const m3u8 = video.find("source[src*='.m3u8']").attr("src") || null

    // Uploader
    const uploader = $("a[href*='/profile/']").first().text().trim() || "Anonymous"

    // Metadata dari fluidPlayer setup
    let duration = "-"
    let uploadDate = "-"
    let views = "-"
    const infoMatch = data.match(/class=['"]information['"]>(.*?)(?:<\/div>|")/s)
    if (infoMatch) {
        const infoHtml = infoMatch[1]
        const textParts = infoHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().split(" ")
        if (textParts.length >= 3) {
            uploadDate = textParts.slice(0, 3).join(" ")
            views = textParts[3] || "-"
            duration = textParts[4] || "-"
        }
    }

    // Embed URL
    const embedMatch = data.match(/src=["'](https?:\/\/[^"']*hentaicity\.com\/embed\/[^"']+)["']/i) || data.match(/\/embed\/([a-zA-Z0-9_\-]+)/)
    let embedUrl = null
    if (embedMatch) {
        embedUrl = embedMatch[1].startsWith("http") ? embedMatch[1] : `${BASE_URL}/embed/${embedMatch[1]}`
    }

    // Direct MP4
    const directMp4 = $("meta[property='og:video:url']").attr("content") || $("meta[property='og:video:secure_url']").attr("content") || null

    // Kualitas video dari pola m3u8 master playlist
    const qualities = []
    if (m3u8) {
        const qMatch = m3u8.match(/\/flv\/(\d+)\/(\d+)\/,([^,]+(?:,[^,]+)*),\.mp4\.urlset\//)
        if (qMatch) {
            const [, sub1, sub2, qualList] = qMatch
            const qNames = qualList.split(",").filter(Boolean)
            for (const q of qNames) {
                qualities.push({
                    quality: q,
                    url: `${BASE_URL}/flv/${sub1}/${sub2}/${q}.mp4`
                })
            }
        }
    }

    if (qualities.length === 0 && directMp4) {
        qualities.push({ quality: "default", url: directMp4 })
    }

    // Tags
    const tags = []
    $("a[href*='/tags/video/'], a[href*='/videos/straight/']").each((_, el) => {
        const t = $(el).text().trim()
        if (t && !tags.includes(t) && !["Categories", "View All", "Most popular", "Most Recent"].includes(t)) {
            tags.push(t)
        }
    })

    return {
        id: slug,
        slug,
        title,
        uploader,
        duration,
        uploadDate,
        views,
        poster: normalizeUrl(poster),
        embedUrl,
        m3u8,
        directMp4,
        qualities,
        tags,
        url: pageUrl
    }
}

/**
 * Ambil detail galeri foto (Pics) di HentaiCity
 * @param {string} slugOrUrl 
 * @returns {Promise<{id: string, slug: string, title: string, count: number, images: string[], tags: string[], url: string}>}
 */
export async function getGalleryDetail(slugOrUrl) {
    const slug = extractSlug(slugOrUrl)
    if (!slug) throw new Error("Slug atau URL galeri HentaiCity tidak valid")

    const pageUrl = slugOrUrl.startsWith("http") ? slugOrUrl : `${BASE_URL}/gallery/${slug}.html`
    const { data } = await http.get(pageUrl)
    const $ = cheerio.load(data)

    const title = $("h1").first().text().trim() || $("title").text().replace(/\s*-\s*Hentai City.*/i, "").trim()
    const images = []

    $("a[href*='cdn1.images.hentaicity.com/galleries/'], a[href*='.jpg'], a[href*='.png']").each((_, el) => {
        const href = $(el).attr("href")
        if (href && /\.(jpe?g|png|webp)$/i.test(href) && href.includes("/galleries/")) {
            const cleanHref = href.replace(/-t\.(jpe?g|png|webp)$/i, ".$1")
            if (!images.includes(cleanHref)) {
                images.push(cleanHref)
            }
        }
    })

    const tags = []
    $("a[href*='/tags/gallery/'], a[href*='/galleries/straight/']").each((_, el) => {
        const t = $(el).text().trim()
        if (t && !tags.includes(t)) tags.push(t)
    })

    return {
        id: slug,
        slug,
        title,
        count: images.length,
        images,
        tags,
        url: pageUrl
    }
}

export default {
    searchVideos,
    searchGalleries,
    getVideoDetail,
    getGalleryDetail,
    extractSlug
}
