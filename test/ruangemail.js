/**
 * Test File untuk Endpoint: /tools/ruangemail
 * Bisa dijalankan dengan:
 *   $ node test/ruangemail.js
 *   $ node ruangemail.js (jika di dalam folder test/)
 *   $ bun test/ruangemail.ts
 *   $ bun ruangemail.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/tools/ruangemail
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/tools/ruangemail.js"

const sampleInput = {
    "action": "generate"
}

async function main() {
    printHeader("tools", "ruangemail", plugin.name || "RuangEmail Webmail & Inbox")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "tools", plugin: "ruangemail" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("tools", "ruangemail", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
