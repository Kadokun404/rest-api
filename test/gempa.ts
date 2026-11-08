/**
 * Test File untuk Endpoint: /info/gempa
 * Bisa dijalankan dengan:
 *   $ node test/gempa.js
 *   $ node gempa.js (jika di dalam folder test/)
 *   $ bun test/gempa.ts
 *   $ bun gempa.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/info/gempa
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/info/gempa.js"

const sampleInput = {}

async function main() {
    printHeader("info", "gempa", plugin.name || "Gempa Terkini")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "info", plugin: "gempa" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("info", "gempa", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
