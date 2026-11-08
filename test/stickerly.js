/**
 * Test File untuk Endpoint: /search/stickerly
 * Bisa dijalankan dengan:
 *   $ node test/stickerly.js
 *   $ node stickerly.js (jika di dalam folder test/)
 *   $ bun test/stickerly.ts
 *   $ bun stickerly.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/search/stickerly
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/search/stickerly.js"

const sampleInput = {
    "query": "pentol"
}

async function main() {
    printHeader("search", "stickerly", plugin.name || "Sticker.ly Search & Pack")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "search", plugin: "stickerly" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("search", "stickerly", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
