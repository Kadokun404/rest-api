import { execFile } from "node:child_process"
import { promisify } from "node:util"
import * as cheerio from "cheerio"
import { decode } from "html-entities"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"

const execFileAsync = promisify(execFile)
const BASE_URL = "https://www.pornhub.com"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

const COOKIE_PATH = path.join(os.tmpdir(), "ph_session_cookies.txt")

const HEADERS = [
    "-H", `User-Agent: ${USER_AGENT}`,
    "-H", "Accept-Language: en-US,en;q=0.9",
    "-H", "Referer: https://www.pornhub.com/"
]

/**
 * Fetch HTML via curl HTTP/2 with cookie jar support
 * @param {string} url
 * @returns {Promise<string>}
 */
export async function fetchHtml(url) {
    const args = [
        "-s", "-L",
        "--cookie", COOKIE_PATH,
        "--cookie-jar", COOKIE_PATH,
        "--max-redirs", "5",
        "--compressed",
        ...HEADERS,
        url
    ]
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
    const items = []
    const blocks = html.match(/<li[^>]*class="[^"]*videoBox[^"]*"[^>]*>([\s\S]*?)<\/li>/gi) || []

    for (const b of blocks) {
        const vkeyMatch = b.match(/_vkey="([^"]+)"/i) || b.match(/viewkey=([a-z0-9]+)/i)
        const titleMatch = b.match(/title="([^"]+)"/i)
        const durationMatch = b.match(/<var class="duration">([^<]+)<\/var>/i)
        const viewsMatch = b.match(/<span class="views"><var>([^<]+)<\/var>/i)
        const thumbMatch = b.match(/data-image="([^"]+)"/i) || b.match(/src="([^"]+)"/i)

        const vkey = vkeyMatch ? vkeyMatch[1] : null
        const title = titleMatch ? decode(titleMatch[1]).trim() : null

        if (vkey && title) {
            items.push({
                id: vkey,
                vkey,
                title,
                duration: durationMatch ? durationMatch[1].trim() : "-",
                views: viewsMatch ? viewsMatch[1].trim() : "-",
                thumb: thumbMatch ? thumbMatch[1].replace(/&amp;/g, "&") : null,
                link: `${BASE_URL}/view_video.php?viewkey=${vkey}`
            })
        }
    }

    return items
}

/**
 * Search videos by query
 * @param {string} query
 * @param {number} [page=1]
 */
export async function search(query, page = 1) {
    const cleanQuery = encodeURIComponent(query.trim().replace(/\s+/g, "+"))
    const url = page > 1 
        ? `${BASE_URL}/video/search?search=${cleanQuery}&page=${page}`
        : `${BASE_URL}/video/search?search=${cleanQuery}`
    const html = await fetchHtml(url)
    return parseListing(html)
}

/**
 * Get trending / popular videos
 * @param {number} [page=1]
 */
export async function getTrending(page = 1) {
    const url = page > 1 ? `${BASE_URL}/video?page=${page}` : `${BASE_URL}/video`
    const html = await fetchHtml(url)
    return parseListing(html)
}

/**
 * Get video details and direct MP4 streams
 * @param {string} idOrUrl
 */
export async function getDetail(idOrUrl) {
    const input = String(idOrUrl).trim()
    let vkey = input

    if (/viewkey=([a-z0-9]+)/i.test(input)) {
        vkey = input.match(/viewkey=([a-z0-9]+)/i)[1]
    } else if (input.startsWith("ph") || /^[a-z0-9]{10,20}$/i.test(input)) {
        vkey = input
    }

    const pageUrl = `${BASE_URL}/view_video.php?viewkey=${vkey}`
    const html = await fetchHtml(pageUrl)

    const flashvarsMatch = html.match(/var flashvars_\d+\s*=\s*(\{[\s\S]*?\});/)
    if (!flashvarsMatch) {
        throw new Error("Unable to parse player data or video is private/unavailable.")
    }

    let data = {}
    try {
        data = JSON.parse(flashvarsMatch[1])
    } catch {
        throw new Error("Failed to parse video configuration.")
    }

    const title = data.video_title ? decode(data.video_title).trim() : "Pornhub Video"
    const thumb = data.image_url || null
    const durationSec = data.video_duration || 0
    const m = Math.floor(durationSec / 60)
    const s = durationSec % 60
    const duration = durationSec ? `${m}:${String(s).padStart(2, "0")}` : "-"
    const uploader = data.nextVideo?.channelTitle || data.nextVideo?.uploaderLink?.match(/title="([^"]+)"/)?.[1] || "Pornhub"

    // Extract get_media URL for direct MP4 streams
    const mediaDefs = data.mediaDefinitions || []
    let getMediaUrl = null
    for (const def of mediaDefs) {
        if (def.videoUrl && String(def.videoUrl).includes("get_media")) {
            getMediaUrl = def.videoUrl
            break
        }
    }

    let streams = []
    if (getMediaUrl) {
        try {
            const cleanMediaUrl = getMediaUrl.replace(/\\\//g, "/")
            const { stdout } = await execFileAsync("curl", [
                "-s", "-L",
                "--cookie", COOKIE_PATH,
                "-H", `User-Agent: ${USER_AGENT}`,
                "-H", `Referer: ${pageUrl}`,
                cleanMediaUrl
            ], { timeout: 15000 })

            const streamData = JSON.parse(stdout)
            if (Array.isArray(streamData)) {
                streams = streamData.map(item => ({
                    quality: item.quality || `${item.height}p`,
                    height: item.height,
                    format: item.format,
                    videoUrl: item.videoUrl ? item.videoUrl.replace(/\\\//g, "/") : null
                })).filter(s => s.videoUrl)
            }
        } catch (err) {
            console.warn("[pornhub] Failed to fetch get_media streams:", err.message)
        }
    }

    // Pick optimal stream (prefer 480p or 720p or highest available)
    let bestStream = null
    if (streams.length > 0) {
        // Find 480p or 720p first for WhatsApp compatibility
        bestStream = streams.find(s => s.quality === "480p" || s.height === 480) 
            || streams.find(s => s.quality === "720p" || s.height === 720)
            || streams.find(s => s.quality === "240p" || s.height === 240)
            || streams[0]
    }

    return {
        id: vkey,
        vkey,
        title,
        duration,
        durationSec,
        uploader,
        thumb,
        url: pageUrl,
        streams,
        downloadUrl: bestStream ? bestStream.videoUrl : null
    }
}

/**
 * Download direct MP4 video stream
 * @param {string} videoUrl
 * @param {string} outputPath
 * @param {object} [options]
 */
export async function downloadVideo(videoUrl, outputPath, { timeoutSec = 240 } = {}) {
    if (!videoUrl) throw new Error("Invalid video URL")

    const args = [
        "-s", "-L",
        "--cookie", COOKIE_PATH,
        "-H", `User-Agent: ${USER_AGENT}`,
        "-H", "Referer: https://www.pornhub.com/",
        "-o", outputPath,
        videoUrl
    ]

    await execFileAsync("curl", args, { timeout: timeoutSec * 1000 })

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
        throw new Error("Download failed: empty output file")
    }

    return outputPath
}

export default {
    BASE_URL,
    search,
    getTrending,
    getDetail,
    downloadVideo,
    fetchBuffer,
    fetchHtml
}
