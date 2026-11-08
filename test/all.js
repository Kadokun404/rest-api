/**
 * Test Runner untuk Semua Endpoint REST API
 * Cara pakai:
 *   $ node test/all.js
 *   $ bun test/all.ts
 */

import { colors } from "./_helper.js"
import fs from "node:fs"
import path from "node:path"

const TEST_DIR = path.resolve(import.meta.dirname || ".")
const files = fs.readdirSync(TEST_DIR).filter(f => f.endsWith(".js") && !f.startsWith("_") && f !== "all.js")

console.log(colors.cyan + "=".repeat(62) + colors.reset)
console.log(`${colors.bright}🧪 MENJALANKAN SEMUA TEST ENDPOINT (${files.length} FILE)${colors.reset}`)
console.log(colors.cyan + "=".repeat(62) + colors.reset + "\n")

const results = []

for (const file of files) {
    const name = file.replace(/\.js$/, "")
    process.stdout.write(`Testing ${name.padEnd(25)} : `)
    const start = Date.now()
    try {
        const mod = await import(`./${file}`)
        // Jalankan via child process atau direct
        results.push({ name, status: "PASS", time: Date.now() - start })
        console.log(`${colors.green}PASS${colors.reset} (${Date.now() - start}ms)`)
    } catch (e) {
        results.push({ name, status: "FAIL", error: e.message, time: Date.now() - start })
        console.log(`${colors.red}FAIL: ${e.message}${colors.reset}`)
    }
}

const passed = results.filter(r => r.status === "PASS").length
const failed = results.filter(r => r.status === "FAIL").length

console.log("\n" + colors.cyan + "=".repeat(62) + colors.reset)
console.log(`HASIL TOTAL: ${colors.green}${passed} PASSED${colors.reset} | ${colors.red}${failed} FAILED${colors.reset} | Total: ${results.length}`)
console.log(colors.cyan + "=".repeat(62) + colors.reset + "\n")
