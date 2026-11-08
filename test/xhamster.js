/**
 * Test File untuk Endpoint: /nsfw/xhamster
 * Bisa dijalankan dengan:
 *   $ node test/xhamster.js
 *   $ node xhamster.js (jika di dalam folder test/)
 *   $ bun test/xhamster.ts
 *   $ bun xhamster.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/nsfw/xhamster
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/nsfw/xhamster.js"

const sampleInput = {
    "query": "asian"
}

async function main() {
    printHeader("nsfw", "xhamster", plugin.name || "XHamster Search & Video")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "nsfw", plugin: "xhamster" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("nsfw", "xhamster", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
