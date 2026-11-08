/**
 * Test File untuk Endpoint: /nsfw/xnxx
 * Bisa dijalankan dengan:
 *   $ node test/xnxx.js
 *   $ node xnxx.js (jika di dalam folder test/)
 *   $ bun test/xnxx.ts
 *   $ bun xnxx.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/nsfw/xnxx
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/nsfw/xnxx.js"

const sampleInput = {
    "query": "japanese"
}

async function main() {
    printHeader("nsfw", "xnxx", plugin.name || "XNXX Video Search")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "nsfw", plugin: "xnxx" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("nsfw", "xnxx", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
