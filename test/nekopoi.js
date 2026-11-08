/**
 * Test File untuk Endpoint: /anime/nekopoi
 * Bisa dijalankan dengan:
 *   $ node test/nekopoi.js
 *   $ node nekopoi.js (jika di dalam folder test/)
 *   $ bun test/nekopoi.ts
 *   $ bun nekopoi.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/anime/nekopoi
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/anime/nekopoi.js"

const sampleInput = {
    "query": "nurse"
}

async function main() {
    printHeader("anime", "nekopoi", plugin.name || "NekoPoi Anime & Hentai")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "anime", plugin: "nekopoi" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("anime", "nekopoi", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
