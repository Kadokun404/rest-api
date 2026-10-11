// Pemakaian:
//   npm run genkey -- premium "Nama Pemilik" [YYYY-MM-DD]
//   npm run genkey -- free "Teman"
import { generateApiKey } from "../src/function.js";

const [planArg, nameArg, expiresArg] = process.argv.slice(2);
const plan = planArg === "premium" ? "premium" : "free";
const name = nameArg || "Tanpa nama";

const entry = { key: generateApiKey(plan), name, plan };
if (expiresArg) entry.expires = expiresArg;

console.log("\nAPI key baru dibuat:\n");
console.log(`  ${entry.key}\n`);
console.log("Tambahkan baris ini ke `localKeys` di src/config.js,");
console.log("atau masukkan ke environment variable KAELYN_API_KEYS (JSON array) di Vercel:\n");
console.log(`  ${JSON.stringify(entry)}\n`);
process.exit(0);
