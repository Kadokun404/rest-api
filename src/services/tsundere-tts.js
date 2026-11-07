import fs from "node:fs/promises"
import path from "node:path"
import { spawn } from "node:child_process"

/**
 * Filter karakter markdown agar audio bersih
 */
function cleanTextForTts(text) {
    return String(text || "")
        .replace(/[*_~`#|]/g, " ")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/[[\]()]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
}

/**
 * Pure Scraper: AnyToSpeech.com (Model: anime-girl-shy)
 * Menggunakan dynamic random client IP header agar tidak terkena limit 5x
 */
async function fetchAnyToSpeechVoice(text, slug = "anime-girl-shy") {
    const url = "https://anytospeech.com/api/tools/famous-voice"
    const randomIp = `${Math.floor(Math.random() * 200) + 20}.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
            "Origin": "https://anytospeech.com",
            "Referer": `https://anytospeech.com/ai-voice-generator/${slug}`,
            "X-Forwarded-For": randomIp,
            "Client-IP": randomIp
        },
        body: JSON.stringify({ slug, text: text.slice(0, 450) }),
        signal: AbortSignal.timeout(15000)
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.error) {
        throw new Error(data.message || data.error || `HTTP ${res.status}`)
    }

    let audioUrl = data.audioUrl || data.url || data.audio
    if (!audioUrl) throw new Error("Audio URL tidak ditemukan di respon anytospeech")

    if (audioUrl.startsWith("/")) {
        audioUrl = `https://anytospeech.com${audioUrl}`
    }

    const audioRes = await fetch(audioUrl, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
            "Referer": `https://anytospeech.com/ai-voice-generator/${slug}`
        }
    })
    if (!audioRes.ok) throw new Error(`Gagal download audio anytospeech: ${audioRes.status}`)
    return Buffer.from(await audioRes.arrayBuffer())
}

/**
 * Konversi buffer MP3 ke WhatsApp Voice Note (.opus) menggunakan ffmpeg
 */
async function bufferToOpusVn(mp3Buffer, destPath) {
    await fs.mkdir(path.dirname(destPath), { recursive: true })
    return await new Promise((resolve, reject) => {
        const p = spawn("ffmpeg", [
            "-y", "-hide_banner", "-loglevel", "error",
            "-i", "pipe:0", "-vn", "-c:a", "libopus", "-b:a", "64k", "-f", "ogg", destPath
        ])
        p.stdin.on("error", () => {})
        p.on("error", reject)
        p.on("close", code => code === 0 ? resolve(destPath) : reject(new Error(`ffmpeg exit ${code}`)))
        p.stdin.end(mp3Buffer)
    })
}

/**
 * Generate Anime Girl Shy Voice Note murni dari AnyToSpeech tanpa fallback
 * @param {string} text teks percakapan
 * @param {string} [outPath] lokasi output file .opus
 * @returns {Promise<string>} path file opus
 */
export async function generateAnimeVoice(text, outPath) {
    const clean = cleanTextForTts(text)
    if (!clean) throw new Error("Teks untuk suara kosong")

    const dest = outPath || path.join(process.cwd(), "temp", "ara-vn", `ara-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.opus`)

    // MURNI DARI ANYTOSPEECH SAJA
    const audioBuf = await fetchAnyToSpeechVoice(clean, "anime-girl-shy")
    return await bufferToOpusVn(audioBuf, dest)
}

export const generateTsundereVoice = (text, outPath) => generateAnimeVoice(text, outPath)

export default {
    generateAnimeVoice,
    generateTsundereVoice
}
