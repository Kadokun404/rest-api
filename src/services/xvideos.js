import { execFile } from "node:child_process"
import { promisify } from "node:util"
import * as cheerio from "cheerio"
import { decode } from "html-entities"
import fs from "node:fs"

const execFileAsync = promisify(execFile)
const BASE_URL = "https://www.xvideos.com"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

const HEADERS = [
    "-H", `User-Agent: ${USER_AGENT}`,
    "-H", "Accept-Language: en-US,en;q=0.9",
    "-H", "Referer: https://www.xvideos.com/"
]

/**
 * Fetch HTML via curl HTTP/2
 * @param {string} url
 * @returns {Promise<string>}
 */
export async function fetchHtml(url) {
    const args = ["-s", "-L", "--max-redirs", "5", "--compressed", ...HEADERS, url]
    const { stdout } = await execFileAsync("curl", args, { timeout: 30000, maxBuffer: 15 * 1024 * 1024 })
    return stdout
}

/**
 * Fetch buffer with Referer header
 * @param {string} url
 * @returns {Promise<Buffer|null>}
 */
export async function fetchBuffer(url) {
    if (!url) return null
    try {
        const { stdout } = await execFileAsync("curl", [
            "-s", "-L", "--max-redirs", "5",
            ...HEADERS,
            url
        ], { encoding: "buffer", timeout: 20000 })
        return stdout
    } catch {
        return null
    }
}

/**
 * Parse video listing from html
 * @param {string} html
 */
function parseListing(html) {
    const $ = cheerio.load(html)
    const items = []

    $(".thumb-block").each((_, el) => {
        const $el = $(el)
        const a = $el.find(".thumb a, a.thumb-link").first()
        const rawLink = a.attr("href") || $el.find("a").first().attr("href") || ""

        const titleEl = $el.find(".thumb-under a.title, .thumb-under p a, .thumb-under .title a, .thumb-under a").first()
        const rawTitle = titleEl.attr("title") || titleEl.text().trim() || $el.find("img").attr("alt") || a.attr("aria-label")
        const title = rawTitle ? decode(rawTitle).trim() : null

        const thumb = $el.find("img").attr("data-src") || $el.find("source").attr("data-srcset") || $el.find("img").attr("src") || null
        const metaText = $el.find(".metadata, .thumb-under").text().replace(/\s+/g, " ").trim()

        const durationMatch = metaText.match(/(\d+\s*min|\d+\s*sec|\d+:\d+)/i)
        const viewsMatch = metaText.match(/([\d\.]+[km]?)\s*(?:views)?/i)

        const idMatch = rawLink.match(/\/video[.-]?([a-z0-9]+)/i)
        const id = $el.attr("data-eid") || (idMatch ? idMatch[1] : null)

        if (id && rawLink && title) {
            const link = rawLink.startsWith("http") ? rawLink : `${BASE_URL}${rawLink}`
            items.push({
                id,
                title,
                duration: durationMatch ? durationMatch[1] : "-",
                views: viewsMatch ? viewsMatch[1] : "-",
                thumb,
                link
            })
        }
    })

    return items
}

/**
 * Search videos by query
 * @param {string} query
 * @param {number} [page=0]
 */
export async function search(query, page = 0) {
    const cleanQuery = encodeURIComponent(query.trim().replace(/\s+/g, "+"))
    const url = page > 0 ? `${BASE_URL}/?k=${cleanQuery}&p=${page}` : `${BASE_URL}/?k=${cleanQuery}`
    const html = await fetchHtml(url)
    return parseListing(html)
}

/**
 * Get Best Of videos
 */
export async function getBest() {
    const html = await fetchHtml(`${BASE_URL}/best`)
    return parseListing(html)
}

/**
 * Get Fresh Homepage videos
 */
export async function getHome() {
    const html = await fetchHtml(`${BASE_URL}/`)
    return parseListing(html)
}

/**
 * Get video details and direct stream links
 * @param {string} idOrUrl
 */
export async function getDetail(idOrUrl) {
    const input = String(idOrUrl).trim()
    let url = input

    if (/^https?:\/\//i.test(input)) {
        url = input
    } else if (input.startsWith("/video")) {
        url = `${BASE_URL}${input}`
    } else if (input.startsWith("video")) {
        url = `${BASE_URL}/${input}`
    } else {
        url = `${BASE_URL}/video.${input}/_`
    }

    const html = await fetchHtml(url)

    const titleMatch = html.match(/html5player\.setVideoTitle\x28\x27([^\x27]+)\x27\x29/)
    const hlsMatch = html.match(/html5player\.setVideoHLS\x28\x27([^\x27]+)\x27\x29/)
    const mp4HighMatch = html.match(/html5player\.setVideoUrlHigh\x28\x27([^\x27]+)\x27\x29/)
    const mp4LowMatch = html.match(/html5player\.setVideoUrlLow\x28\x27([^\x27]+)\x27\x29/)
    const thumbMatch = html.match(/html5player\.setThumbUrl169\x28\x27([^\x27]+)\x27\x29/) || html.match(/html5player\.setThumbUrl\x28\x27([^\x27]+)\x27\x29/)

    const $ = cheerio.load(html)
    const title = titleMatch ? decode(titleMatch[1]).trim() : $("meta[property=\"og:title\"]").attr("content") || "XVideos Video"
    const thumb = thumbMatch ? thumbMatch[1] : $("meta[property=\"og:image\"]").attr("content") || null
    const duration = $(".video-metadata .duration").text().trim() || $("span.metadata").first().text().trim() || "-"
    const uploader = $(".video-metadata .uploader-name a").text().trim() || "XVideos"

    const idExtract = url.match(/\/video[.-]?([a-z0-9]+)/i)
    const id = idExtract ? idExtract[1] : ""

    return {
        id,
        title,
        duration,
        uploader,
        thumb,
        url,
        hls: hlsMatch ? hlsMatch[1] : null,
        mp4High: mp4HighMatch ? mp4HighMatch[1] : null,
        mp4Low: mp4LowMatch ? mp4LowMatch[1] : null,
        downloadUrl: (mp4HighMatch ? mp4HighMatch[1] : null) || (mp4LowMatch ? mp4LowMatch[1] : null) || null
    }
}

/**
 * Download direct video stream to file
 * @param {string} videoUrl
 * @param {string} outputPath
 * @param {object} [options]
 */
export async function downloadVideo(videoUrl, outputPath, { timeoutSec = 240 } = {}) {
    const args = [
        "-s", "-L",
        "--max-redirs", "5",
        ...HEADERS,
        "--max-time", String(timeoutSec),
        "-o", outputPath,
        videoUrl
    ]
    await execFileAsync("curl", args, { timeout: (timeoutSec + 10) * 1000 })
    return fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0
}

export default {
    fetchHtml,
    fetchBuffer,
    search,
    getBest,
    getHome,
    getDetail,
    downloadVideo
}
