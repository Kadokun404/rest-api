/**
 * Universal Test Helper for REST API Endpoints
 * Compatible with Node.js and Bun
 */

export const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m"
}

export function printHeader(category, name, title) {
    console.log(colors.cyan + "=".repeat(62) + colors.reset)
    console.log(`${colors.bright}🧪 TESTING ENDPOINT: /${category}/${name}${colors.reset}`)
    if (title) console.log(`${colors.dim}   Plugin: ${title}${colors.reset}`)
    console.log(colors.cyan + "=".repeat(62) + colors.reset)
}

export async function runTest(label, testFn) {
    console.log(`\n${colors.bright}▶ ${label}${colors.reset}`)
    const start = Date.now()
    try {
        const result = await testFn()
        const duration = Date.now() - start
        console.log(`  ${colors.green}✅ SUCCESS${colors.reset} (${duration}ms)`)

        if (Array.isArray(result)) {
            console.log(`  ${colors.dim}Total results: ${result.length}${colors.reset}`)
            const preview = result.slice(0, 3)
            console.log(JSON.stringify(preview, null, 2))
            if (result.length > 3) console.log(`  ${colors.dim}...dan ${result.length - 3} item lainnya${colors.reset}`)
        } else if (result && typeof result === "object") {
            const keys = Object.keys(result)
            console.log(`  ${colors.dim}Result keys: [ ${keys.join(", ")} ]${colors.reset}`)
            const str = JSON.stringify(result, null, 2)
            if (str.length > 1000) {
                console.log(str.slice(0, 997) + "...")
            } else {
                console.log(str)
            }
        } else {
            console.log(" ", result)
        }
        return { success: true, result, duration }
    } catch (err) {
        const duration = Date.now() - start
        console.log(`  ${colors.red}❌ FAILED${colors.reset} (${duration}ms)`)
        console.log(`  ${colors.red}Error: ${err.message}${colors.reset}`)
        if (err.response?.status) {
            console.log(`  ${colors.yellow}HTTP Status: ${err.response.status}${colors.reset}`)
            console.log(`  ${colors.yellow}Response Data: ${JSON.stringify(err.response.data)}${colors.reset}`)
        }
        return { success: false, error: err, duration }
    }
}

export async function testLiveApi(category, name, params = {}, method = "GET") {
    const isLive = process.argv.includes("--live")
    if (!isLive) return

    return await runTest(`[LIVE] https://kadokunn.com/${category}/${name}`, async () => {
        const url = new URL(`https://kadokunn.com/${category}/${name}`)
        let options = { method, headers: { "User-Agent": "Arashi-Api-Tester/1.0" } }

        if (method === "GET") {
            for (const [k, v] of Object.entries(params)) {
                if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
            }
        } else {
            options.headers["Content-Type"] = "application/json"
            options.body = JSON.stringify(params)
        }

        const res = await fetch(url.toString(), options)
        const json = await res.json()
        if (!res.ok || json.status === false) {
            throw new Error(`HTTP ${res.status}: ${json.message || "Request failed"}`)
        }
        return json
    })
}

export function printSummary(allSuccess) {
    console.log("\n" + colors.cyan + "=".repeat(62) + colors.reset)
    if (allSuccess) {
        console.log(`${colors.green}${colors.bright}🎉 ALL TESTS PASSED! Endpoint siap digunakan.${colors.reset}`)
    } else {
        console.log(`${colors.red}${colors.bright}⚠️ BEBERAPA TEST GAGAL! Periksa log error di atas.${colors.reset}`)
    }
    console.log(colors.cyan + "=".repeat(62) + colors.reset + "\n")
}
