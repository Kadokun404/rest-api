/**
 * Helper / Scrape: Sticker.ly Search & Downloader
 * Menggunakan reverse-engineering API resmi Sticker.ly (v2/v3.1) + fallback Theresa API.
 */

const config = { apikey: { theresav: process.env.THERESAV_API_KEY || "araqshi", rule34: { user_id: process.env.RULE34_USER_ID || "7010186", api_key: process.env.RULE34_API_KEY || "dbcb6813a47b997a07ceedbe4eaef3b0e38c0d0fdb5665642622e49af6b2239c9232945c552358cde2cd92bf377ed7b33cf1b784993aa121b2c45b9468bcde35" } } };

const USER_AGENT = "androidapp.stickerly/2.16.0 (Linux; U; Android 13; en_US; Pixel 7)"
const STICKERLY_API = "http://api.sticker.ly"
const THERESA_API = "https://api.theresav.eu/api"
const API_KEY = config?.apikey?.theresav || "araqshi"

const STICKERLY_URL_REGEX = /sticker\.ly\/s\/([A-Za-z0-9]+)/i
const STICKERLY_ID_REGEX = /^[A-Za-z0-9]{5,10}$/

const PRESETS = {
    shikimori: "DLHNGQ",
    "shikimori-san": "DLHNGQ",
    pentol: "17KV4C"
}

/**
 * Ekstrak pack ID dari link atau teks
 * @param {string} input
 * @returns {string|null}
 */
export function extractPackId(input) {
    if (!input) return null
    const trimmed = String(input).trim()
    const lower = trimmed.toLowerCase()
    if (PRESETS[lower]) return PRESETS[lower]

    const urlMatch = trimmed.match(STICKERLY_URL_REGEX)
    if (urlMatch?.[1]) return urlMatch[1]

    // Hanya jika murni format kode ID Sticker.ly (misal 17KV4C, DLHNGQ)
    // Kode asli Sticker.ly biasanya 5-8 karakter uppercase/angka dan mengandung angka atau uppercase
    if (/^[A-Z0-9]{5,8}$/.test(trimmed) && (/[0-9]/.test(trimmed) || trimmed === trimmed.toUpperCase())) {
        return trimmed
    }

    return null
}

/**
 * Cari sticker pack di Sticker.ly berdasarkan kata kunci
 * @param {string} query
 * @param {object} [options]
 * @param {number} [options.size=15]
 * @returns {Promise<Array<{packId: string, name: string, authorName: string, count: number, isAnimated: boolean, shareUrl: string, thumbnailUrl: string}>>}
 */
export async function searchStickerly(query, { size = 15 } = {}) {
    const q = String(query || "").trim()
    if (!q) throw new Error("Kata kunci pencarian tidak boleh kosong")

    // 1. Coba via API Internal Sticker.ly v2
    try {
        const res = await fetch(`${STICKERLY_API}/v2/stickerPack/search`, {
            method: "POST",
            headers: {
                "User-Agent": USER_AGENT,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                keyword: q,
                size: Math.min(size, 30)
            }),
            signal: AbortSignal.timeout(15000)
        })

        if (res.ok) {
            const data = await res.json()
            const packs = data?.result?.stickerPacks
            if (Array.isArray(packs) && packs.length > 0) {
                return packs.map((p) => {
                    const firstFile = Array.isArray(p.resourceFiles) && p.resourceFiles[0] ? p.resourceFiles[0] : ""
                    const prefix = p.resourceUrlPrefix || ""
                    const thumbnailUrl = prefix && firstFile ? `${prefix}${firstFile}` : ""
                    return {
                        packId: p.packId,
                        name: p.name || "Sticker Pack",
                        authorName: p.authorName || p.owner || "-",
                        count: p.resourceFiles?.length || 0,
                        isAnimated: Boolean(p.animated || p.isAnimated),
                        shareUrl: p.shareUrl || `https://sticker.ly/s/${p.packId}`,
                        thumbnailUrl
                    }
                })
            }
        }
    } catch (err) {
        console.warn("[stickerly] v2 search failed, trying fallback:", err.message)
    }

    // 2. Fallback via Theresa API (/search/stickerly)
    try {
        const res = await fetch(`${THERESA_API}/search/stickerly?q=${encodeURIComponent(q)}`, {
            headers: { "x-apikey": API_KEY },
            signal: AbortSignal.timeout(15000)
        })

        if (res.ok) {
            const data = await res.json()
            if (data?.status && Array.isArray(data?.data) && data.data.length > 0) {
                return data.data.slice(0, size).map((item) => {
                    const pId = extractPackId(item.url) || item.name
                    return {
                        packId: pId,
                        name: item.name || "Sticker Pack",
                        authorName: item.author || "-",
                        count: item.stickerCount || 0,
                        isAnimated: Boolean(item.isAnimated),
                        shareUrl: item.url || `https://sticker.ly/s/${pId}`,
                        thumbnailUrl: item.thumbnailUrl || ""
                    }
                })
            }
        }
    } catch (err) {
        console.warn("[stickerly] Theresa fallback search failed:", err.message)
    }

    throw new Error(`Tidak ditemukan sticker pack untuk pencarian "${q}"`)
}

/**
 * Ambil daftar URL gambar stiker dari Sticker.ly berdasarkan pack ID
 * @param {string} packId
 * @returns {Promise<{packId: string, name: string, authorName: string, isAnimated: boolean, stickerUrls: string[]}>}
 */
export async function getStickerPackDetails(packId) {
    const id = String(packId || "").trim()
    if (!id) throw new Error("Pack ID tidak valid")

    // 1. Coba via API v3.1 Sticker.ly
    try {
        const res = await fetch(`${STICKERLY_API}/v3.1/stickerPack/${id.toUpperCase()}`, {
            headers: { "User-Agent": USER_AGENT },
            signal: AbortSignal.timeout(15000)
        })

        if (res.ok) {
            const data = await res.json()
            const result = data?.result
            if (result && Array.isArray(result.stickers) && result.stickers.length > 0) {
                const prefix = result.resourceUrlPrefix || ""
                const stickerUrls = result.stickers
                    .map((s) => (s?.fileName ? `${prefix}${s.fileName}` : null))
                    .filter(Boolean)

                return {
                    packId: id,
                    name: result.name || "Sticker Pack",
                    authorName: result.authorName || "-",
                    isAnimated: Boolean(result.animated || result.isAnimated),
                    stickerUrls
                }
            }
        }
    } catch (err) {
        console.warn("[stickerly] v3.1 pack detail failed, trying HTML scrape fallback:", err.message)
    }

    // 2. Fallback Scraping Halaman Web HTML
    const pageUrl = `https://sticker.ly/s/${id}`
    const res = await fetch(pageUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(20000)
    })

    if (!res.ok) {
        throw new Error(`Gagal membuka halaman sticker.ly (HTTP ${res.status})`)
    }

    const html = await res.text()
    const target = `/${id}/`.toLowerCase()
    const pngMatches = html.match(/https:\/\/stickerly\.pstatic\.net\/sticker_pack\/[^\s"')]+\.png/g) || []
    let uniqueUrls = [...new Set(pngMatches)].filter((url) => url.toLowerCase().includes(target))

    if (uniqueUrls.length === 0) {
        const webpMatches = html.match(/https:\/\/stickerly\.pstatic\.net\/sticker_pack\/[^\s"')]+\.webp/g) || []
        uniqueUrls = [...new Set(webpMatches)].filter((url) => url.toLowerCase().includes(target))
    }

    if (uniqueUrls.length === 0) {
        throw new Error(`Tidak ditemukan stiker di pack ${id}`)
    }

    const titleMatch = html.match(/<title>(.*?)<\/title>/i)
    const name = titleMatch ? titleMatch[1].replace(/ - Sticker\.ly/i, "").trim() : "Sticker Pack"

    return {
        packId: id,
        name,
        authorName: "-",
        isAnimated: false,
        stickerUrls: uniqueUrls
    }
}
