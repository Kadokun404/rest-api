/**
 * Helper / Scrape: HentaiMama Scraper & Video Downloader (hentaimama.js)
 * Author: Arashi & Kadokun
 * 
 * Scraper untuk https://hentaimama.io (CMS DooPlay)
 * Fitur:
 * - Search anime series & movies
 * - Ambil detail series & daftar episode
 * - Ambil detail episode & bypass player contents via AJAX
 * - Ekstraksi direct link MP4 dari JWPlayer embed
 */

import axios from "axios"
import * as cheerio from "cheerio"
import { decode } from "html-entities"

const BASE_URL = "https://hentaimama.io"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

const http = axios.create({
    headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,id;q=0.8"
    },
    timeout: 25000
})

/**
 * Ekstrak slug dari URL hentaimama
 * @param {string} input 
 * @returns {string}
 */
export function extractSlug(input) {
    let str = String(input || "").trim()
    str = str.replace(/\/+$/, "")
    const match = str.match(/(?:episodes|tvshows)\/([^/?#]+)/i)
    if (match?.[1]) return match[1]
    return str.split("/").filter(Boolean).pop() || str
}

/**
 * Cari anime series di HentaiMama
 * @param {string} query 
 * @returns {Promise<Array<{title: string, slug: string, link: string, thumb: string, rating: string, year: string}>>}
 */
export async function searchHentaimama(query) {
    const q = String(query || "").trim()
    if (!q) throw new TypeError("Query pencarian tidak boleh kosong")

    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(q)}`
    const { data } = await http.get(searchUrl)
    const $ = cheerio.load(data)

    const results = []
    const seen = new Set()

    $("article.series-card, article.item").each((_, el) => {
        const item = $(el)
        const a = item.find("a.sc-poster, .data h3 a, a").first()
        const link = a.attr("href")
        if (!link || (!link.includes("/tvshows/") && !link.includes("/episodes/"))) return

        const slug = extractSlug(link)
        if (!slug || seen.has(slug)) return
        seen.add(slug)

        const rawTitle = item.find("img").attr("alt") || item.find(".data h3 a").text().trim() || slug
        const title = decode(rawTitle).trim()
        const thumb = item.find("img").attr("src") || item.find("img").attr("data-src") || null
        const rating = item.find(".sc-btn-rating, .rating").text().replace(/[^0-9.]/g, "").trim() || "-"
        const year = item.find(".card-tags span, .meta .date").first().text().trim() || "-"

        results.push({
            title,
            slug,
            link,
            thumb,
            rating,
            year
        })
    })

    return results
}

/**
 * Ambil detail series dan daftar episode dari HentaiMama
 * @param {string} slugOrUrl 
 * @returns {Promise<{title: string, slug: string, synopsis: string, thumb: string, rating: string, genres: string[], episodes: Array<{title: string, episodeNumber: number, slug: string, link: string, thumb: string, releaseDate: string, synopsis: string}>, url: string}>}
 */
export async function getSeriesDetail(slugOrUrl) {
    const slug = extractSlug(slugOrUrl)
    const pageUrl = slugOrUrl.startsWith("http") ? slugOrUrl : `${BASE_URL}/tvshows/${slug}/`

    const { data } = await http.get(pageUrl)
    const $ = cheerio.load(data)

    const rawTitle = $("h1.entry-title, .data h1, h1").first().text().trim() || slug
    const title = decode(rawTitle).trim()
    const thumb = $(".poster img").attr("src") || $("meta[property='og:image']").attr("content") || null
    const synopsis = decode($(".wp-content p, #info .wp-content").text().trim()) || ""
    const rating = $(".rating-number, .rating").first().text().replace(/[^0-9.]/g, "").trim() || "-"

    const genres = []
    $(".sgeneros a, .genres a").each((_, el) => {
        const g = $(el).text().trim()
        if (g && !genres.includes(g)) genres.push(g)
    })

    // Ekstrak list episodes
    const episodes = []
    const seenEp = new Set()

    $("a[href*='/episodes/']").each((_, el) => {
        const link = $(el).attr("href")
        if (!link || seenEp.has(link)) return
        seenEp.add(link)

        const epSlug = extractSlug(link)
        const epNumMatch = link.match(/episode-(\d+)/i) || $(el).text().match(/EP\s*(\d+)/i)
        const epNum = epNumMatch ? parseInt(epNumMatch[1], 10) : episodes.length + 1

        const epTitle = decode($(el).find(".dt-se-title, b").text().trim()) || `Episode ${epNum}`
        const epThumb = $(el).find("img").attr("src") || thumb
        const releaseDate = $(el).find(".dt-se-date, .date").text().trim() || "-"
        const epSynopsis = decode($(el).find(".dt-se-desc").text().trim()) || ""

        episodes.push({
            title: epTitle,
            episodeNumber: epNum,
            slug: epSlug,
            link,
            thumb: epThumb,
            releaseDate,
            synopsis: epSynopsis
        })
    })

    // Urutkan episode berdasarkan nomor
    episodes.sort((a, b) => a.episodeNumber - b.episodeNumber)

    return {
        title,
        slug,
        synopsis,
        thumb,
        rating,
        genres,
        episodes,
        url: pageUrl
    }
}

/**
 * Ambil detail episode dan direct video MP4 dari HentaiMama
 * @param {string} slugOrUrl 
 * @returns {Promise<{title: string, slug: string, seriesTitle: string, episodeNumber: number, thumb: string, synopsis: string, directMp4: string, embedUrl: string, url: string}>}
 */
export async function getEpisodeDetail(slugOrUrl) {
    const slug = extractSlug(slugOrUrl)
    const pageUrl = slugOrUrl.startsWith("http") ? slugOrUrl : `${BASE_URL}/episodes/${slug}/`

    const { data: pageHtml } = await http.get(pageUrl)
    const $ = cheerio.load(pageHtml)

    const rawTitle = $("h1.entry-title, .ep-title, h1").first().text().trim() || $("meta[property='og:title']").attr("content") || slug
    const title = decode(rawTitle).replace(/\s*–\s*Watch Online.*/i, "").trim()
    const thumb = $("meta[property='og:image']").attr("content") || $(".poster img").attr("src") || null
    const synopsis = decode($("meta[property='og:description']").attr("content") || $(".dt-se-desc").first().text().trim())

    // Ambil nomor episode
    const epMatch = slug.match(/episode-(\d+)/i) || title.match(/Episode\s*(\d+)/i)
    const episodeNumber = epMatch ? parseInt(epMatch[1], 10) : 1

    // Judul Series
    const seriesTitle = title.replace(/\s*Episode\s*\d+.*/i, "").trim()

    // Ekstrak post ID untuk query AJAX player
    const postId = pageHtml.match(/"episode":"(\d+)"/)?.[1]
                || pageHtml.match(/name="idpost" value="(\d+)"/)?.[1]
                || pageHtml.match(/hentaimama\.io\/\?p=(\d+)/)?.[1]

    if (!postId) {
        throw new Error("Gagal mengekstrak ID post episode dari halaman HentaiMama")
    }

    // Call AJAX endpoint untuk mendapatkan iframe embed
    const ajaxRes = await http.post(
        `${BASE_URL}/wp-admin/admin-ajax.php`,
        new URLSearchParams({ action: "get_player_contents", a: postId, i: "1" }).toString(),
        {
            headers: {
                "Referer": pageUrl,
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "X-Requested-With": "XMLHttpRequest"
            }
        }
    )

    const rawIframe = Array.isArray(ajaxRes.data) ? ajaxRes.data[0] : String(ajaxRes.data || "")
    const embedSrcMatch = rawIframe.match(/src="([^"]+)"/) || rawIframe.match(/src='([^']+)'/)
    let embedUrl = embedSrcMatch ? embedSrcMatch[1].replace(/&#038;/g, "&") : null

    if (!embedUrl) {
        throw new Error("Gagal mengekstrak link embed video dari server HentaiMama")
    }

    if (embedUrl.startsWith("//")) {
        embedUrl = `https:${embedUrl}`
    }

    // Fetch embed page untuk mendapatkan direct link .mp4 dari konfigurasi JWPlayer
    const { data: embedHtml } = await http.get(embedUrl, {
        headers: {
            "Referer": pageUrl
        }
    })

    const directMp4Match = embedHtml.match(/"file":\s*"([^"]+)"/)
    let directMp4 = directMp4Match ? directMp4Match[1].replace(/\\/g, "") : null

    if (!directMp4) {
        // Fallback regex video mp4 lain di halaman embed
        const fallbackMatch = embedHtml.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/)
        if (fallbackMatch) directMp4 = fallbackMatch[0]
    }

    return {
        title,
        slug,
        seriesTitle,
        episodeNumber,
        thumb,
        synopsis,
        directMp4,
        embedUrl,
        url: pageUrl
    }
}

export default {
    searchHentaimama,
    getSeriesDetail,
    getEpisodeDetail,
    extractSlug
}
