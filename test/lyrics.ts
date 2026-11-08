/**
 * Test File untuk Endpoint: /search/lyrics
 * Bisa dijalankan dengan:
 *   $ node test/lyrics.js
 *   $ node lyrics.js (jika di dalam folder test/)
 *   $ bun test/lyrics.ts
 *   $ bun lyrics.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/search/lyrics
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/search/lyrics.js"

const sampleInput = {
    "query": "yesterday beatles"
}

async function main() {
    printHeader("search", "lyrics", plugin.name || "Song Lyrics Search")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "search", plugin: "lyrics" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("search", "lyrics", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
