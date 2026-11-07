/**
 * Helper / Scrape: Hentai.tv Search & Details (hentaitv.js)
 * Author: Arashii & Kadokun
 * 
 * Scraper resmi endpoint internal Next.js Hentai.tv (https://hentai.tv)
 * Mengambil metadata anime, sinopsis, genre/tags, resolusi, durasi, thumbnail, dan link streaming embed.
 */

const BASE_URL = "https://hentai.tv"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

/**
 * Ekstrak slug dari URL hentai.tv atau input mentah
 * @param {string} input 
 * @returns {string}
 */
export function extractSlug(input) {
    const str = String(input || "").trim()
    const match = str.match(/hentai\.tv\/hentai\/([a-zA-Z0-9_\-]+)/i)
    if (match?.[1]) return match[1]
    return str.replace(/^\/+|\/+$/g, "")
}

function normalizeUrl(path) {
    if (!path) return null
    if (path.startsWith("http://") || path.startsWith("https://")) return path
    return `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`
}

/**
 * Cari video anime di Hentai.tv berdasarkan kata kunci
 * @param {string} keyword - Kata kunci pencarian
 * @returns {Promise<Array<{id: string, slug: string, title: string, episode: number, duration: string, quality: string, rating: number, views: number, brand: string, censored: boolean, tags: string[], cover: string, embedUrl: string, url: string, description: string}>>}
 */
export async function search(keyword) {
    const q = String(keyword || "").trim()
    if (!q) throw new TypeError("Keyword pencarian tidak boleh kosong")

    const res = await fetch(`${BASE_URL}/api/search?q=${encodeURIComponent(q)}`, {
        headers: {
            "User-Agent": USER_AGENT,
            "Accept": "application/json"
        },
        signal: AbortSignal.timeout(15000)
    })

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Gagal menghubungi server Hentai.tv`)
    }

    const data = await res.json()
    const list = data?.videos || []

    return list.map((v) => ({
        id: v.id,
        slug: v.slug,
        title: v.title || "Untitled",
        episode: v.ep || 1,
        duration: v.duration || "-",
        quality: v.quality || "1080p",
        rating: v.rating || 0,
        views: v.views || 0,
        likes: v.likes || 0,
        brand: v.brand || "-",
        year: v.year || "-",
        censored: Boolean(v.censored),
        tags: Array.isArray(v.tags) ? v.tags : [],
        cover: normalizeUrl(v.cover || v.featureImage),
        backdrop: normalizeUrl(v.backdrop || v.thumb),
        embedUrl: v.embedUrl || null,
        url: `${BASE_URL}/hentai/${v.slug}`,
        description: (v.description || "").trim()
    }))
}

/**
 * Ambil detail video anime berdasarkan slug atau URL
 * @param {string} slugOrUrl 
 */
export async function getDetail(slugOrUrl) {
    const slug = extractSlug(slugOrUrl)
    if (!slug) throw new Error("Slug atau URL Hentai.tv tidak valid")

    // 1. Coba cari dulu via search API (hasilnya lengkap dengan objek video resmi)
    try {
        const results = await search(slug)
        const exact = results.find((v) => v.slug.toLowerCase() === slug.toLowerCase()) || results[0]
        if (exact) return exact
    } catch {}

    // 2. Fallback fetch HTML halaman video
    const pageUrl = `${BASE_URL}/hentai/${slug}`
    const res = await fetch(pageUrl, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(15000)
    })

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Video tidak ditemukan`)
    }

    const html = await res.text()
    const iframeMatch = html.match(/<iframe[^>]*src=["']([^"']+)["']/i)
    const titleMatch = html.match(/<title>(.*?)<\/title>/i)

    const title = titleMatch ? titleMatch[1].replace(/ - Hentai\.tv.*$/i, "").trim() : slug
    const embedUrl = iframeMatch ? iframeMatch[1] : null

    return {
        id: slug,
        slug,
        title,
        episode: 1,
        duration: "-",
        quality: "1080p",
        rating: 0,
        views: 0,
        likes: 0,
        brand: "-",
        censored: false,
        tags: [],
        cover: null,
        backdrop: null,
        embedUrl,
        url: pageUrl,
        description: ""
    }
}

export default {
    search,
    getDetail,
    extractSlug
}
