/**
 * Test File untuk Endpoint: /tools/web2apk
 * Bisa dijalankan dengan:
 *   $ node test/web2apk.js
 *   $ node web2apk.js (jika di dalam folder test/)
 *   $ bun test/web2apk.ts
 *   $ bun web2apk.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/tools/web2apk
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "../src/plugins/tools/web2apk.js"

const sampleInput = {
    "url": "https://kadokunn.com",
    "name": "Kadokun",
    "icon_url": "test",
    "package_name": "test",
    "version_name": "1.0.0",
    "version_code": 1
}

async function main() {
    printHeader("tools", "web2apk", plugin.name || "Web to APK")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "tools", plugin: "web2apk" },
            method: "GET",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("tools", "web2apk", sampleInput, "GET")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
