/**
 * Test File untuk Endpoint: /ai/gemini
 * Bisa dijalankan dengan:
 *   $ node test/gemini.js
 *   $ node gemini.js (jika di dalam folder test/)
 *   $ bun test/gemini.ts
 *   $ bun gemini.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/ai/gemini
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/ai/gemini.js"

const sampleInput = {
    "text": "halo siapa namamu?"
}

async function main() {
    printHeader("ai", "gemini", plugin.name || "Google Gemini AI Chat")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "ai", plugin: "gemini" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("ai", "gemini", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
