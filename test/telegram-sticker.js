/**
 * Test File untuk Endpoint: /search/telegram-sticker
 * Bisa dijalankan dengan:
 *   $ node test/telegram-sticker.js
 *   $ node telegram-sticker.js (jika di dalam folder test/)
 *   $ bun test/telegram-sticker.ts
 *   $ bun telegram-sticker.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/search/telegram-sticker
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/search/telegram-sticker.js"

const sampleInput = {
    "url": "https://t.me/addstickers/animesticker"
}

async function main() {
    printHeader("search", "telegram-sticker", plugin.name || "Telegram Sticker Fetcher")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "search", plugin: "telegram-sticker" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("search", "telegram-sticker", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
