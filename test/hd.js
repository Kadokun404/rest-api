/**
 * Test File untuk Endpoint: /tools/hd
 * Bisa dijalankan dengan:
 *   $ node test/hd.js
 *   $ node hd.js (jika di dalam folder test/)
 *   $ bun test/hd.ts
 *   $ bun hd.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/tools/hd
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/tools/hd.js"

const sampleInput = {
    "url": "https://cos.kiracloud.me/image.92f45553.jpg",
    "file": "test",
    "scale": 4
}

async function main() {
    printHeader("tools", "hd", plugin.name || "HD Upscale")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "tools", plugin: "hd" },
            method: "POST",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("tools", "hd", sampleInput, "POST")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
