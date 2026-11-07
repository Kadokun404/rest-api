import dns from "node:dns"
dns.setDefaultResultOrder("ipv4first")

import axios from "axios"
const config = { apikey: { theresav: process.env.THERESAV_API_KEY || "araqshi", rule34: { user_id: process.env.RULE34_USER_ID || "7010186", api_key: process.env.RULE34_API_KEY || "dbcb6813a47b997a07ceedbe4eaef3b0e38c0d0fdb5665642622e49af6b2239c9232945c552358cde2cd92bf377ed7b33cf1b784993aa121b2c45b9468bcde35" } } };

const USER_ID = config?.apikey?.rule34?.user_id || process.env.RULE34_USER_ID || "7010186"
const API_KEY = config?.apikey?.rule34?.api_key || process.env.RULE34_API_KEY || "dbcb6813a47b997a07ceedbe4eaef3b0e38c0d0fdb5665642622e49af6b2239c9232945c552358cde2cd92bf377ed7b33cf1b784993aa121b2c45b9468bcde35"
const API_URL = "https://api.rule34.xxx/index.php"

export async function searchRule34(query = "", { limit = 5 } = {}) {
    const tags = query.trim().split(/\s+/).join(" ")

    const { data } = await axios.get(API_URL, {
        params: {
            page: "dapi",
            s: "post",
            q: "index",
            json: 1,
            limit: limit * 2,
            tags,
            user_id: USER_ID,
            api_key: API_KEY
        },
        timeout: 15000
    })

    if (!Array.isArray(data) || !data.length) {
        throw new Error(`Tidak ditemukan hasil untuk "${query}"`)
    }

    const images = data
        .filter(p => p.file_url && /\.(jpe?g|png)$/i.test(p.file_url))
        .slice(0, limit)

    if (!images.length) {
        throw new Error(`Tidak ditemukan gambar untuk "${query}"`)
    }

    return images.map(p => ({
        id: p.id,
        file_url: p.file_url,
        preview_url: p.preview_url || p.file_url,
        score: p.score || 0,
        rating: p.rating || "unknown",
        tags: p.tags || ""
    }))
}

export async function downloadRule34Buffers(posts) {
    const list = await Promise.all(
        posts.map(async (p) => {
            try {
                const { data } = await axios.get(p.file_url, {
                    responseType: "arraybuffer",
                    timeout: 20000
                })
                return {
                    buffer: Buffer.from(data),
                    caption: `Post #${p.id} • Score: ${p.score}`,
                    post: p
                }
            } catch {
                return null
            }
        })
    )
    return list.filter(Boolean)
}
