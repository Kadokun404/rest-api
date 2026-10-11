import crypto from "node:crypto";
import { kvGet, kvSet, kvSetEx } from "./store.js";

// ---------------------------------------------------------------------------
// Media proxy: mengubah URL media eksternal menjadi tautan pendek di domain
// sendiri (mis. https://api.kadokunn.com/ab12c.mp3) lalu mengalihkan (302) ke
// URL asli. Pemetaan id -> URL disimpan di KV (Upstash/Vercel KV) dengan TTL.
// ---------------------------------------------------------------------------

const TTL_SECONDS = 60 * 60; // 1 jam
const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const ID_LEN = 5;
const KEY_PREFIX = "media:";
const DEFAULT_EXT = "bin";

const randomId = () => {
  const bytes = crypto.randomBytes(ID_LEN);
  let out = "";
  for (let i = 0; i < ID_LEN; i++) out += ID_ALPHABET[bytes[i] % ID_ALPHABET.length];
  return out;
};

export const inferExt = (urlpath, fallback = DEFAULT_EXT) => {
  try {
    const path = /^https?:\/\//i.test(urlpath) ? new URL(urlpath).pathname : String(urlpath || "");
    const match = path.match(/\.([a-z0-9]{1,6})(?:$|\?)/i);
    if (match) return match[1].toLowerCase();
  } catch {}
  return fallback;
};

const sanitizeExt = (ext) => (ext || "").replace(/[^a-z0-9]/gi, "").slice(0, 6) || DEFAULT_EXT;

const storeMedia = async (url, ext) => {
  const finalExt = sanitizeExt(ext || inferExt(url));
  const id = randomId();
  const payload = JSON.stringify({ u: String(url), e: Date.now() + TTL_SECONDS * 1000 });
  await kvSetEx(KEY_PREFIX + id, payload, TTL_SECONDS);
  return `/${id}.${finalExt}`;
};

// Pemetaan permanen (tanpa TTL). Dipakai untuk file hasil upload user.
const storeMediaPermanent = async (url, ext) => {
  const finalExt = sanitizeExt(ext || inferExt(url));
  const id = randomId();
  await kvSet(KEY_PREFIX + id, JSON.stringify({ u: String(url), p: true }));
  return `/${id}.${finalExt}`;
};

const getBaseUrl = (req) => {
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/+$/, "");
  }

  const proto = String(
    req?.headers?.["x-forwarded-proto"] || req?.protocol || "https"
  ).split(",")[0].trim();

  const host = String(
    req?.headers?.["x-forwarded-host"] || req?.headers?.host || "api.kadokunn.com"
  ).split(",")[0].trim();

  return `${proto}://${host}`;
};

// Ubah URL media jadi tautan proxy pada domain sendiri. Non-media dikembalikan apa adanya.
export const buildProxiedUrl = async (req, mediaUrl, ext) => {
  if (!mediaUrl || typeof mediaUrl !== "string") return mediaUrl;
  if (!/^https?:\/\//i.test(mediaUrl)) return mediaUrl;
  return getBaseUrl(req) + (await storeMedia(mediaUrl, ext));
};

// Sama seperti buildProxiedUrl tapi tautan tidak kedaluwarsa (untuk file upload).
export const buildPermanentUrl = async (req, mediaUrl, ext) => {
  if (!mediaUrl || typeof mediaUrl !== "string") return mediaUrl;
  if (!/^https?:\/\//i.test(mediaUrl)) return mediaUrl;
  return getBaseUrl(req) + (await storeMediaPermanent(mediaUrl, ext));
};

// Telusuri objek/array dan proxy nilai string pada field yang ditentukan.
export const proxyUrlFields = async (req, value, fields) => {
  const set = fields instanceof Set ? fields : new Set(fields);

  const walk = async (v) => {
    if (Array.isArray(v)) return Promise.all(v.map(walk));
    if (v && typeof v === "object") {
      const out = {};
      for (const [k, val] of Object.entries(v)) {
        out[k] =
          set.has(k) && typeof val === "string" && /^https?:\/\//i.test(val)
            ? await buildProxiedUrl(req, val)
            : await walk(val);
      }
      return out;
    }
    return v;
  };

  return walk(value);
};

export const proxyUrlList = async (req, list) =>
  Array.isArray(list) ? Promise.all(list.map((u) => buildProxiedUrl(req, u))) : list;

// Handler Express untuk route GET /<id>.<ext>
export const handleMediaProxy = async (req, res) => {
  const id = req.params[0];
  try {
    const raw = await kvGet(KEY_PREFIX + id);
    if (!raw) throw new Error("tidak ditemukan");

    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!obj || typeof obj.u !== "string" || !/^https?:\/\//i.test(obj.u)) {
      throw new Error("payload tidak valid");
    }
    if (obj.e && Date.now() > obj.e) throw new Error("kedaluwarsa");

    res.setHeader("Cache-Control", "no-store");
    return res.redirect(302, obj.u);
  } catch {
    return res.status(404).json({
      status: false,
      creator: "Kadokun",
      message: "Tautan media tidak valid atau sudah kedaluwarsa"
    });
  }
};
