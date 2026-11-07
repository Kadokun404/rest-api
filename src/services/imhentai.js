/**
 * Helper / Scrape: IMHentai Manga & Doujinshi Scraper & PDF Generator (imhentai.js)
 * Author: Arashi & Kadokun
 * 
 * Scraper untuk https://imhentai.xxx
 * Fitur:
 * - Search Manga / Doujinshi
 * - Ekstraksi detail, cover, tags, dan URL semua halaman
 * - Kompilasi halaman manga menjadi 1 file buku PDF utuh untuk dibaca di WhatsApp
 */

import { execFile } from "node:child_process"
import { promisify } from "node:util"
import * as cheerio from "cheerio"
import { decode } from "html-entities"
import { PDFDocument } from "pdf-lib"
import sharp from "sharp"

const execFileAsync = promisify(execFile)
const BASE_URL = "https://imhentai.xxx"
const HEADERS = [
    "-H", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "-H", "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "-H", "Accept-Language: en-US,en;q=0.9,id;q=0.8",
    "-H", "Referer: https://imhentai.xxx/"
]

/**
 * Fetch HTML via curl HTTP/2 untuk bypass proteksi Cloudflare
 * @param {string} url 
 * @returns {Promise<string>}
 */
async function fetchHtml(url) {
    const args = ["-s", "--compressed", ...HEADERS, url]
    const { stdout } = await execFileAsync("curl", args, { timeout: 25000 })
    return stdout
}

/**
 * Download buffer gambar halaman manga
 * @param {string} url 
 * @returns {Promise<Buffer>}
 */
async function fetchImageBuffer(url) {
    const args = ["-s", "-H", "User-Agent: Mozilla/5.0", "-H", "Referer: https://imhentai.xxx/", url]
    const { stdout } = await execFileAsync("curl", args, { encoding: "buffer", timeout: 20000 })
    return stdout
}

/**
 * Ekstrak ID galeri dari URL atau input
 * @param {string} input 
 * @returns {string}
 */
export function extractId(input) {
    let str = String(input || "").trim()
    str = str.replace(/\/+$/, "")
    const match = str.match(/(?:gallery|view)\/(\d+)/i) || str.match(/\b(\d{5,8})\b/)
    if (match?.[1]) return match[1]
    return str.split("/").filter(Boolean).pop() || str
}

/**
 * Cari manga / doujinshi di IMHentai
 * @param {string} query 
 * @param {number} [page=1]
 * @returns {Promise<Array<{id: string, title: string, thumb: string, url: string}>>}
 */
export async function searchManga(query, page = 1) {
    const q = String(query || "").trim()
    if (!q) throw new TypeError("Query pencarian manga tidak boleh kosong")

    const searchUrl = `${BASE_URL}/search/?key=${encodeURIComponent(q)}&page=${page}`
    const html = await fetchHtml(searchUrl)
    const $ = cheerio.load(html)

    const results = []
    const seen = new Set()

    $(".thumb, .row .thumbnail").each((_, el) => {
        const item = $(el)
        const a = item.find("a[href*='/gallery/']").first()
        const link = a.attr("href")
        if (!link || !link.includes("/gallery/")) return

        const id = extractId(link)
        if (!id || seen.has(id)) return
        seen.add(id)

        const rawTitle = item.find(".caption").text().trim() || item.find("a[href*='/gallery/']").last().text().trim() || item.find("img").attr("alt") || `Manga #${id}`
        const title = decode(rawTitle).trim()
        const thumb = item.find("img.lazy").attr("data-src") || item.find("img").attr("src") || null

        results.push({
            id,
            title,
            thumb: thumb?.startsWith("//") ? `https:${thumb}` : thumb,
            url: link.startsWith("http") ? link : `${BASE_URL}${link}`
        })
    })

    return results
}

/**
 * Ambil detail manga dan URL semua halamannya
 * @param {string} idOrUrl 
 * @returns {Promise<{id: string, title: string, cover: string, pagesCount: number, tags: string[], artists: string[], languages: string[], pages: string[], url: string}>}
 */
export async function getMangaDetail(idOrUrl) {
    const id = extractId(idOrUrl)
    if (!id) throw new Error("ID manga tidak valid")

    const pageUrl = idOrUrl.startsWith("http") ? idOrUrl : `${BASE_URL}/gallery/${id}/`
    const html = await fetchHtml(pageUrl)
    const $ = cheerio.load(html)

    const rawTitle = $("h1").first().text().trim() || $("#gallery_title").val() || `Manga #${id}`
    const title = decode(rawTitle).trim()

    const rawCover = $(".cover img").attr("data-src") || $(".cover img").attr("src") || null
    const cover = rawCover?.startsWith("//") ? `https:${rawCover}` : rawCover

    const server = $("#load_server").val() || "11"
    const dir = $("#load_dir").val() || "001"
    const loadId = $("#load_id").val()
    const pagesCount = parseInt($("#load_pages").val() || "0", 10)

    // Ekstrak ekstensi gambar per halaman dari variabel g_th
    const gThMatch = html.match(/var\s+g_th\s*=\s*\$\.parseJSON\('([^']+)'\)/)
    let gTh = {}
    if (gThMatch) {
        try {
            gTh = JSON.parse(gThMatch[1])
        } catch {}
    }

    // Bangun URL seluruh halaman manga
    const pages = []
    if (loadId && pagesCount > 0) {
        for (let i = 1; i <= pagesCount; i++) {
            const item = gTh[String(i)] || ""
            const extCode = item.split(",")[0] || "w"
            const ext = extCode === "w" ? "webp" : (extCode === "j" ? "jpg" : "png")
            pages.push(`https://m${server}.imhentai.xxx/${dir}/${loadId}/${i}.${ext}`)
        }
    }

    // Ekstrak metadata Tags, Artist, Language
    const tags = []
    $("a[href*='/tag/']").each((_, el) => {
        const t = $(el).text().trim()
        if (t && !tags.includes(t)) tags.push(t)
    })

    const artists = []
    $("a[href*='/artist/']").each((_, el) => {
        const a = $(el).text().trim()
        if (a && !artists.includes(a)) artists.push(a)
    })

    const languages = []
    $("a[href*='/language/']").each((_, el) => {
        const l = $(el).text().trim()
        if (l && !languages.includes(l)) languages.push(l)
    })

    return {
        id,
        title,
        cover,
        pagesCount: pages.length || pagesCount,
        tags,
        artists,
        languages,
        pages,
        url: pageUrl
    }
}

/**
 * Kompilasi halaman manga menjadi 1 file PDF lengkap
 * @param {string[]} pageUrls 
 * @param {object} [options]
 * @param {number} [options.maxPages=50] - Batas maksimal halaman (agar file PDF pas di limit WA ~60MB)
 * @returns {Promise<Buffer>}
 */
export async function createMangaPdf(pageUrls = [], { maxPages = 45 } = {}) {
    if (!pageUrls.length) throw new Error("Daftar URL halaman manga kosong")

    const targets = pageUrls.slice(0, maxPages)
    const doc = await PDFDocument.create()

    // Download & proses gambar per halaman secara berurutan atau mini-batch
    for (let i = 0; i < targets.length; i++) {
        try {
            const rawBuf = await fetchImageBuffer(targets[i])
            if (!rawBuf || !rawBuf.length) continue

            // Convert ke JPEG terkompresi dengan sharp agar file PDF tidak membengkak
            const jpegBuf = await sharp(rawBuf)
                .jpeg({ quality: 80, mozjpeg: true })
                .toBuffer()

            const embedded = await doc.embedJpg(jpegBuf)
            const page = doc.addPage([embedded.width, embedded.height])
            page.drawImage(embedded, {
                x: 0,
                y: 0,
                width: embedded.width,
                height: embedded.height
            })
        } catch (err) {
            console.warn(`[imhentai] Gagal proses halaman ${i + 1} ke PDF:`, err.message)
        }
    }

    const pdfBytes = await doc.save()
    return Buffer.from(pdfBytes)
}

export default {
    searchManga,
    getMangaDetail,
    createMangaPdf,
    extractId
}
