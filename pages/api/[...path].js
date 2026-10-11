// Jembatan Next.js -> Express.
// Semua route backend (/api/*, /<kategori>/<plugin>, /upload, /<token>.<ext>) lewat sini.
// Rute non-/api di-rewrite ke /api/__x/... oleh next.config.mjs, lalu URL aslinya dipulihkan di bawah.
import app from "../../src/app.js";

export const config = {
  api: { bodyParser: false, responseLimit: false, externalResolver: true },
  maxDuration: 60
};

const PREFIX = "/api/__x";

function restoreUrl(req) {
  const raw = req.url || "/";
  const qIndex = raw.indexOf("?");
  let pathname = qIndex === -1 ? raw : raw.slice(0, qIndex);
  const search = qIndex === -1 ? "" : raw.slice(qIndex + 1);

  const injected = Array.isArray(req.query?.path) ? req.query.path : req.query?.path ? [req.query.path] : [];

  if (pathname === PREFIX || pathname.startsWith(PREFIX + "/")) {
    pathname = pathname.slice(PREFIX.length) || "/";
  }

  // Buang parameter "path" yang disisipkan Next dari nama file [...path].
  const params = new URLSearchParams(search);
  if (params.has("path") && injected.length) {
    const all = params.getAll("path").join("/");
    const expected = injected.join("/");
    if (all === expected || all === expected.replace(/^__x\//, "")) params.delete("path");
  }

  const qs = params.toString();
  return pathname + (qs ? "?" + qs : "");
}

export default function handler(req, res) {
  req.url = restoreUrl(req);
  // Express mengisi req.query sendiri; kosongkan versi milik Next agar tidak bentrok.
  try {
    req.query = undefined;
  } catch {}

  return new Promise((resolve) => {
    res.on("finish", resolve);
    res.on("close", resolve);
    app(req, res);
  });
}
