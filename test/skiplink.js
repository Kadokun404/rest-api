/**
 * Test File untuk Endpoint: /bypass/skiplink
 * Bisa dijalankan dengan:
 *   $ node test/skiplink.js
 *   $ node skiplink.js (jika di dalam folder test/)
 *   $ bun test/skiplink.ts
 *   $ bun skiplink.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/bypass/skiplink
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/bypass/skiplink.js"

const sampleInput = {
    "url": "test"
}

async function main() {
    printHeader("bypass", "skiplink", plugin.name || "Linkvertise & Ad-Link Bypasser")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "bypass", plugin: "skiplink" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("bypass", "skiplink", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
