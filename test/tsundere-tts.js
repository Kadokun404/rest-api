/**
 * Test File untuk Endpoint: /tools/tsundere-tts
 * Bisa dijalankan dengan:
 *   $ node test/tsundere-tts.js
 *   $ node tsundere-tts.js (jika di dalam folder test/)
 *   $ bun test/tsundere-tts.ts
 *   $ bun tsundere-tts.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/tools/tsundere-tts
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/tools/tsundere-tts.js"

const sampleInput = {
    "text": "baka! jangan deket-deket!",
    "model": "anime-girl-tsundere"
}

async function main() {
    printHeader("tools", "tsundere-tts", plugin.name || "Tsundere Anime Voice TTS")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "tools", plugin: "tsundere-tts" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("tools", "tsundere-tts", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
