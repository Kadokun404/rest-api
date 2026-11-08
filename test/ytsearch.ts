/**
 * Test File untuk Endpoint: /search/ytsearch
 * Bisa dijalankan dengan:
 *   $ node test/ytsearch.js
 *   $ node ytsearch.js (jika di dalam folder test/)
 *   $ bun test/ytsearch.ts
 *   $ bun ytsearch.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/search/ytsearch
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/search/ytsearch.js"

const sampleInput = {
    "query": "alan walker faded"
}

async function main() {
    printHeader("search", "ytsearch", plugin.name || "YouTube Search")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "search", plugin: "ytsearch" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("search", "ytsearch", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
