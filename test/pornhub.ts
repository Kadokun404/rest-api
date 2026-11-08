/**
 * Test File untuk Endpoint: /nsfw/pornhub
 * Bisa dijalankan dengan:
 *   $ node test/pornhub.js
 *   $ node pornhub.js (jika di dalam folder test/)
 *   $ bun test/pornhub.ts
 *   $ bun pornhub.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/nsfw/pornhub
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/nsfw/pornhub.js"

const sampleInput = {
    "query": "blonde"
}

async function main() {
    printHeader("nsfw", "pornhub", plugin.name || "PornHub Search & Video")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "nsfw", plugin: "pornhub" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("nsfw", "pornhub", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
