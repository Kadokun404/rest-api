import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import crypto from "node:crypto";
import { config, localKeys } from "./config.js";
import { kvGet, kvIncr, kvPipeline } from "./store.js";
import { getAccount, isOwnerId, isPremiumActive, getAccountLimit } from "./auth.js";

const CREATOR = "Kadokun";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
];

export const getRandomUserAgent = () => {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
};

export const plugins = new Map();

export const sendSuccess = (res, result = null, statusCode = 200) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(statusCode).send(
    JSON.stringify(
      {
        status: true,
        creator: CREATOR,
        result
      },
      null,
      2
    )
  );
};

export const sendError = (res, message = "Internal Server Error", statusCode = 500) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(statusCode).send(
    JSON.stringify(
      {
        status: false,
        creator: CREATOR,
        message
      },
      null,
      2
    )
  );
};

// ---------------------------------------------------------------------------
// API KEY
// ---------------------------------------------------------------------------

const sha256 = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

let keyIndexCache = { raw: null, index: new Map() };

// Index: sha256(key) -> entry. Dibangun ulang hanya kalau KAELYN_API_KEYS berubah.
const getKeyIndex = () => {
  const raw = process.env.KAELYN_API_KEYS || "";
  if (keyIndexCache.raw === raw) return keyIndexCache.index;

  let envKeys = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) envKeys = parsed;
    } catch {
      console.error("[ApiKey] KAELYN_API_KEYS bukan JSON yang valid, diabaikan");
    }
  }

  const index = new Map();
  for (const entry of [...localKeys, ...envKeys]) {
    if (entry && typeof entry.key === "string" && entry.key.length >= 16) {
      index.set(sha256(entry.key), entry);
    }
  }

  keyIndexCache = { raw, index };
  return index;
};

export const generateApiKey = () => {
  return `ka-${crypto.randomBytes(20).toString("base64url")}`;
};

export const maskApiKey = (key) => {
  if (!key || key.length <= 12) return "********";
  return `${key.slice(0, 3)}${"*".repeat(Math.min(8, key.length - 7))}${key.slice(-4)}`;
};

// Urutan baca: header x-api-key, Authorization: Bearer, lalu query ?apikey= / ?api_key=
export const getApiKeyFromRequest = (req) => {
  const headerName = (config.keyHeader || "x-api-key").toLowerCase();
  const fromHeader = req.headers?.[headerName];
  if (typeof fromHeader === "string" && fromHeader.trim()) return fromHeader.trim();

  const auth = req.headers?.authorization;
  if (typeof auth === "string" && /^bearer\s+/i.test(auth)) {
    const token = auth.replace(/^bearer\s+/i, "").trim();
    if (token) return token;
  }

  const fromQuery = req.query?.apikey || req.query?.api_key;
  if (typeof fromQuery === "string" && fromQuery.trim()) return fromQuery.trim();

  return null;
};

export const getClientIp = (req) => {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
};

const todayUTC = () => new Date().toISOString().slice(0, 10);
const quotaKey = (id) => `quota:${id}:${todayUTC()}`;

const secondsUntilReset = () => {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((next - now.getTime()) / 1000));
};

const getUsed = async (id) => Number((await kvGet(quotaKey(id))) || 0);
const incrUsage = (id) => kvIncr(quotaKey(id));

// Catat 1 hit untuk analitik harian (total + per-endpoint). Non-blocking.
export const recordHit = async (routePath) => {
  try {
    const day = todayUTC();
    const epKey = `hit:ep:${day}:${Buffer.from(String(routePath)).toString("base64url")}`;
    await kvPipeline([["INCR", `hit:total:${day}`], ["INCR", epKey]]);
  } catch {
    // analitik tidak boleh mengganggu request utama
  }
};

const isExpired = (entry) => {
  if (!entry.expires) return false;
  const time = Date.parse(entry.expires);
  if (isNaN(time)) return false;
  // Tanggal tanpa jam (YYYY-MM-DD) berlaku sampai akhir hari itu (UTC)
  const end = String(entry.expires).length <= 10 ? time + 24 * 60 * 60 * 1000 : time;
  return Date.now() > end;
};

const getPlan = (entry) => config.plans[entry.plan] || config.plans.free;

const getLimit = (entry) => {
  if (typeof entry.dailyLimit === "number") return entry.dailyLimit;
  return getPlan(entry).dailyLimit;
};

// ---------------------------------------------------------------------------
// Signed API key (stateless)
//
// Dipakai untuk key hasil pembelian (plan berbayar). Key tidak perlu disimpan
// di database: isinya diberi tanda tangan HMAC dengan secret server, sehingga
// bisa diverifikasi ulang tanpa penyimpanan persisten (cocok untuk Vercel).
// Format: ka-<base64url(payload)>.<base64url(hmac)>
// ---------------------------------------------------------------------------

const getSigningSecret = () =>
  process.env.KAELYN_SIGNING_SECRET ||
  process.env.QRIS_INTERNAL_TOKEN ||
  "kaelyn-local-dev-secret";

const signingKey = () =>
  crypto.createHash("sha256").update(`kaelyn-sign-v1:${getSigningSecret()}`).digest();

export const signApiKey = (entry = {}) => {
  const plan = entry.plan || "free";
  const payload = {
    p: plan,
    n: entry.name || "Customer",
    e: entry.expires || null,
    i: Date.now()
  };
  if (entry.a) payload.a = String(entry.a);

  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", signingKey()).update(data).digest("base64url");

  return `ka-${data}.${sig}`;
};

export const verifySignedApiKey = (key) => {
  if (typeof key !== "string") return null;

  const match = /^ka-([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(key);
  if (!match) return null;

  const [, data, sig] = match;
  const expected = crypto.createHmac("sha256", signingKey()).update(data).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!payload || typeof payload !== "object" || typeof payload.p !== "string") return null;

  const entry = { key, name: payload.n || "Customer", plan: payload.p };
  if (payload.e) entry.expires = payload.e;
  if (payload.a) entry.a = payload.a;
  if (isExpired(entry)) return null;

  return entry;
};

// Mengembalikan { entry } jika key valid, { none: true } jika tidak ada key, atau { error } jika bermasalah
export const resolveApiKey = (req) => {
  const provided = getApiKeyFromRequest(req);
  if (!provided) return { none: true };

  let entry = getKeyIndex().get(sha256(provided));
  if (!entry) entry = verifySignedApiKey(provided);
  if (!entry) return { error: { status: 401, message: "API key tidak valid" } };
  if (entry.disabled) return { error: { status: 403, message: "API key dinonaktifkan" } };
  if (isExpired(entry)) return { error: { status: 403, message: "API key sudah kedaluwarsa" } };

  return { entry, id: sha256(provided), provided };
};

export const describeApiKey = async (resolved) => {
  const { entry, id, provided } = resolved;

  let account = null;
  if (entry.plan === "user" && entry.a) account = await getAccount(entry.a);

  const quotaId = account ? `acct:${account.id}` : id;
  const limit = account ? getAccountLimit(account) : getLimit(entry);
  const used = await getUsed(quotaId);

  let plan = entry.plan || "free";
  let name = entry.name || "Tanpa nama";
  let premium = getPlan(entry).premium === true;
  let expires = entry.expires || null;
  let owner = false;

  if (account) {
    name = account.name || name;
    owner = isOwnerId(account.id);
    if (isPremiumActive(account)) {
      premium = true;
      plan = account.premium.plan;
      expires = account.premium.expires || null;
    } else {
      premium = owner ? true : false;
      plan = owner ? "owner" : "user";
    }
  }

  return {
    key: maskApiKey(provided),
    name,
    plan,
    premium,
    owner,
    daily_limit: limit > 0 ? limit : "unlimited",
    used_today: used,
    remaining_today: limit > 0 ? Math.max(0, limit - used) : "unlimited",
    resets_in_seconds: secondsUntilReset(),
    expires
  };
};

const applyRateHeaders = (res, limit, used) => {
  if (limit > 0) {
    res.setHeader("X-RateLimit-Limit", String(limit));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, limit - used)));
    res.setHeader("X-RateLimit-Reset", String(secondsUntilReset()));
  }
};

const consumeQuota = async (res, quotaId, limit) => {
  const used = await getUsed(quotaId);

  if (limit > 0 && used >= limit) {
    applyRateHeaders(res, limit, used);
    res.setHeader("Retry-After", String(secondsUntilReset()));
    sendError(res, "Batas request harian sudah habis. Reset setiap 00:00 UTC", 429);
    return false;
  }

  const next = await incrUsage(quotaId);
  applyRateHeaders(res, limit, next);
  return true;
};

// Dipanggil sebelum plugin dijalankan. Return true kalau boleh lanjut, false kalau response error sudah dikirim.
export const authorizeRequest = async (req, res, target) => {
  const needsPremium = target?.premium === true;
  const resolved = resolveApiKey(req);

  if (resolved.error) {
    sendError(res, resolved.error.message, resolved.error.status);
    return false;
  }

  if (resolved.none) {
    if (needsPremium) {
      sendError(
        res,
        "Endpoint ini khusus premium. Sertakan API key lewat header 'x-api-key' atau query '?apikey='",
        401
      );
      return false;
    }

    const anonLimit = Number(config.anonymousDailyLimit) || 0;
    if (anonLimit > 0) {
      return consumeQuota(res, `ip:${getClientIp(req)}`, anonLimit);
    }
    return true;
  }

  const { entry, id } = resolved;

  let account = null;
  if (entry.plan === "user" && entry.a) {
    account = await getAccount(entry.a);
    if (!account) {
      sendError(res, "Akun tidak ditemukan. Login ulang untuk key baru.", 404);
      return false;
    }
  }

  let isPremium = getPlan(entry).premium === true;
  if (account) isPremium = isOwnerId(account.id) || isPremiumActive(account);

  if (needsPremium && !isPremium) {
    const label = account ? "user gratis" : `'${entry.plan || "free"}'`;
    sendError(res, `Plan ${label} tidak punya akses ke endpoint premium`, 403);
    return false;
  }

  req.apiKeyInfo = {
    name: account?.name || entry.name || null,
    plan: account ? (account.premium?.plan || (isOwnerId(account.id) ? "owner" : "user")) : entry.plan || "free",
    premium: isPremium
  };

  const quotaId = account ? `acct:${account.id}` : id;
  const limit = account ? getAccountLimit(account) : getLimit(entry);
  return consumeQuota(res, quotaId, limit);
};

export const safeFetch = async (url, options = {}, timeoutMs = 20000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let combinedSignal = controller.signal;
  if (options.signal) {
    if (typeof AbortSignal.any === "function") {
      combinedSignal = AbortSignal.any([controller.signal, options.signal]);
    } else {
      options.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  try {
    const res = await fetch(url, {
      ...options,
      signal: combinedSignal,
      headers: {
        "User-Agent": getRandomUserAgent(),
        "Connection": "keep-alive",
        ...(options.headers || {})
      }
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
};

// Request ke gateway QRIS. Token internal hanya ditambahkan di sisi server.
export const qrisRequest = async (path, { method = "GET", query, body, signal } = {}) => {
  const token = process.env.QRIS_INTERNAL_TOKEN || config.qrisInternalToken;
  if (!token) {
    throw new Error("Gateway QRIS belum dikonfigurasi (QRIS_INTERNAL_TOKEN kosong)");
  }

  const base = (process.env.QRIS_BASE_URL || config.qrisBaseUrl).replace(/\/+$/, "");
  const qs = query ? `?${new URLSearchParams(query).toString()}` : "";
  const headers = { "x-internal-token": token, Accept: "application/json" };
  const options = { method, headers, signal };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const response = await safeFetch(`${base}${path}${qs}`, options, 25000);
  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message = data?.message || data?.error || `Gateway QRIS error (${response.status})`;
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }

  return data;
};

export const pipeStream = async (url, res, options = {}, timeoutMs = 30000) => {
  const response = await safeFetch(url, options, timeoutMs);
  if (!response.ok) {
    throw new Error(`Gagal membuka stream media (${response.status})`);
  }

  const contentType = response.headers.get("content-type");
  const contentLength = response.headers.get("content-length");

  if (contentType) res.setHeader("Content-Type", contentType);
  if (contentLength) res.setHeader("Content-Length", contentLength);
  res.setHeader("Accept-Ranges", "bytes");

  const readable = Readable.fromWeb(response.body);
  readable.pipe(res);

  return new Promise((resolve, reject) => {
    readable.on("end", resolve);
    readable.on("error", reject);
    res.on("close", () => {
      readable.destroy();
      resolve();
    });
  });
};

export const downloadBuffer = async (url, options = {}, timeoutMs = 30000) => {
  const res = await safeFetch(url, options, timeoutMs);
  if (!res.ok) {
    throw new Error(`Failed to download buffer (${res.status})`);
  }
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
};

const cacheStorage = new Map();

export const getCache = (key) => {
  const cached = cacheStorage.get(key);
  if (!cached) return null;

  if (Date.now() > cached.expireAt) {
    cacheStorage.delete(key);
    return null;
  }

  return cached.data;
};

export const setCache = (key, data, ttlSeconds = 60) => {
  const memUsage = process.memoryUsage().rss / 1024 / 1024;
  if (memUsage > 180 || cacheStorage.size > 1500) {
    const purgeCount = Math.floor(cacheStorage.size * 0.3);
    const iterator = cacheStorage.keys();
    for (let i = 0; i < purgeCount; i++) {
      const nextKey = iterator.next().value;
      if (nextKey) cacheStorage.delete(nextKey);
    }
  }

  cacheStorage.set(key, {
    data,
    expireAt: Date.now() + ttlSeconds * 1000
  });
};

export const purgeAllCache = () => {
  const size = cacheStorage.size;
  cacheStorage.clear();
  return size;
};

const cleanTimer = setInterval(() => {
  const now = Date.now();
  for (const [k, v] of cacheStorage.entries()) {
    if (now > v.expireAt) {
      cacheStorage.delete(k);
    }
  }

  if (process.memoryUsage().rss / 1024 / 1024 > 220) {
    cacheStorage.clear();
    if (global.gc) {
      global.gc();
    }
  }
}, 180000);

if (cleanTimer.unref) {
  cleanTimer.unref();
}

export const extractAndValidateInput = (schema, req) => {
  const input = { ...(req.query || {}), ...(req.body || {}) };

  if (!schema || typeof schema !== "object") {
    return { input, error: null };
  }

  for (const [key, config] of Object.entries(schema)) {
    const isRequired = typeof config === "object" ? config.required : false;
    let val = input[key];

    if (val === undefined || val === null || val === "") {
      if (isRequired) {
        const desc = typeof config === "object" && config.description ? ` (${config.description})` : "";
        return { input: null, error: `Parameter '${key}' wajib diisi${desc}` };
      }
      continue;
    }

    if (typeof config === "object" && config.type) {
      if (config.type === "number") {
        const num = Number(val);
        if (isNaN(num)) {
          return { input: null, error: `Parameter '${key}' harus berupa angka numerik` };
        }
        input[key] = num;
      } else if (config.type === "boolean") {
        input[key] = val === "true" || val === true || val === 1 || val === "1";
      }
    }
  }

  return { input, error: null };
};

// ---------------------------------------------------------------------------
// Plugin loader
//
// Plugin di src/plugins/<kategori>/<nama>.js didaftarkan lewat manifest statis
// (src/plugin-manifest.js) yang dibuat otomatis oleh scripts/gen-plugin-manifest.mjs
// (jalan otomatis di `npm run dev` dan `npm run build`). Dengan begitu bundler Next.js
// melacak semua plugin dan Vercel membawanya ke serverless function.
// Setelah menambah file plugin baru, jalankan ulang `npm run dev` / `npm run build`.
// ---------------------------------------------------------------------------
import { pluginManifest } from "./plugin-manifest.js";

const registerPlugin = async (entry) => {
  const mod = await entry.load();
  const handler = mod?.default || mod;
  if (!handler || typeof handler.execute !== "function") return null;

  const category = String(handler.category || entry.category).toLowerCase();
  const pluginObj = {
    name: handler.name || entry.name,
    category: handler.category || entry.category,
    path: entry.routePath,
    method: (handler.method || ["GET"]).map((m) => m.toUpperCase()),
    description: handler.description || "",
    params: handler.params || {},
    premium: typeof handler.premium === "boolean" ? handler.premium : category === "premium",
    cache: typeof handler.cache === "number" ? handler.cache : null,
    timeout: typeof handler.timeout === "number" ? handler.timeout : 60000,
    execute: handler.execute
  };

  plugins.set(entry.routePath, pluginObj);
  return pluginObj;
};

export const loadAllPlugins = async () => {
  for (const entry of pluginManifest) {
    try {
      await registerPlugin(entry);
    } catch (err) {
      console.error(`[Plugin Load Failed] ${entry.routePath}:`, err.message);
    }
  }
};

export const resolveSingleRouteOnDemand = async (category, pluginName) => {
  const routePath = `/${category}/${pluginName}`.toLowerCase();
  const entry = pluginManifest.find((e) => e.routePath === routePath);
  if (!entry) return null;
  try {
    return await registerPlugin(entry);
  } catch (err) {
    console.error(`[Plugin Load Failed] ${entry.routePath}:`, err.message);
    return null;
  }
};
