/**
 * Test File untuk Endpoint: /tools/image-enlarger
 * Bisa dijalankan dengan:
 *   $ node test/image-enlarger.js
 *   $ node image-enlarger.js (jika di dalam folder test/)
 *   $ bun test/image-enlarger.ts
 *   $ bun image-enlarger.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/tools/image-enlarger
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/tools/image-enlarger.js"

const sampleInput = {
    "url": "https://example.com/photo.jpg"
}

async function main() {
    printHeader("tools", "image-enlarger", plugin.name || "AI Image Upscaler & Enlarger")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "tools", plugin: "image-enlarger" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("tools", "image-enlarger", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
