/**
 * Image search service (Google Search URL / Keyword Parser)
 * Lightweight, minimalist & reliable image scraper
 */

/**
 * Extract search query from text or Google search URL
 * @param {string} input
 * @returns {string}
 */
export function extractQuery(input = "") {
    const trimmed = input.trim()
    if (/^https?:\/\//i.test(trimmed)) {
        try {
            const parsed = new URL(trimmed)
            const q = parsed.searchParams.get("q") || parsed.searchParams.get("query")
            if (q) return q.trim()
        } catch {}
    }
    return trimmed
}

/**
 * Search images via DuckDuckGo / Google image index
 * @param {string} query
 * @param {number} [limit=15]
 * @returns {Promise<{query: string, images: Array<{url: string, title: string, width: number, height: number}>}>}
 */
export async function searchImages(query, limit = 15) {
    const cleanQuery = extractQuery(query)
    if (!cleanQuery) throw new Error("Search query cannot be empty")

    // 1. Fetch vqd token
    const tokenUrl = `https://duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&t=h_&iax=images&ia=images`
    const tokenRes = await fetch(tokenUrl, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        },
        signal: AbortSignal.timeout(10000)
    })

    if (!tokenRes.ok) throw new Error(`Failed to initiate search (HTTP ${tokenRes.status})`)

    const tokenHtml = await tokenRes.text()
    const vqdMatch = tokenHtml.match(/vqd=([0-9-]+)/)
    if (!vqdMatch) throw new Error("Failed to extract search token")
    const vqd = vqdMatch[1]

    // 2. Query image API
    const apiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(cleanQuery)}&vqd=${vqd}&f=,,,`
    const imgRes = await fetch(apiUrl, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "application/json"
        },
        signal: AbortSignal.timeout(15000)
    })

    if (!imgRes.ok) throw new Error(`Search request failed (HTTP ${imgRes.status})`)

    const data = await imgRes.json()
    const results = (data.results || [])
        .filter(r => r.image && /^https?:\/\//i.test(r.image))
        .map(r => ({
            url: r.image,
            imageUrl: r.image,
            thumbnail: r.thumbnail || r.image,
            title: r.title || cleanQuery,
            width: r.width || 0,
            height: r.height || 0,
            source: r.url || ""
        }))

    if (!results.length) {
        throw new Error(`No images found for query: "${cleanQuery}"`)
    }

    return {
        query: cleanQuery,
        total: results.length,
        images: results.slice(0, Math.max(limit, 30))
    }
}

export const googleSearchImage = searchImages
