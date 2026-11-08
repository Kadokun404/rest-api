/**
 * Test File untuk Endpoint: /anime/hanime1
 * Bisa dijalankan dengan:
 *   $ node test/hanime1.js
 *   $ node hanime1.js (jika di dalam folder test/)
 *   $ bun test/hanime1.ts
 *   $ bun hanime1.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/anime/hanime1
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/anime/hanime1.js"

const sampleInput = {
    "query": "overflow"
}

async function main() {
    printHeader("anime", "hanime1", plugin.name || "Hanime1 Anime Stream")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "anime", plugin: "hanime1" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("anime", "hanime1", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
