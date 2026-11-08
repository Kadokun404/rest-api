/**
 * Test File untuk Endpoint: /anime/rule34
 * Bisa dijalankan dengan:
 *   $ node test/rule34.js
 *   $ node rule34.js (jika di dalam folder test/)
 *   $ bun test/rule34.ts
 *   $ bun rule34.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/anime/rule34
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/anime/rule34.js"

const sampleInput = {
    "query": "genshin"
}

async function main() {
    printHeader("anime", "rule34", plugin.name || "Rule34 Image Search")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "anime", plugin: "rule34" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("anime", "rule34", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
