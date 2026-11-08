/**
 * Test File untuk Endpoint: /anime/anichin
 * Bisa dijalankan dengan:
 *   $ node test/anichin.js
 *   $ node anichin.js (jika di dalam folder test/)
 *   $ bun test/anichin.ts
 *   $ bun anichin.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/anime/anichin
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/anime/anichin.js"

const sampleInput = {
    "query": "soul land"
}

async function main() {
    printHeader("anime", "anichin", plugin.name || "Anichin Donghua Anime")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "anime", plugin: "anichin" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("anime", "anichin", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
