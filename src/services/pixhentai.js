/**
 * Helper / Scrape: PixHentai Doujinshi Scraper & PDF Generator
 * Author: Arashi & Kadokun
 * 
 * Scraper untuk https://pixhentai.com
 * Fitur:
 * - Search doujinshi / manga dengan dukungan multi-kata (spasi)
 * - Ekstraksi detail komik, cover, tags, kategori, dan semua halaman gambar
 * - Auto-detect chapter/part kelanjutan (part 1, 2, 3, 4, dst.)
 * - Kompilasi gambar menjadi file PDF E-Book siap baca di WhatsApp
 */

import axios from "axios"
import * as cheerio from "cheerio"
import { decode } from "html-entities"
import { PDFDocument } from "pdf-lib"
import sharp from "sharp"

const BASE_URL = "https://pixhentai.com"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

/**
 * Client axios dengan header default
 */
const client = axios.create({
    headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": `${BASE_URL}/`
    },
    timeout: 20000
})

/**
 * Fetch HTML dengan fallback native fetch jika axios kena 403
 */
async function fetchHtml(url) {
    try {
        const { data } = await client.get(url)
        return data
    } catch (err) {
        if (err.response?.status === 403 || String(err.message).includes("403")) {
            const res = await fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
                    "Referer": "https://www.google.com/"
                }
            })
            if (res.ok) return await res.text()
        }
        throw err
    }
}

/**
 * Concurrency runner untuk download paralel yang stabil & cepat
 * @template T, R
 * @param {T[]} items 
 * @param {(item: T, index: number) => Promise<R>} fn 
 * @param {number} concurrency 
 * @returns {Promise<R[]>}
 */
async function mapConcurrent(items, fn, concurrency = 5) {
    const results = new Array(items.length)
    let index = 0

    const workers = new Array(concurrency).fill(0).map(async () => {
        while (index < items.length) {
            const i = index++
            results[i] = await fn(items[i], i)
        }
    })

    await Promise.all(workers)
    return results
}

/**
 * Bersihkan string nama file dari karakter ilegal
 * @param {string} str 
 * @returns {string}
 */
export function sanitizeFileName(str) {
    return str.replace(/[\\/:*?"<>|]/g, "").trim().slice(0, 90)
}

/**
 * Normalisasi URL atau slug PixHentai
 * @param {string} input 
 * @returns {string}
 */
export function normalizeUrl(input) {
    let str = String(input || "").trim()
    if (/^https?:\/\//i.test(str)) {
        return str
    }
    str = str.replace(/^\/+|\/+$/g, "")
    return `${BASE_URL}/${str}/`
}

/**
 * Cari doujinshi di PixHentai
 * @param {string} query - Keyword pencarian (bisa banyak kata / spasi)
 * @param {number} [page=1]
 * @returns {Promise<Array<{title: string, url: string, slug: string, thumb: string, part: number|null}>>}
 */
export async function searchPixhentai(query, page = 1) {
    const q = String(query || "").trim()
    if (!q) throw new TypeError("Keyword pencarian tidak boleh kosong")

    const searchUrl = page > 1 
        ? `${BASE_URL}/page/${page}/?s=${encodeURIComponent(q)}`
        : `${BASE_URL}/?s=${encodeURIComponent(q)}`

    const data = await fetchHtml(searchUrl)
    const $ = cheerio.load(data)

    const results = []
    const seen = new Set()

    $("article.blog-entry, article.post, .blog-entry-inner").each((_, el) => {
        const item = $(el)
        const a = item.find("h2.entry-title a, .entry-title a, a[rel='bookmark']").first()
        const link = a.attr("href")
        if (!link || seen.has(link)) return
        seen.add(link)

        const rawTitle = a.text().trim() || item.find("img").attr("alt") || ""
        const title = decode(rawTitle).trim()
        if (!title) return

        const thumb = item.find("img").attr("data-src") || 
                      item.find("img").attr("src") || 
                      item.find("img").attr("data-lazy-src") || null

        const slug = link.replace(BASE_URL, "").replace(/\//g, "")
        const partMatch = title.match(/part\s*(\d+)/i) || slug.match(/part-(\d+)/i)

        results.push({
            title,
            url: link,
            slug,
            thumb: thumb?.startsWith("//") ? `https:${thumb}` : thumb,
            part: partMatch ? parseInt(partMatch[1], 10) : null
        })
    })

    return results
}

/**
 * Ambil detail doujinshi dan daftar URL seluruh halamannya
 * @param {string} urlOrSlug 
 * @returns {Promise<{title: string, url: string, slug: string, cover: string, categories: string[], tags: string[], images: string[], totalPages: number, baseTitle: string, currentPart: number|null, nextPart: {title: string, url: string}|null, prevPart: {title: string, url: string}|null}>}
 */
export async function getPixhentaiDetail(urlOrSlug) {
    const targetUrl = normalizeUrl(urlOrSlug)
    const data = await fetchHtml(targetUrl)
    const $ = cheerio.load(data)

    const rawTitle = $("h1.entry-title").first().text().trim() || 
                     $("h1").first().text().trim() || 
                     $("meta[property='og:title']").attr("content") || "Doujinshi"
    const title = decode(rawTitle).replace(/\s*-\s*Situs Komik.*$/i, "").trim()

    const cover = $("meta[property='og:image']").attr("content") || 
                  $(".entry-content img").first().attr("src") || 
                  $(".entry-content img").first().attr("data-src") || null

    const categories = []
    $(".cat-links a, a[rel='category tag']").each((_, el) => {
        const c = $(el).text().trim()
        if (c && !categories.includes(c)) categories.push(c)
    })

    const tags = []
    $(".tags-links a, a[rel='tag']").each((_, el) => {
        const t = $(el).text().trim()
        if (t && !tags.includes(t)) tags.push(t)
    })

    // Ekstraksi seluruh halaman gambar komik
    const images = []
    const seenImg = new Set()
    $(".entry-content img").each((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src")
        if (!src) return
        if (src.includes("gravatar") || src.includes("banner") || src.includes("ads")) return
        if (seenImg.has(src)) return
        seenImg.add(src)
        images.push(src)
    })

    const slug = targetUrl.replace(BASE_URL, "").replace(/\//g, "")
    const partMatch = title.match(/part\s*(\d+)/i) || slug.match(/part-(\d+)/i)
    const currentPart = partMatch ? parseInt(partMatch[1], 10) : 1
    const baseTitle = title.replace(/\s*part\s*\d+/gi, "").trim()

    // Cari part selanjutnya dan part sebelumnya jika berseri
    let nextPart = null
    let prevPart = null

    try {
        if (baseTitle) {
            const related = await searchPixhentai(baseTitle)
            for (const r of related) {
                if (r.part === currentPart + 1 && !nextPart) {
                    nextPart = { title: r.title, url: r.url }
                }
                if (r.part === currentPart - 1 && !prevPart) {
                    prevPart = { title: r.title, url: r.url }
                }
            }
        }
    } catch (e) {
        console.warn("[pixhentai] Gagal mencari related parts:", e.message)
    }

    return {
        title,
        url: targetUrl,
        slug,
        cover,
        categories,
        tags,
        images,
        totalPages: images.length,
        baseTitle,
        currentPart,
        nextPart,
        prevPart
    }
}

/**
 * Kompilasi gambar doujinshi menjadi 1 file buku PDF utuh
 * @param {string[]} imageUrls 
 * @param {object} [options]
 * @param {number} [options.maxPages=100]
 * @param {(progress: {current: number, total: number}) => void} [options.onProgress]
 * @returns {Promise<Buffer>}
 */
export async function createPixhentaiPdf(imageUrls = [], { maxPages = 90, onProgress } = {}) {
    if (!imageUrls.length) throw new Error("Daftar URL gambar halaman doujinshi kosong")

    const targets = imageUrls.slice(0, maxPages)

    // Download & konversi ke JPEG terkompresi secara bersamaan (concurrency: 6)
    let completed = 0
    const jpegs = await mapConcurrent(targets, async (url, idx) => {
        try {
            const { data } = await axios.get(url, {
                responseType: "arraybuffer",
                headers: {
                    "User-Agent": USER_AGENT,
                    "Referer": `${BASE_URL}/`
                },
                timeout: 20000
            })

            const buf = await sharp(data)
                .jpeg({ quality: 75, mozjpeg: true })
                .toBuffer()

            completed++
            if (onProgress) {
                onProgress({ current: completed, total: targets.length })
            }
            return buf
        } catch (err) {
            console.warn(`[pixhentai] Gagal memuat halaman ${idx + 1} (${url}):`, err.message)
            return null
        }
    }, 6)

    // Susun seluruh halaman ke dalam dokumen PDF
    const doc = await PDFDocument.create()

    for (let i = 0; i < jpegs.length; i++) {
        const imgBuf = jpegs[i]
        if (!imgBuf) continue

        try {
            const embedded = await doc.embedJpg(imgBuf)
            const page = doc.addPage([embedded.width, embedded.height])
            page.drawImage(embedded, {
                x: 0,
                y: 0,
                width: embedded.width,
                height: embedded.height
            })
        } catch (embedErr) {
            console.warn(`[pixhentai] Gagal embed gambar ${i + 1} ke PDF:`, embedErr.message)
        }
    }

    const pdfBytes = await doc.save()
    return Buffer.from(pdfBytes)
}

export default {
    searchPixhentai,
    getPixhentaiDetail,
    createPixhentaiPdf,
    normalizeUrl,
    sanitizeFileName
}
