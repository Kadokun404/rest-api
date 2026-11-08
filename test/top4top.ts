/**
 * Test File untuk Endpoint: /tools/top4top
 * Bisa dijalankan dengan:
 *   $ node test/top4top.js
 *   $ node top4top.js (jika di dalam folder test/)
 *   $ bun test/top4top.ts
 *   $ bun top4top.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/tools/top4top
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/tools/top4top.js"

const sampleInput = {
    "url": "https://example.com/test.jpg"
}

async function main() {
    printHeader("tools", "top4top", plugin.name || "Top4Top File Uploader")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "tools", plugin: "top4top" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("tools", "top4top", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
