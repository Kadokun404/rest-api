/**
 * Test File untuk Endpoint: /qris/struk
 * Bisa dijalankan dengan:
 *   $ node test/struk.js
 *   $ node struk.js (jika di dalam folder test/)
 *   $ bun test/struk.ts
 *   $ bun struk.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/qris/struk
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/qris/struk.js"

const sampleInput = {
    "toko": "Kadokun Store",
    "items": "[{\"nama\":\"Kopi\",\"qty\":2,\"harga\":10000}]",
    "bayar": 20000,
    "metodeBayar": "QRIS",
    "nomorStruk": "INV-0001"
}

async function main() {
    printHeader("qris", "struk", plugin.name || "QRIS Struk")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "qris", plugin: "struk" },
            method: "POST",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("qris", "struk", sampleInput, "POST")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
