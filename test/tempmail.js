/**
 * Test File untuk Endpoint: /tools/tempmail
 * Bisa dijalankan dengan:
 *   $ node test/tempmail.js
 *   $ node tempmail.js (jika di dalam folder test/)
 *   $ bun test/tempmail.ts
 *   $ bun tempmail.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/tools/tempmail
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/tools/tempmail.js"

const sampleInput = {
    "action": "create"
}

async function main() {
    printHeader("tools", "tempmail", plugin.name || "Temp Mail Generator & Inbox")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "tools", plugin: "tempmail" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("tools", "tempmail", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
