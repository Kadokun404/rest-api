/**
 * Test File untuk Endpoint: /downloader/spotify
 * Bisa dijalankan dengan:
 *   $ node test/spotify.js
 *   $ node spotify.js (jika di dalam folder test/)
 *   $ bun test/spotify.ts
 *   $ bun spotify.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/downloader/spotify
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/downloader/spotify.js"

const sampleInput = {
    "query": "bohemian rhapsody"
}

async function main() {
    printHeader("downloader", "spotify", plugin.name || "Spotify Downloader & Search")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "downloader", plugin: "spotify" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("downloader", "spotify", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
