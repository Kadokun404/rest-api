import { execFile } from "node:child_process"
import { promisify } from "node:util"
import * as cheerio from "cheerio"
import { decode } from "html-entities"

const execFileAsync = promisify(execFile)
const BASE_URL = "https://hanime1.me"
const HEADERS = [
    "-H", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "-H", "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "-H", "Accept-Language: zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
    "-H", "Referer: https://hanime1.me/"
]

/**
 * Fetch HTML via curl HTTP/2 untuk bypass Cloudflare
 */
async function fetchHtml(url) {
    const args = ["-s", "--compressed", ...HEADERS, url]
    const { stdout } = await execFileAsync("curl", args, { timeout: 25000 })
    return stdout
}

/**
 * Fetch buffer gambar/media dengan header Referer Hanime1
 * @param {string} url
 * @returns {Promise<Buffer|null>}
 */
export async function fetchBuffer(url) {
    if (!url) return null
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
                "Referer": "https://hanime1.me/"
            }
        })
        if (res.ok) {
            return Buffer.from(await res.arrayBuffer())
        }
    } catch {}

    try {
        const { stdout } = await execFileAsync("curl", [
            "-s",
            "-H", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "-H", "Referer: https://hanime1.me/",
            url
        ], { encoding: "buffer", timeout: 15000 })
        return stdout
    } catch {
        return null
    }
}

/**
 * Parse elemen video item dari HTML
 * @param {string} html
 */
function parseVideoItems(html) {
    const $ = cheerio.load(html)
    const results = []

    $(".video-item-container").each((_, el) => {
        const rawTitle = $(el).find(".title").text().trim() || $(el).attr("title")
        const title = rawTitle ? decode(rawTitle).trim() : null
        const a = $(el).find("a.video-link")
        const link = a.attr("href")
        const id = link ? link.replace(/.*watch\?v=/, "").trim() : null
        const thumb = $(el).find("img.main-thumb").attr("src")
        const duration = $(el).find(".duration").text().trim()
        const uploader = $(el).find(".subtitle a").text().trim()

        if (id && title && !title.includes("慾望王座") && !title.includes("櫻境物語")) {
            results.push({ id, title, duration, uploader, thumb, link: `${BASE_URL}/watch?v=${id}` })
        }
    })

    return results
}

/**
 * Cari video di hanime1.me
 * @param {string} query
 * @returns {Promise<Array<{id: string, title: string, duration: string, uploader: string, thumb: string, link: string}>>}
 */
export async function searchHanime(query) {
    const url = `${BASE_URL}/search?query=${encodeURIComponent(query.trim())}`
    const html = await fetchHtml(url)
    return parseVideoItems(html)
}

/**
 * Ambil video terbaru di hanime1.me
 * @returns {Promise<Array<{id: string, title: string, duration: string, uploader: string, thumb: string, link: string}>>}
 */
export async function getLatestHanime() {
    const url = `${BASE_URL}/search?sort=${encodeURIComponent("最新上市")}`
    const html = await fetchHtml(url)
    return parseVideoItems(html)
}

/**
 * Ambil detail video & direct MP4 streams
 * @param {string} idOrUrl
 * @returns {Promise<{id: string, title: string, cover: string, duration: string, uploader: string, sources: Array<{quality: string, src: string}>}>}
 */
export async function getHanimeDetail(idOrUrl) {
    const id = String(idOrUrl).replace(/.*watch\?v=/, "").replace(/[^0-9]/g, "").trim()
    if (!id) throw new Error("ID video Hanime1 tidak valid")

    const url = `${BASE_URL}/watch?v=${id}`
    const html = await fetchHtml(url)
    const $ = cheerio.load(html)

    const rawTitle = $("#share-btn-title").text().trim() || $("h3").first().text().trim() || "Hanime Video"
    const title = decode(rawTitle).trim()
    const cover = $("meta[property=\"og:image\"]").attr("content")
    const uploader = $(".video-details a").first().text().trim() || ""

    const sources = []
    $("video source").each((_, el) => {
        const src = $(el).attr("src")
        const quality = $(el).attr("size") || "720"
        if (src && /^https?:\/\//i.test(src)) {
            sources.push({ quality, src })
        }
    })

    if (!sources.length) {
        throw new Error("Gagal mengekstrak direct link video MP4 dari Hanime1")
    }

    // Urutkan kualitas terbaik lebih dulu
    sources.sort((a, b) => (parseInt(b.quality, 10) || 0) - (parseInt(a.quality, 10) || 0))

    return {
        id,
        title,
        cover,
        uploader,
        sources,
        url
    }
}
