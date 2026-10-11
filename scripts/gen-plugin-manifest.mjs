// Membuat src/plugin-manifest.js dari isi src/plugins/**.
// Jalan otomatis lewat "predev" dan "prebuild" di package.json.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginsDir = path.join(root, "src", "plugins");
const outFile = path.join(root, "src", "plugin-manifest.js");

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) return walk(full);
    return item.isFile() && /\.m?js$/.test(item.name) ? [full] : [];
  });

const entries = fs.existsSync(pluginsDir)
  ? walk(pluginsDir)
      .map((file) => {
        const rel = path.relative(pluginsDir, file).split(path.sep).join("/");
        const parts = rel.split("/");
        const category = parts.length === 1 ? "general" : parts[0].toLowerCase();
        const name = (parts.length === 1 ? parts[0] : parts.slice(1).join("/"))
          .replace(/\.m?js$/, "")
          .toLowerCase();
        return { rel, category, name, routePath: `/${category}/${name}` };
      })
      .sort((a, b) => a.routePath.localeCompare(b.routePath))
  : [];

const body = entries
  .map(
    (e) =>
      `  { category: ${JSON.stringify(e.category)}, name: ${JSON.stringify(e.name)}, routePath: ${JSON.stringify(
        e.routePath
      )}, load: () => import(${JSON.stringify("./plugins/" + e.rel)}) },`
  )
  .join("\n");

fs.writeFileSync(
  outFile,
  `// FILE INI DIBUAT OTOMATIS oleh scripts/gen-plugin-manifest.mjs. Jangan diedit manual.\nexport const pluginManifest = [\n${body}\n];\n`
);
console.log(`[plugins] ${entries.length} plugin masuk manifest`);
