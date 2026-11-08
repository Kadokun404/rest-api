/**
 * Test File untuk Endpoint: /ai/feelbetter
 * Bisa dijalankan dengan:
 *   $ node test/feelbetter.js
 *   $ node feelbetter.js (jika di dalam folder test/)
 *   $ bun test/feelbetter.ts
 *   $ bun feelbetter.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/ai/feelbetter
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/ai/feelbetter.js"

const sampleInput = {
    "text": "aku merasa sedikit lelah hari ini"
}

async function main() {
    printHeader("ai", "feelbetter", plugin.name || "FeelBetter Mental Health & Advice")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "ai", plugin: "feelbetter" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("ai", "feelbetter", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
