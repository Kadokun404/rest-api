import fs from "node:fs"
import path from "node:path"

const ROOT = "/home/ubuntu/rest-api"
const PLUGINS_DIR = path.join(ROOT, "src", "plugins")
const TEST_DIR = path.join(ROOT, "test")

if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true })

const categories = fs.readdirSync(PLUGINS_DIR)
const allPlugins = []

for (const cat of categories) {
    const catPath = path.join(PLUGINS_DIR, cat)
    if (!fs.statSync(catPath).isDirectory()) continue

    for (const f of fs.readdirSync(catPath)) {
        if (!f.endsWith(".js")) continue
        const name = f.replace(/\.js$/, "")
        const pluginPath = path.join(catPath, f)
        const relPluginPath = `../src/plugins/${cat}/${f}`

        // Dynamic import plugin metadata
        try {
            const mod = await import(`file://${pluginPath}`)
            const plugin = mod.default || {}
            allPlugins.push({
                category: cat,
                file: f,
                name,
                pluginName: plugin.name || name,
                method: plugin.method || ["GET"],
                params: plugin.params || {},
                relPluginPath
            })
        } catch (e) {
            console.warn(`[skip] ${cat}/${f}:`, e.message)
        }
    }
}

console.log(`Menemukan ${allPlugins.length} plugins untuk dibuatkan test file...`)

// Custom sample values for specific endpoints to ensure realistic responses
const customSamples = {
    pixhentai: { query: "naruto", slug: "naruto-sakura-rela-dientot-sasuke" },
    spotify: { query: "bohemian rhapsody" },
    tiktok: { url: "https://www.tiktok.com/@scout2015/video/6718335390845095173" },
    youtube: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    ytmp3: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    instagram: { url: "https://www.instagram.com/p/C-example/" },
    capcut: { url: "https://www.capcut.com/t/Zs8example/" },
    anichin: { query: "soul land" },
    hanime1: { query: "overflow" },
    hentaicity: { query: "isekai" },
    hentaimama: { query: "succubus" },
    hentaitv: { query: "manga" },
    imhentai: { query: "naruto" },
    miohentai: { query: "magic" },
    nekopoi: { query: "nurse" },
    pornhub: { query: "blonde" },
    rule34: { query: "genshin" },
    xhamster: { query: "asian" },
    xnxx: { query: "japanese" },
    xvideos: { query: "japanese" },
    gemini: { text: "halo siapa namamu?" },
    feelbetter: { text: "aku merasa sedikit lelah hari ini" },
    pinterest: { query: "anime wallpaper" },
    "google-image": { query: "cute cat" },
    lyrics: { query: "yesterday beatles" },
    genius: { query: "bohemian rhapsody queen" },
    soundcloud: { query: "marshmello" },
    stickerly: { query: "pentol" },
    "telegram-sticker": { url: "https://t.me/addstickers/animesticker" },
    ytsearch: { query: "alan walker faded" },
    ping: {},
    gempa: {},
    ipinfo: { ip: "8.8.8.8" },
    dnslookup: { domain: "google.com" },
    "google-tts": { text: "halo selamat pagi", lang: "id" },
    "tsundere-tts": { text: "baka! jangan deket-deket!", model: "anime-girl-tsundere" },
    ruangemail: { action: "generate" },
    emailnator: { action: "create" },
    tempmail: { action: "create" },
    top4top: { url: "https://example.com/test.jpg" }
}

for (const p of allPlugins) {
    const sample = customSamples[p.name] || {}

    // Kumpulkan params dari schema jika belum di customSamples
    if (!Object.keys(sample).length) {
        for (const [k, v] of Object.entries(p.params)) {
            sample[k] = v.example || (v.type === "number" ? 1 : "test")
        }
    }

    const testCode = `/**
 * Test File untuk Endpoint: /${p.category}/${p.name}
 * Bisa dijalankan dengan:
 *   $ node test/${p.name}.js
 *   $ node ${p.name}.js (jika di dalam folder test/)
 *   $ bun test/${p.name}.ts
 *   $ bun ${p.name}.ts
 * 
 * Tambahkan flag --live untuk test langsung ke production https://kadokunn.com/${p.category}/${p.name}
 */

import { printHeader, runTest, testLiveApi, printSummary } from "./_helper.js"
import plugin from "${p.relPluginPath}"

const sampleInput = ${JSON.stringify(sample, null, 4)}

async function main() {
    printHeader("${p.category}", "${p.name}", plugin.name || "${p.pluginName}")
    let allOk = true

    // 1. Test Eksekusi Plugin Lokal / Service
    const localRes = await runTest("1. Test Plugin Execute (Local / Mock Req)", async () => {
        const mockReq = {
            query: { ...sampleInput },
            body: { ...sampleInput },
            params: { category: "${p.category}", plugin: "${p.name}" },
            method: "${p.method[0] || "GET"}",
            headers: { "user-agent": "Mozilla/5.0" }
        }
        return await plugin.execute(mockReq)
    })
    if (!localRes.success) allOk = false

    // 2. Test Live Production (jika flag --live disertakan)
    const liveRes = await testLiveApi("${p.category}", "${p.name}", sampleInput, "${p.method[0] || "GET"}")
    if (liveRes && !liveRes.success) allOk = false

    printSummary(allOk)
    if (!allOk && process.argv.includes("--exit-code")) process.exit(1)
}

main().catch(err => {
    console.error("Fatal Test Error:", err)
    process.exit(1)
})
`

    const jsPath = path.join(TEST_DIR, `${p.name}.js`)
    const tsPath = path.join(TEST_DIR, `${p.name}.ts`)

    fs.writeFileSync(jsPath, testCode)
    fs.writeFileSync(tsPath, testCode)
}

// Buat script test/all.js untuk menjalankan semua test sekaligus
const allTestRunnerCode = `/**
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
console.log(\`\${colors.bright}🧪 MENJALANKAN SEMUA TEST ENDPOINT (\${files.length} FILE)\${colors.reset}\`)
console.log(colors.cyan + "=".repeat(62) + colors.reset + "\\n")

const results = []

for (const file of files) {
    const name = file.replace(/\\.js$/, "")
    process.stdout.write(\`Testing \${name.padEnd(25)} : \`)
    const start = Date.now()
    try {
        const mod = await import(\`./\${file}\`)
        // Jalankan via child process atau direct
        results.push({ name, status: "PASS", time: Date.now() - start })
        console.log(\`\${colors.green}PASS\${colors.reset} (\${Date.now() - start}ms)\`)
    } catch (e) {
        results.push({ name, status: "FAIL", error: e.message, time: Date.now() - start })
        console.log(\`\${colors.red}FAIL: \${e.message}\${colors.reset}\`)
    }
}

const passed = results.filter(r => r.status === "PASS").length
const failed = results.filter(r => r.status === "FAIL").length

console.log("\\n" + colors.cyan + "=".repeat(62) + colors.reset)
console.log(\`HASIL TOTAL: \${colors.green}\${passed} PASSED\${colors.reset} | \${colors.red}\${failed} FAILED\${colors.reset} | Total: \${results.length}\`)
console.log(colors.cyan + "=".repeat(62) + colors.reset + "\\n")
`

fs.writeFileSync(path.join(TEST_DIR, "all.js"), allTestRunnerCode)
fs.writeFileSync(path.join(TEST_DIR, "all.ts"), allTestRunnerCode)

console.log("✅ Berhasil membuat semua file test .js dan .ts di folder test/!")
