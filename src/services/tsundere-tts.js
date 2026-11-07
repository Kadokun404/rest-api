import fs from "node:fs/promises"
import path from "node:path"
import { spawn } from "node:child_process"
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts"

/**
 * Filter karakter markdown & url agar audio bersih
 */
export function cleanTextForTts(text) {
    return String(text || "")
        .replace(/[*_~`#|]/g, " ")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/[[\]()]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
}

/**
 * Pecah teks panjang jadi chunks berdasarkan tanda baca kalimat
 * Mendukung teks tanpa batas karakter (unlimited)
 */
export function splitTextIntoChunks(text, maxLen = 280) {
    const clean = text.replace(/\s+/g, " ").trim()
    if (!clean) return []
    if (clean.length <= maxLen) return [clean]

    const sentences = clean.split(/(?<=[.!?,\n])/)
    const chunks = []
    let current = ""

    for (const s of sentences) {
        if ((current + s).length <= maxLen) {
            current += s
        } else {
            if (current.trim()) chunks.push(current.trim())
            if (s.length > maxLen) {
                const words = s.split(" ")
                let sub = ""
                for (const w of words) {
                    if ((sub + " " + w).length <= maxLen) {
                        sub = sub ? sub + " " + w : w
                    } else {
                        if (sub.trim()) chunks.push(sub.trim())
                        sub = w
                    }
                }
                current = sub
            } else {
                current = s
            }
        }
    }
    if (current.trim()) chunks.push(current.trim())
    return chunks
}

/**
 * Ubah Readable Stream ke Buffer
 */
function streamToBuffer(readable) {
    const chunks = []
    return new Promise((resolve, reject) => {
        readable.on("data", c => chunks.push(c))
        readable.on("end", () => resolve(Buffer.concat(chunks)))
        readable.on("error", reject)
    })
}

/**
 * Generate audio MP3 per chunk menggunakan Microsoft Edge Neural Voice
 */
async function fetchEdgeVoiceChunk(text) {
    const isJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text)
    const voice = isJapanese ? "ja-JP-NanamiNeural" : "id-ID-GadisNeural"

    const tts = new MsEdgeTTS()
    try {
        await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
        const { audioStream } = tts.toStream(text, { pitch: "+24%", rate: "+6%" })
        return await streamToBuffer(audioStream)
    } finally {
        try { tts.close() } catch {}
    }
}

/**
 * Fallback jika Edge TTS bermasalah: Google Translate TTS
 */
async function fetchGoogleVoiceChunk(text) {
    const isJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text)
    const lang = isJapanese ? "ja" : "id"
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(text)}`
    const res = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
        },
        signal: AbortSignal.timeout(10000)
    })
    if (!res.ok) throw new Error(`Google TTS HTTP ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
}

/**
 * Ambil audio chunk (Edge TTS dengan fallback ke Google TTS)
 */
async function fetchSingleChunkAudio(text) {
    try {
        return await fetchEdgeVoiceChunk(text)
    } catch (e) {
        console.warn("[tts edge fail, fallback to google]", e.message)
        return await fetchGoogleVoiceChunk(text)
    }
}

/**
 * Gabungkan buffer MP3 dan konversi ke WhatsApp Voice Note (.opus) dengan sentuhan anime formant
 */
async function mergeBuffersToOpusVn(mp3Buffers, destPath) {
    await fs.mkdir(path.dirname(destPath), { recursive: true })

    const animeFilter = "asetrate=24000*1.12,aresample=24000,atempo=1/1.03,equalizer=f=3200:t=q:w=1.2:g=3.5"

    // Jika cuma 1 chunk
    if (mp3Buffers.length === 1) {
        return await new Promise((resolve, reject) => {
            const p = spawn("ffmpeg", [
                "-y", "-hide_banner", "-loglevel", "error",
                "-i", "pipe:0",
                "-af", animeFilter,
                "-vn", "-c:a", "libopus", "-b:a", "64k", "-f", "ogg", destPath
            ])
            p.stdin.on("error", () => {})
            p.on("error", reject)
            p.on("close", code => code === 0 ? resolve(destPath) : reject(new Error(`ffmpeg exit ${code}`)))
            p.stdin.end(mp3Buffers[0])
        })
    }

    // Jika lebih dari 1 chunk (teks panjang)
    const tmpDir = path.join(path.dirname(destPath), `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
    await fs.mkdir(tmpDir, { recursive: true })
    const fileListPath = path.join(tmpDir, "files.txt")
    let fileListContent = ""

    for (let i = 0; i < mp3Buffers.length; i++) {
        const chunkPath = path.join(tmpDir, `chunk-${i}.mp3`)
        await fs.writeFile(chunkPath, mp3Buffers[i])
        fileListContent += `file '${chunkPath}'\n`
    }
    await fs.writeFile(fileListPath, fileListContent)

    return await new Promise((resolve, reject) => {
        const p = spawn("ffmpeg", [
            "-y", "-hide_banner", "-loglevel", "error",
            "-f", "concat", "-safe", "0", "-i", fileListPath,
            "-af", animeFilter,
            "-vn", "-c:a", "libopus", "-b:a", "64k", "-f", "ogg", destPath
        ])
        p.on("error", reject)
        p.on("close", async code => {
            try { await fs.rm(tmpDir, { recursive: true, force: true }) } catch {}
            code === 0 ? resolve(destPath) : reject(new Error(`ffmpeg concat exit ${code}`))
        })
    })
}

/**
 * Generate Anime Tsundere Voice Note tanpa batas karakter & bebas timeout
 * @param {string} text teks percakapan
 * @param {string} [outPath] lokasi output file .opus
 * @returns {Promise<string>} path file opus
 */
export async function generateAnimeVoice(text, outPath) {
    const clean = cleanTextForTts(text)
    if (!clean) throw new Error("Teks untuk suara kosong")

    const chunks = splitTextIntoChunks(clean, 280)
    if (!chunks.length) throw new Error("Teks tidak dapat diproses")

    const dest = outPath || path.join(process.cwd(), "temp", "ara-vn", `ara-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.opus`)

    // Generate audio untuk setiap chunk secara berurutan
    const audioBuffers = []
    for (const chunk of chunks) {
        const buf = await fetchSingleChunkAudio(chunk)
        audioBuffers.push(buf)
    }

    return await mergeBuffersToOpusVn(audioBuffers, dest)
}

export const generateTsundereVoice = (text, outPath) => generateAnimeVoice(text, outPath)

export default {
    cleanTextForTts,
    splitTextIntoChunks,
    generateAnimeVoice,
    generateTsundereVoice
}
