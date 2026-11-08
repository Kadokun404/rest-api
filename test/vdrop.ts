/**
 * Test File untuk Endpoint: /downloader/vdrop
 * Bisa dijalankan dengan:
 *   $ node test/vdrop.js
 *   $ node vdrop.js (jika di dalam folder test/)
 *   $ bun test/vdrop.ts
 *   $ bun vdrop.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/downloader/vdrop
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/downloader/vdrop.js"

const sampleInput = {
    "url": "https://www.tiktok.com/..."
}

async function main() {
    printHeader("downloader", "vdrop", plugin.name || "Vdrop Video Downloader")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "downloader", plugin: "vdrop" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("downloader", "vdrop", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
