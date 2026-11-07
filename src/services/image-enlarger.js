import crypto from "node:crypto"
import fs from "node:fs"

const LOGIN_HASH = "ab5d684a5cac66c6a7c902dda743fb642827b01b8bd4d9514d46834e4c425ff2"
const API_BASE = "https://www.imageenlarger.app/api"

/**
 * Generate guest token via device ID spoofing (Bypass Limit)
 */
async function getToken() {
    const deviceId = crypto.randomBytes(8).toString("hex")
    const res = await fetch(`${API_BASE}/v2/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "hash": LOGIN_HASH,
            "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7)"
        },
        body: JSON.stringify({
            device_name: "Pixel 7",
            id: deviceId,
            referral: null
        }),
        signal: AbortSignal.timeout(20000)
    })

    if (!res.ok) {
        throw new Error(`Login guest failed with HTTP ${res.status}`)
    }

    const json = await res.json()
    if (!json?.success || !json?.data?.token) {
        throw new Error("Failed to obtain auth token")
    }

    return json.data.token
}

/**
 * Convert various image inputs to Buffer
 */
async function resolveImageBuffer(input) {
    if (Buffer.isBuffer(input) || input instanceof Uint8Array) {
        return Buffer.from(input)
    }
    if (typeof input === "string") {
        if (input.startsWith("http://") || input.startsWith("https://")) {
            const res = await fetch(input, {
                headers: { "User-Agent": "Mozilla/5.0" },
                signal: AbortSignal.timeout(30000)
            })
            if (!res.ok) throw new Error(`Failed to fetch image URL: HTTP ${res.status}`)
            const ab = await res.arrayBuffer()
            return Buffer.from(ab)
        }
        if (input.startsWith("data:")) {
            const comma = input.indexOf(",")
            return Buffer.from(input.slice(comma + 1), "base64")
        }
        if (fs.existsSync(input)) {
            return await fs.promises.readFile(input)
        }
    }
    throw new Error("Unsupported image input. Pass a URL, local file path, Buffer, or data URI.")
}

/**
 * Main process function
 * @param {Buffer|string} imageSource
 * @param {'Enlarger'|'Enhancer'|'Restore'} type
 * @param {object} config
 */
export async function processImage(imageSource, type, config = {}) {
    const [token, imageBuffer] = await Promise.all([
        getToken(),
        resolveImageBuffer(imageSource)
    ])

    const formData = new FormData()
    const blob = new Blob([imageBuffer], { type: "image/jpeg" })
    formData.append("image", blob, "image.jpg")
    formData.append("type", type)
    formData.append("input", JSON.stringify(config))

    const res = await fetch(`${API_BASE}/v2/process`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7)"
        },
        body: formData,
        signal: AbortSignal.timeout(60000)
    })

    if (!res.ok) {
        const errorText = await res.text().catch(() => "")
        throw new Error(`Process failed: HTTP ${res.status} - ${errorText}`)
    }

    const json = await res.json()
    if (!json?.success || !json?.data?.output) {
        throw new Error(`Operation failed: ${json?.message || json?.error_code || "Unknown error"}`)
    }

    return {
        output: json.data.output,
        width: json.data.width,
        height: json.data.height,
        size: json.data.size,
        creditsRemaining: json.data.credits
    }
}

/**
 * Perbesar resolusi gambar (2x / 4x)
 */
export async function enlarge(imageSource, options = {}) {
    const upscale = options.upscale || 2
    const isFaceEnhanceEnabled = Boolean(options.faceEnhance ?? true)
    return processImage(imageSource, "Enlarger", { upscale, isFaceEnhanceEnabled })
}

/**
 * Jernihkan / Enhance foto
 */
export async function enhance(imageSource, options = {}) {
    const upscale = options.upscale || 2
    const isBackgroundEnabled = Boolean(options.backgroundEnhance ?? true)
    return processImage(imageSource, "Enhancer", { upscale, isBackgroundEnabled })
}

/**
 * Restore foto jadul / rusak
 */
export async function restore(imageSource, options = {}) {
    const upscale = options.upscale || 2
    return processImage(imageSource, "Restore", { upscale })
}
