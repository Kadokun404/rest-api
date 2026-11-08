/**
 * Test File untuk Endpoint: /tools/t2v
 * Bisa dijalankan dengan:
 *   $ node test/t2v.js
 *   $ node t2v.js (jika di dalam folder test/)
 *   $ bun test/t2v.ts
 *   $ bun t2v.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/tools/t2v
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/tools/t2v.js"

const sampleInput = {
    "prompt": "a cat walking through a neon city at night"
}

async function main() {
    printHeader("tools", "t2v", plugin.name || "Text to Video AI")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "tools", plugin: "t2v" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("tools", "t2v", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
