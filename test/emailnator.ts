/**
 * Test File untuk Endpoint: /tools/emailnator
 * Bisa dijalankan dengan:
 *   $ node test/emailnator.js
 *   $ node emailnator.js (jika di dalam folder test/)
 *   $ bun test/emailnator.ts
 *   $ bun emailnator.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/tools/emailnator
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/tools/emailnator.js"

const sampleInput = {
    "action": "create"
}

async function main() {
    printHeader("tools", "emailnator", plugin.name || "Emailnator Disposable Mail")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "tools", plugin: "emailnator" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("tools", "emailnator", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
