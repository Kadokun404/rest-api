/**
 * Test File untuk Endpoint: /downloader/ytmp3
 * Bisa dijalankan dengan:
 *   $ node test/ytmp3.js
 *   $ node ytmp3.js (jika di dalam folder test/)
 *   $ bun test/ytmp3.ts
 *   $ bun ytmp3.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/downloader/ytmp3
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/downloader/ytmp3.js"

const sampleInput = {
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}

async function main() {
    printHeader("downloader", "ytmp3", plugin.name || "YouTube MP3 Downloader")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "downloader", plugin: "ytmp3" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("downloader", "ytmp3", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
