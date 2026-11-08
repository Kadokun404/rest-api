/**
 * Test File untuk Endpoint: /search/google-image
 * Bisa dijalankan dengan:
 *   $ node test/google-image.js
 *   $ node google-image.js (jika di dalam folder test/)
 *   $ bun test/google-image.ts
 *   $ bun google-image.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/search/google-image
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/search/google-image.js"

const sampleInput = {
    "query": "cute cat"
}

async function main() {
    printHeader("search", "google-image", plugin.name || "Google Image Search")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "search", plugin: "google-image" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("search", "google-image", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
