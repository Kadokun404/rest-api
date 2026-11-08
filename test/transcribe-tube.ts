/**
 * Test File untuk Endpoint: /tools/transcribe-tube
 * Bisa dijalankan dengan:
 *   $ node test/transcribe-tube.js
 *   $ node transcribe-tube.js (jika di dalam folder test/)
 *   $ bun test/transcribe-tube.ts
 *   $ bun transcribe-tube.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/tools/transcribe-tube
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/tools/transcribe-tube.js"

const sampleInput = {
    "url": "https://youtu.be/..."
}

async function main() {
    printHeader("tools", "transcribe-tube", plugin.name || "YouTube Transcript & Subtitles")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "tools", plugin: "transcribe-tube" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("tools", "transcribe-tube", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
