/**
 * Test File untuk Endpoint: /downloader/youtube
 * Bisa dijalankan dengan:
 *   $ node test/youtube.js
 *   $ node youtube.js (jika di dalam folder test/)
 *   $ bun test/youtube.ts
 *   $ bun youtube.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/downloader/youtube
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/downloader/youtube.js"

const sampleInput = {
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}

async function main() {
    printHeader("downloader", "youtube", plugin.name || "YouTube Downloader")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "downloader", plugin: "youtube" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("downloader", "youtube", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
