/**
 * Test File untuk Endpoint: /qris/cancel
 * Bisa dijalankan dengan:
 *   $ node test/cancel.js
 *   $ node cancel.js (jika di dalam folder test/)
 *   $ bun test/cancel.ts
 *   $ bun cancel.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/qris/cancel
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/qris/cancel.js"

const sampleInput = {
    "ref": "test",
    "amount": 5000
}

async function main() {
    printHeader("qris", "cancel", plugin.name || "QRIS Cancel")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "qris", plugin: "cancel" },
            method: "POST",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("qris", "cancel", sampleInput, "POST")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
