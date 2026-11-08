/**
 * Test File untuk Endpoint: /downloader/omdown
 * Bisa dijalankan dengan:
 *   $ node test/omdown.js
 *   $ node omdown.js (jika di dalam folder test/)
 *   $ bun test/omdown.ts
 *   $ bun omdown.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/downloader/omdown
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/downloader/omdown.js"

const sampleInput = {
    "url": "https://youtube.com/watch?v=..."
}

async function main() {
    printHeader("downloader", "omdown", plugin.name || "OmDown Media Downloader")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "downloader", plugin: "omdown" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("downloader", "omdown", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
