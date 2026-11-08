/**
 * Test File untuk Endpoint: /premium/ipinfo
 * Bisa dijalankan dengan:
 *   $ node test/ipinfo.js
 *   $ node ipinfo.js (jika di dalam folder test/)
 *   $ bun test/ipinfo.ts
 *   $ bun ipinfo.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/premium/ipinfo
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/premium/ipinfo.js"

const sampleInput = {
    "ip": "8.8.8.8"
}

async function main() {
    printHeader("premium", "ipinfo", plugin.name || "IP Info")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "premium", plugin: "ipinfo" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("premium", "ipinfo", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
