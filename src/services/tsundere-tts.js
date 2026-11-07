import fs from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import { spawn } from "node:child_process"
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts"

const SESSION_FILE = path.resolve("data/anytospeech-session.json")
const DEFAULT_EMAIL = "kado@sang.ceo"

/**
 * Baca session cookie AnyToSpeech
 */
async function getAnyToSpeechCookie() {
    try {
        if (!existsSync(SESSION_FILE)) return null
        const raw = await fs.readFile(SESSION_FILE, "utf-8")
        const parsed = JSON.parse(raw)
        return parsed.cookie || null
    } catch {
        return null
    }
}

/**
 * Simpan session cookie AnyToSpeech
 */
async function saveAnyToSpeechCookie(cookie) {
    try {
        await fs.mkdir(path.dirname(SESSION_FILE), { recursive: true })
        await fs.writeFile(
            SESSION_FILE,
            JSON.stringify({ email: DEFAULT_EMAIL, cookie, updatedAt: Date.now() }, null, 2)
        )
    } catch (e) {
        console.warn("[tts save session error]", e.message)
    }
}

/**
 * Auto login AnyToSpeech menggunakan email kado@sang.ceo via Ruang.Email
 */
export async function refreshAnyToSpeechSession() {
    console.log("[tts anytospeech] requesting magic link for", DEFAULT_EMAIL)
    try {
        const sendRes = await fetch("https://anytospeech.com/users/auth/magic-link", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
                "Referer": "https://anytospeech.com/users/auth",
                "Origin": "https://anytospeech.com"
            },
            body: JSON.stringify({ email: DEFAULT_EMAIL, returnTo: "/" }),
            signal: AbortSignal.timeout(12000)
        })

        if (!sendRes.ok) {
            console.warn("[tts anytospeech] magic link request failed with status", sendRes.status)
            return null
        }

        // Import ruangemail helper
        const ruangemail = await import("./ruangemail.js")

        // Tunggu email masuk (maks 3 percobaan @ 3 detik)
        let verifyLink = null
        for (let i = 0; i < 3; i++) {
            await new Promise(r => setTimeout(r, 3000))
            const inbox = await ruangemail.getMessages({ limit: 5 })
            if (inbox?.success && Array.isArray(inbox.messages)) {
                const targetMsg = inbox.messages.find(m =>
                    m.subject?.toLowerCase().includes("anytospeech") ||
                    m.from?.toLowerCase().includes("anytospeech")
                )
                if (targetMsg) {
                    const match = (targetMsg.links || []).find(l => l.includes("magic-link/verify"))
                    if (match) {
                        verifyLink = match
                        break
                    }
                    const textMatch = targetMsg.body_text?.match(/https:\/\/anytospeech\.com\/users\/auth\/magic-link\/verify\?[^\s"'>]+/i)
                    if (textMatch) {
                        verifyLink = textMatch[0]
                        break
                    }
                }
            }
        }

        if (!verifyLink) {
            console.warn("[tts anytospeech] verify link not found in inbox")
            return null
        }

        console.log("[tts anytospeech] verifying link:", verifyLink)
        const verifyRes = await fetch(verifyLink, {
            redirect: "manual",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
            },
            signal: AbortSignal.timeout(12000)
        })

        const setCookies = verifyRes.headers.getSetCookie ? verifyRes.headers.getSetCookie() : [verifyRes.headers.get("set-cookie")]
        const sidCookie = setCookies.find(c => c && c.includes("connect.sid"))
        if (sidCookie) {
            const sidPart = sidCookie.split(";")[0]
            const finalCookie = `locale=en; ${sidPart}`
            await saveAnyToSpeechCookie(finalCookie)
            console.log("[tts anytospeech] session cookie refreshed successfully")
            return finalCookie
        }
    } catch (e) {
        console.warn("[tts anytospeech auto-login error]", e.message)
    }
    return null
}

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
export function splitTextIntoChunks(text, maxLen = 220) {
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
 * Generate audio MP3 per chunk menggunakan AnyToSpeech (Anime Tsundere / Shy)
 */
async function fetchAnyToSpeechChunk(text, model = "anime-girl-tsundere") {
    let cookie = await getAnyToSpeechCookie()

    async function makeRequest(c) {
        const res = await fetch("https://anytospeech.com/api/tools/famous-voice", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(c ? { "Cookie": c } : {}),
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
                "Referer": `https://anytospeech.com/ai-voice-generator/${model}`,
                "Origin": "https://anytospeech.com"
            },
            body: JSON.stringify({ slug: model, text }),
            signal: AbortSignal.timeout(15000)
        })
        return res
    }

    let response = await makeRequest(cookie)

    // Jika butuh login / 401, coba refresh session otomatis sekali
    if (response.status === 401 || !response.ok) {
        const errorText = await response.text().catch(() => "")
        if (response.status === 401 || errorText.includes("login_required")) {
            console.log("[anytospeech] session expired, attempting auto refresh...")
            const newCookie = await refreshAnyToSpeechSession()
            if (newCookie) {
                cookie = newCookie
                response = await makeRequest(cookie)
            } else {
                throw new Error(`AnyToSpeech HTTP ${response.status}: ${errorText}`)
            }
        } else {
            throw new Error(`AnyToSpeech HTTP ${response.status}: ${errorText}`)
        }
    }

    const json = await response.json()
    if (!json.audioUrl) {
        throw new Error(json.message || "Gagal mendapatkan audioUrl dari AnyToSpeech")
    }

    const audioUrl = json.audioUrl.startsWith("http")
        ? json.audioUrl
        : `https://anytospeech.com${json.audioUrl}`

    const audioRes = await fetch(audioUrl, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
            ...(cookie ? { "Cookie": cookie } : {})
        },
        signal: AbortSignal.timeout(15000)
    })

    if (!audioRes.ok) throw new Error(`Download audio fail HTTP ${audioRes.status}`)
    return Buffer.from(await audioRes.arrayBuffer())
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
 * Fallback jika AnyToSpeech gagal: Microsoft Edge Neural Voice
 */
async function fetchEdgeVoiceChunk(text, model = "anime-girl-tsundere") {
    const isJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text)
    const voice = isJapanese ? "ja-JP-NanamiNeural" : "id-ID-GadisNeural"

    const isShy = model.includes("shy")
    const pitch = isShy ? "+16%" : "+24%"
    const rate = isShy ? "-4%" : "+6%"

    const tts = new MsEdgeTTS()
    try {
        await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
        const { audioStream } = tts.toStream(text, { pitch, rate })
        return await streamToBuffer(audioStream)
    } finally {
        try { tts.close() } catch {}
    }
}

/**
 * Fallback tingkat akhir: Google Translate TTS
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
 * Ambil audio chunk (AnyToSpeech -> Edge TTS -> Google TTS)
 */
async function fetchSingleChunkAudio(text, model = "anime-girl-tsundere") {
    try {
        return await fetchAnyToSpeechChunk(text, model)
    } catch (e) {
        console.warn(`[anytospeech fail: ${e.message}, fallback to edge tts]`)
        try {
            return await fetchEdgeVoiceChunk(text, model)
        } catch (edgeErr) {
            console.warn(`[edge tts fail: ${edgeErr.message}, fallback to google]`)
            return await fetchGoogleVoiceChunk(text)
        }
    }
}

/**
 * Gabungkan buffer MP3 dan konversi ke WhatsApp Voice Note (.opus) dengan sentuhan anime formant
 */
async function mergeBuffersToOpusVn(mp3Buffers, destPath) {
    await fs.mkdir(path.dirname(destPath), { recursive: true })

    const animeFilter = "asetrate=24000*1.08,aresample=24000,atempo=1/1.02,equalizer=f=3000:t=q:w=1.2:g=2.5"

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
 * Generate Anime Voice Note tanpa batas karakter & bebas timeout
 * @param {string} text teks percakapan
 * @param {string} [model="anime-girl-tsundere"] "anime-girl-tsundere" atau "anime-girl-shy"
 * @param {string} [outPath] lokasi output file .opus
 * @returns {Promise<string>} path file opus
 */
export async function generateAnimeVoice(text, model = "anime-girl-tsundere", outPath = null) {
    const clean = cleanTextForTts(text)
    if (!clean) throw new Error("Teks untuk suara kosong")

    const chunks = splitTextIntoChunks(clean, 220)
    if (!chunks.length) throw new Error("Teks tidak dapat diproses")

    const dest = outPath || path.join(process.cwd(), "temp", "ara-vn", `ara-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.opus`)

    // Generate audio untuk setiap chunk secara berurutan
    const audioBuffers = []
    for (const chunk of chunks) {
        const buf = await fetchSingleChunkAudio(chunk, model)
        audioBuffers.push(buf)
    }

    return await mergeBuffersToOpusVn(audioBuffers, dest)
}

export const generateTsundereVoice = (text, outPath) => generateAnimeVoice(text, "anime-girl-tsundere", outPath)
export const generateShyVoice = (text, outPath) => generateAnimeVoice(text, "anime-girl-shy", outPath)

export default {
    cleanTextForTts,
    splitTextIntoChunks,
    refreshAnyToSpeechSession,
    generateAnimeVoice,
    generateTsundereVoice,
    generateShyVoice
}