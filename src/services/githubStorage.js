import crypto from "node:crypto";
import path from "node:path";
import { inferExt } from "../mediaProxy.js";

const DEFAULT_REPO = "mommyara/uploader";
const DEFAULT_BRANCH = "main";

/**
 * Upload buffer file ke repositori GitHub storage (mommyara/uploader)
 * dan mengembalikan URL CDN jsDelivr serta raw GitHub.
 *
 * @param {Buffer} buffer - Buffer file yang akan diunggah
 * @param {string} originalName - Nama file asli
 * @param {string} [mimetype] - MIME type file
 * @returns {Promise<{
 *   path: string,
 *   cdn_url: string,
 *   raw_url: string,
 *   github_url: string,
 *   size: number,
 *   sha: string
 * }>}
 */
export async function uploadToGitHub(buffer, originalName = "file", mimetype = "application/octet-stream") {
  if (!Buffer.isBuffer(buffer)) {
    if (buffer instanceof ArrayBuffer) {
      buffer = Buffer.from(buffer);
    } else if (typeof buffer === "string") {
      buffer = Buffer.from(buffer);
    } else {
      throw new Error("Buffer file tidak valid");
    }
  }

  const repo = process.env.GITHUB_UPLOAD_REPO || DEFAULT_REPO;
  const branch = process.env.GITHUB_UPLOAD_BRANCH || DEFAULT_BRANCH;
  const token = process.env.GITHUB_UPLOAD_TOKEN || process.env.ARA_GITHUB_TOKEN;

  if (!token) {
    throw new Error("GITHUB_UPLOAD_TOKEN belum dikonfigurasi");
  }

  const ext = inferExt(originalName, "");
  const baseName = path.basename(originalName || "file")
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 40) || "file";

  const fullName = ext ? `${baseName}.${ext}` : baseName;
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const randomHex = crypto.randomBytes(3).toString("hex");

  const filePath = `uploads/${year}/${month}/${day}/${Date.now()}_${randomHex}_${fullName}`;
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${encodeURI(filePath)}`;

  const res = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "User-Agent": "Arashi-Uploader/1.0",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `upload: ${fullName}`,
      content: buffer.toString("base64"),
      branch
    })
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.content) {
    const errorMsg = data?.message || `GitHub API error (${res.status})`;
    throw new Error(`Gagal upload ke GitHub: ${errorMsg}`);
  }

  const raw_url = `https://raw.githubusercontent.com/${repo}/${branch}/${filePath}`;
  const cdn_url = `https://cdn.jsdelivr.net/gh/${repo}@${branch}/${filePath}`;
  const github_url = data.content.html_url || `https://github.com/${repo}/blob/${branch}/${filePath}`;

  return {
    path: filePath,
    cdn_url,
    raw_url,
    github_url,
    size: buffer.length,
    sha: data.content.sha
  };
}
