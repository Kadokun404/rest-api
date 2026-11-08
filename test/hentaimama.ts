/**
 * Test File untuk Endpoint: /anime/hentaimama
 * Bisa dijalankan dengan:
 *   $ node test/hentaimama.js
 *   $ node hentaimama.js (jika di dalam folder test/)
 *   $ bun test/hentaimama.ts
 *   $ bun hentaimama.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/anime/hentaimama
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/anime/hentaimama.js"

const sampleInput = {
    "query": "succubus"
}

async function main() {
    printHeader("anime", "hentaimama", plugin.name || "HentaiMama Search & Series")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "anime", plugin: "hentaimama" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("anime", "hentaimama", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
