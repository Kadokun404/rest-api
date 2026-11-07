import { execFile } from "node:child_process"
import { promisify } from "node:util"
import * as cheerio from "cheerio"
import { decode } from "html-entities"

const execFileAsync = promisify(execFile)
const BASE_URL = "https://xhamster.com"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

const HEADERS = [
    "-H", `User-Agent: ${USER_AGENT}`,
    "-H", "Accept-Language: en-US,en;q=0.9",
    "-H", "Referer: https://xhamster.com/"
]

/**
 * Fetch HTML via curl HTTP/2 with redirect support (-L)
 * @param {string} url
 * @returns {Promise<string>}
 */
export async function fetchHtml(url) {
    const args = ["-s", "-L", "--max-redirs", "5", "--compressed", ...HEADERS, url]
    const { stdout } = await execFileAsync("curl", args, { timeout: 30000 })
    return stdout
}

/**
 * Fetch buffer file/gambar dengan header Referer xHamster
 * @param {string} url
 * @returns {Promise<Buffer|null>}
 */
export async function fetchBuffer(url) {
    if (!url) return null
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": USER_AGENT,
                "Referer": "https://xhamster.com/"
            },
            signal: AbortSignal.timeout(15000)
        })
        if (res.ok) {
            return Buffer.from(await res.arrayBuffer())
        }
    } catch {}

    try {
        const { stdout } = await execFileAsync("curl", [
            "-s", "-L", "--max-redirs", "5",
            "-H", `User-Agent: ${USER_AGENT}`,
            "-H", "Referer: https://xhamster.com/",
            url
        ], { encoding: "buffer", timeout: 20000 })
        return stdout
    } catch {
        return null
    }
}

/**
 * Parsing daftar item video dari HTML pencarian / halaman list
 * @param {string} html
 */
function parseVideoList(html) {
    const $ = cheerio.load(html)
    const items = []

    $(".thumb-list__item.video-thumb").each((_, el) => {
        const $el = $(el)
        const a = $el.find("a[data-role=\"thumb-link\"]").first()
        const rawLink = a.attr("href") || ""
        const rawTitle = $el.find(".video-thumb-info__name").text().trim() || a.attr("aria-label")
        const title = rawTitle ? decode(rawTitle).trim() : null
        const thumb = $el.find("img[data-role=\"thumb-preview-img\"]").attr("src") || $el.find("img").attr("src")
        const duration = $el.find("[data-role=\"video-duration\"]").text().trim() || "-"
        const views = $el.find(".video-thumb-views").text().trim() || "-"
        const previewVideo = a.attr("data-previewvideo-fallback") || a.attr("data-previewvideo") || null

        // Ekstrak slug lengkap dan shortCode dari href
        const slugMatch = rawLink.match(/\/videos\/([^/?#]+)/)
        const slug = slugMatch ? slugMatch[1] : null
        const shortCode = slug ? slug.split("-").pop() : null
        const numericId = $el.attr("data-video-id")

        const id = slug || shortCode || numericId

        if (id && rawLink && title) {
            const link = rawLink.startsWith("http") ? rawLink : `${BASE_URL}${rawLink}`
            items.push({
                id,
                slug: slug || id,
                shortCode,
                title,
                duration,
                views,
                thumb: thumb || null,
                previewVideo,
                link
            })
        }
    })

    return items
}

/**
 * Cari video di xHamster
 * @param {string} query
 * @param {number} [page=1]
 */
export async function search(query, page = 1) {
    const cleanQuery = encodeURIComponent(query.trim().replace(/\s+/g, "+"))
    const url = page > 1 
        ? `${BASE_URL}/search/${cleanQuery}?page=${page}`
        : `${BASE_URL}/search/${cleanQuery}`

    const html = await fetchHtml(url)
    return parseVideoList(html)
}

/**
 * Ambil video terbaru / terkini di xHamster
 * @param {number} [page=1]
 */
export async function getLatest(page = 1) {
    const url = page > 1 ? `${BASE_URL}/newest/${page}` : `${BASE_URL}/newest`
    const html = await fetchHtml(url)
    return parseVideoList(html)
}

/**
 * Ambil detail video xHamster beserta master & H264 stream URL
 * @param {string} idOrUrl
 */
export async function getDetail(idOrUrl) {
    const input = String(idOrUrl).trim().replace(/^view:\s*/i, "")
    let url = input

    if (/^https?:\/\//i.test(input)) {
        url = input
    } else if (input.startsWith("/videos/")) {
        url = `${BASE_URL}${input}`
    } else if (input.includes("-")) {
        // Full slug, e.g. "japanese-adult-story-7305747"
        url = `${BASE_URL}/videos/${input}`
    } else {
        // Short code / numeric id, e.g. "xhBArf7" atau "7305747"
        url = `${BASE_URL}/videos/video-${input}`
    }

    const html = await fetchHtml(url)
    const $ = cheerio.load(html)

    let vm = {}
    let preloadM3u8 = $("link[rel=\"preload\"][href*=\".m3u8\"]").attr("href") || null

    // Fallback: cari URL m3u8 langsung di teks HTML jika preload link tidak ada
    if (!preloadM3u8) {
        const regexMatch = html.match(/https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/)
        if (regexMatch) {
            preloadM3u8 = regexMatch[0]
        }
    }

    const initialsMatch = html.match(/window\.initials\s*=\s*(\{.*?\});\s*<\/script>/)
    if (initialsMatch) {
        try {
            const data = JSON.parse(initialsMatch[1])
            vm = data.videoModel || {}
        } catch (e) {
            console.warn("[xhamster] Failed to parse window.initials:", e.message)
        }
    }

    const rawTitle = vm.title || $("meta[property=\"og:title\"]").attr("content") || $("h1").first().text().trim() || "xHamster Video"
    const title = decode(rawTitle).trim()
    const thumb = vm.thumbURL || $("meta[property=\"og:image\"]").attr("content") || null
    const durationSec = vm.duration || 0
    const duration = durationSec ? `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, "0")}` : "-"
    const views = vm.views ? Number(vm.views).toLocaleString("id-ID") : "-"
    const rating = vm.rating?.value ? `${vm.rating.value}%` : "-"
    const uploader = vm.author?.name || vm.channelModel?.name || "xHamster"
    const id = vm.id ? String(vm.id) : (url.match(/-([0-9a-zA-Z]+)$/)?.[1] || "")

    // Master m3u8 playlist H264 (kompatibel penuh dengan WhatsApp video)
    let h264MasterM3u8 = null
    if (preloadM3u8) {
        h264MasterM3u8 = preloadM3u8.replace(/\.av1\.mp4\.m3u8/i, ".h264.mp4.m3u8")
    }

    return {
        id,
        title,
        duration,
        durationSec,
        views,
        rating,
        uploader,
        thumb,
        preloadM3u8,
        h264MasterM3u8,
        url
    }
}

/**
 * Ekstrak daftar kualitas dari master m3u8 xHamster
 * @param {string} masterM3u8Url
 * @returns {Promise<Array<{quality: string, resolution: string, url: string}>>}
 */
export async function getQualities(masterM3u8Url) {
    if (!masterM3u8Url) return []

    const m3u8H264 = masterM3u8Url.replace(/\.av1\.mp4\.m3u8/i, ".h264.mp4.m3u8")
    try {
        const text = await fetchHtml(m3u8H264)
        const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
        const qualities = []

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith("#EXT-X-STREAM-INF:")) {
                const resMatch = lines[i].match(/RESOLUTION=(\d+x\d+)/i)
                const nextLine = lines[i + 1]
                if (nextLine && !nextLine.startsWith("#")) {
                    const qualityMatch = nextLine.match(/^(\d+p)/i)
                    const quality = qualityMatch ? qualityMatch[1] : "auto"
                    const resolution = resMatch ? resMatch[1] : ""
                    const streamUrl = m3u8H264.replace(/_TPL_.*$/i, nextLine)

                    qualities.push({
                        quality,
                        resolution,
                        url: streamUrl
                    })
                }
            }
        }

        return qualities
    } catch {
        return []
    }
}

/**
 * Unduh video stream H264 menggunakan FFmpeg remux ke MP4
 * @param {string} streamUrl URL master atau sub-m3u8
 * @param {string} outputPath Path tujuan file mp4
 * @param {object} [options]
 * @param {number} [options.timeoutSec=180]
 * @param {number} [options.maxDurationSec=0]
 * @returns {Promise<string>}
 */
export async function downloadStream(streamUrl, outputPath, { timeoutSec = 240, maxDurationSec = 0 } = {}) {
    if (!streamUrl) throw new Error("Stream URL tidak valid")

    const args = [
        "-y",
        "-headers", `User-Agent: ${USER_AGENT}\r\nReferer: https://xhamster.com/\r\n`,
        "-i", streamUrl
    ]

    if (maxDurationSec > 0) {
        args.push("-t", String(maxDurationSec))
    }

    // Remux copy stream video H264 & audio AAC (sangat cepat & tanpa re-encode)
    args.push("-c", "copy", "-bsf:a", "aac_adtstoasc", outputPath)

    await execFileAsync("ffmpeg", args, { timeout: timeoutSec * 1000 })
    return outputPath
}

export default {
    BASE_URL,
    search,
    getLatest,
    getDetail,
    getQualities,
    downloadStream,
    fetchBuffer,
    fetchHtml
}
