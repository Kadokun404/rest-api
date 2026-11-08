/**
 * Test File untuk Endpoint: /downloader/tiktok
 * Bisa dijalankan dengan:
 *   $ node test/tiktok.js
 *   $ node tiktok.js (jika di dalam folder test/)
 *   $ bun test/tiktok.ts
 *   $ bun tiktok.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/downloader/tiktok
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/downloader/tiktok.js"

const sampleInput = {
    "url": "https://www.tiktok.com/@scout2015/video/6718335390845095173"
}

async function main() {
    printHeader("downloader", "tiktok", plugin.name || "TikTok Downloader")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "downloader", plugin: "tiktok" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("downloader", "tiktok", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
