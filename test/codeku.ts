/**
 * Test File untuk Endpoint: /tools/codeku
 * Bisa dijalankan dengan:
 *   $ node test/codeku.js
 *   $ node codeku.js (jika di dalam folder test/)
 *   $ bun test/codeku.ts
 *   $ bun codeku.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/tools/codeku
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/tools/codeku.js"

const sampleInput = {
    "id": "test",
    "code": "console.log('hello world');",
    "title": "hello.js"
}

async function main() {
    printHeader("tools", "codeku", plugin.name || "Codeku Pastebin & Snippet")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "tools", plugin: "codeku" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("tools", "codeku", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
