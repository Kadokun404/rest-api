/**
 * Test File untuk Endpoint: /downloader/aio
 * Bisa dijalankan dengan:
 *   $ node test/aio.js
 *   $ node aio.js (jika di dalam folder test/)
 *   $ bun test/aio.ts
 *   $ bun aio.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/downloader/aio
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/downloader/aio.js"

const sampleInput = {
    "url": "https://www.instagram.com/p/..."
}

async function main() {
    printHeader("downloader", "aio", plugin.name || "All-in-One Downloader")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "downloader", plugin: "aio" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("downloader", "aio", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
