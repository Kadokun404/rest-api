export const API_URL = "https://spinnerportugues.com/apis/api_youtube_transcript.php"

const YOUTUBE_REGEXES = [
    /(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/i,
    /(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
    /(?:www\.)?(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
]

export function extractYouTubeId(input) {
    const str = String(input || "").trim()
    if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str
    for (const regex of YOUTUBE_REGEXES) {
        const match = str.match(regex)
        if (match?.[1]) return match[1]
    }
    return null
}

export async function resolveYouTubeId(queryOrUrl) {
    const directId = extractYouTubeId(queryOrUrl)
    if (directId) return directId

    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(queryOrUrl)}`, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) throw new Error(`Pencarian YouTube gagal: HTTP ${res.status}`)

    const html = await res.text()
    const match = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/)
    if (!match?.[1]) throw new Error(`Video tidak ditemukan untuk kata kunci: "${queryOrUrl}"`)
    return match[1]
}

/**
 * Transkrip video YouTube ke teks menggunakan API TranscribeTube
 * @param {string} queryOrUrl - URL YouTube atau judul video untuk dicari
 * @returns {Promise<{videoId: string, videoUrl: string, title: string, transcript: string, words: number, characters: number}>}
 */
export async function transcript(queryOrUrl) {
    if (!queryOrUrl || typeof queryOrUrl !== "string" || !queryOrUrl.trim()) {
        throw new TypeError("URL atau judul video YouTube wajib diisi")
    }

    const videoId = await resolveYouTubeId(queryOrUrl)
    const normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`

    const [title, apiRes] = await Promise.all([
        fetch(`https://www.youtube.com/oembed?url=${normalizedUrl}&format=json`, {
            signal: AbortSignal.timeout(10000),
        })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => d?.title || null)
            .catch(() => null),
        fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "okhttp/4.12.0",
            },
            body: JSON.stringify({ url: normalizedUrl }),
            signal: AbortSignal.timeout(45000),
        }),
    ])

    if (!apiRes.ok) throw new Error(`Gagal menghubungi server Transcribe: HTTP ${apiRes.status}`)

    const data = await apiRes.json()
    if (data.status !== "success" || !data.transcription) {
        throw new Error(data.transcription || "Transkrip tidak tersedia untuk video ini (mungkin video tidak memiliki subtitle/caption).")
    }

    if (data.transcription.startsWith("Erro:")) {
        throw new Error(data.transcription.replace(/\s+/g, " ").trim())
    }

    const text = data.transcription.trim()

    return {
        videoId,
        videoUrl: normalizedUrl,
        title: title || `YouTube Video ${videoId}`,
        transcript: text,
        words: text.split(/\s+/).filter(Boolean).length,
        characters: text.length,
    }
}

export default transcript
