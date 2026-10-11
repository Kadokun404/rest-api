import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

// Kategori plugin = nama folder di src/plugins (otomatis ikut bertambah).
function pluginCategories() {
  try {
    return fs
      .readdirSync(path.join(root, "src", "plugins"), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name.toLowerCase());
  } catch {
    return [];
  }
}

const categories = pluginCategories();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["express", "multer", "cors", "axios", "cheerio", "yt-search", "sharp"],
  outputFileTracingIncludes: {
    "/api/[...path]": ["./src/**/*"]
  },

  async redirects() {
    return [
      { source: "/donate", destination: "/payment", permanent: true },
      { source: "/stats", destination: "/status", permanent: true }
    ];
  },

  async rewrites() {
    const beforeFiles = [
      // POST /upload (GET /upload diarahkan ke /uploader oleh Express)
      { source: "/upload", destination: "/api/__x/upload" }
    ];
    if (categories.length) {
      beforeFiles.push({
        source: `/:category(${categories.join("|")})/:plugin+`,
        destination: "/api/__x/:category/:plugin*"
      });
    }
    return {
      beforeFiles,
      // Media proxy: /<token>.<ext>. Dicek setelah file di /public, jadi favicon dll tetap aman.
      afterFiles: [
        { source: "/:file([A-Za-z0-9_-]+\\.[A-Za-z0-9]{1,6})", destination: "/api/__x/:file" }
      ]
    };
  }
};

export default nextConfig;
