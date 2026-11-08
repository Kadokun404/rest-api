/**
 * Test File untuk Endpoint: /anime/imhentai
 * Bisa dijalankan dengan:
 *   $ node test/imhentai.js
 *   $ node imhentai.js (jika di dalam folder test/)
 *   $ bun test/imhentai.ts
 *   $ bun imhentai.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/anime/imhentai
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/anime/imhentai.js"

const sampleInput = {
    "query": "naruto"
}

async function main() {
    printHeader("anime", "imhentai", plugin.name || "ImHentai Manga Reader")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "anime", plugin: "imhentai" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("anime", "imhentai", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
