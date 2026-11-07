import dns from "node:dns"
dns.setDefaultResultOrder("ipv4first")

import axios from "axios"
const config = { apikey: { theresav: process.env.THERESAV_API_KEY || "araqshi", rule34: { user_id: process.env.RULE34_USER_ID || "7010186", api_key: process.env.RULE34_API_KEY || "dbcb6813a47b997a07ceedbe4eaef3b0e38c0d0fdb5665642622e49af6b2239c9232945c552358cde2cd92bf377ed7b33cf1b784993aa121b2c45b9468bcde35" } } };
const videoToWebp = null;

const TOKEN = config?.apikey?.telegram_bot || process.env.TELEGRAM_BOT_TOKEN
const API = "https://api.telegram.org"

export function extractTelegramPackName(input) {
    if (!input) return null
    const trimmed = String(input).trim()

    // 1. Link format: https://t.me/addstickers/pack_name atau tg://addstickers?set=pack_name
    const urlMatch = trimmed.match(/(?:https?:\/\/)?(?:t\.me|telegram\.me|telegram\.dog)\/addstickers\/([a-zA-Z0-9_]+)/i)
    if (urlMatch?.[1]) return urlMatch[1]

    const tgMatch = trimmed.match(/addstickers\/?\?set=([a-zA-Z0-9_]+)/i)
    if (tgMatch?.[1]) return tgMatch[1]

    const shortMatch = trimmed.match(/(?:^|\s)addstickers\/([a-zA-Z0-9_]+)/i)
    if (shortMatch?.[1]) return shortMatch[1]

    // 2. Direct pack name (hanya alphanumeric dan underscore tanpa url)
    if (/^[a-zA-Z0-9_]+$/.test(trimmed)) {
        return trimmed
    }

    return null
}

export async function fetchTelegramStickers(packNameOrUrl, { limit = 60 } = {}) {
    const packName = extractTelegramPackName(packNameOrUrl)
    if (!packName) throw new Error("Nama atau link pack tidak valid")
    if (!TOKEN) throw new Error("Bot token Telegram belum dipasang")

    const { data } = await axios.get(`${API}/bot${TOKEN}/getStickerSet`, {
        params: { name: packName },
        timeout: 15000
    })

    if (!data?.ok || !data?.result?.stickers?.length) {
        throw new Error(`Sticker pack "${packName}" tidak ditemukan atau kosong`)
    }

    const pack = data.result
    const list = pack.stickers.slice(0, limit)

    const download = async (st, retry = 1) => {
        try {
            const isVideo = Boolean(st.is_video)
            const isAnimated = Boolean(st.is_animated)
            const fileId = (isAnimated && !isVideo)
                ? (st.thumbnail?.file_id || st.thumb?.file_id || st.file_id)
                : st.file_id

            const { data: fileData } = await axios.get(`${API}/bot${TOKEN}/getFile`, {
                params: { file_id: fileId },
                timeout: 10000
            })

            const filePath = fileData?.result?.file_path
            if (!filePath) return null

            const { data: bufData } = await axios.get(`${API}/file/bot${TOKEN}/${filePath}`, {
                responseType: "arraybuffer",
                timeout: 20000
            })

            let buffer = Buffer.from(bufData)

            if (isVideo && filePath.endsWith(".webm")) {
                try {
                    buffer = await videoToWebp(buffer, { isFull: true })
                } catch {
                    const thumbId = st.thumbnail?.file_id || st.thumb?.file_id
                    if (thumbId) {
                        const { data: tData } = await axios.get(`${API}/bot${TOKEN}/getFile`, { params: { file_id: thumbId } })
                        if (tData?.result?.file_path) {
                            const { data: tBuf } = await axios.get(`${API}/file/bot${TOKEN}/${tData.result.file_path}`, { responseType: "arraybuffer" })
                            buffer = Buffer.from(tBuf)
                        }
                    }
                }
            }

            return { buffer, emoji: st.emoji || "🤍", isAnimated: isVideo }
        } catch (err) {
            if (retry > 0) return download(st, retry - 1)
            return null
        }
    }

    // download 6 per batch
    const results = []
    for (let i = 0; i < list.length; i += 6) {
        const batch = await Promise.all(list.slice(i, i + 6).map(download))
        for (const item of batch) if (item?.buffer) results.push(item)
    }

    if (!results.length) throw new Error("Gagal mengunduh stiker dari Telegram")

    return {
        name: pack.name,
        title: pack.title || pack.name,
        total: pack.stickers.length,
        stickers: results
    }
}
