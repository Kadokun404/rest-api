import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// Store persisten (Vercel KV / Upstash Redis REST) dengan fallback in-memory.
// Dipakai untuk: akun user, kuota harian per-akun, dan analitik hit API.
//
// Env yang dibaca (penamaan Upstash diprioritaskan, dukung juga nama KV Vercel):
//   UPSTASH_REDIS_REST_URL / KV_REST_API_URL
//   UPSTASH_REDIS_REST_TOKEN / KV_REST_API_TOKEN
// ---------------------------------------------------------------------------

const KV_URL = (
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL ||
  ""
).replace(/\/+$/, "");
const KV_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  "";

export const hasKv = Boolean(KV_URL && KV_TOKEN);

const mem = new Map();

export const todayUTC = () => new Date().toISOString().slice(0, 10);

const rest = async (path, options = {}) => {
  const res = await fetch(`${KV_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    throw new Error(`KV error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json();
};

const restPost = (commands) =>
  rest("/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(commands)
  });

// Upstash mengembalikan { result: ... } untuk 1 command, dan [{result:...},...]
// untuk pipeline. Unwrap ke nilai polos.
const unwrap = (j) =>
  j && typeof j === "object" && !Array.isArray(j) && "result" in j ? j.result : j;

const encodeKey = (key) => encodeURIComponent(String(key));

export const kvGet = async (key) => {
  if (!hasKv) return mem.has(key) ? mem.get(key) : null;
  const j = await rest(`/get/${encodeKey(key)}`);
  return j.result === null || j.result === undefined ? null : j.result;
};

export const kvSet = async (key, value) => {
  if (!hasKv) { mem.set(key, value); return "OK"; }
  return restPost(["SET", String(key), typeof value === "string" ? value : JSON.stringify(value)]);
};

// SET dengan TTL (detik). Dipakai untuk pemetaan media sementara.
export const kvSetEx = async (key, value, ttlSeconds) => {
  const ttl = Math.max(1, Math.floor(Number(ttlSeconds) || 0));
  if (!hasKv) { mem.set(key, value); return "OK"; }
  return restPost([
    "SET",
    String(key),
    typeof value === "string" ? value : JSON.stringify(value),
    "EX",
    String(ttl)
  ]);
};

export const kvDel = async (key) => {
  if (!hasKv) { mem.delete(key); return 1; }
  const j = await rest(`/del/${encodeKey(key)}`);
  return Number(j.result ?? 0);
};

export const kvIncr = async (key) => {
  if (!hasKv) {
    const next = Number(mem.get(key) || 0) + 1;
    mem.set(key, String(next));
    return next;
  }
  const result = unwrap(await restPost(["INCR", String(key)]));
  return Number(result ?? 0);
};

export const kvHost = () => (hasKv ? KV_URL.replace(/^https?:\/\//, "") : "memory");

export const kvScan = async (match) => {
  if (!hasKv) {
    const prefix = match.endsWith("*") ? match.slice(0, -1) : match;
    return [...mem.keys()].filter((k) => k.startsWith(prefix));
  }
  const keys = [];
  let cursor = "0";
  do {
    const j = await rest(`/scan/${cursor}?match=${encodeKey(match)}&count=200`);
    const [next, batch] = Array.isArray(j.result) ? j.result : ["0", []];
    if (Array.isArray(batch)) keys.push(...batch);
    cursor = String(next || "0");
  } while (cursor && cursor !== "0" && keys.length < 2000);
  return keys;
};

// Pipeline: satu HTTP call untuk banyak perintah. Support INCR, GET, SET, MGET.
export const kvPipeline = async (commands) => {
  if (!hasKv) {
    return commands.map((cmd) => {
      const op = String(cmd[0]).toUpperCase();
      if (op === "INCR") {
        const n = Number(mem.get(cmd[1]) || 0) + 1;
        mem.set(cmd[1], String(n));
        return n;
      }
      if (op === "GET") return mem.has(cmd[1]) ? mem.get(cmd[1]) : null;
      if (op === "SET") { mem.set(cmd[1], cmd[2]); return "OK"; }
      if (op === "MGET") return (cmd.slice(1) || []).map((k) => (mem.has(k) ? mem.get(k) : null));
      return "OK";
    });
  }
  const j = await rest("/pipeline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(commands)
  });
  return Array.isArray(j) ? j.map(unwrap) : j;
};

export const kvMGet = async (keys) => {
  if (!keys || keys.length === 0) return [];
  if (!hasKv) return keys.map((k) => (mem.has(k) ? mem.get(k) : null));
  const result = unwrap(await restPost(["MGET", ...keys.map(String)]));
  return Array.isArray(result) ? result : [];
};

export const kvGetJSON = async (key, fallback = null) => {
  const raw = await kvGet(key);
  if (raw === null) return fallback;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return fallback;
  }
};

export const kvSetJSON = (key, value) => kvSet(key, JSON.stringify(value));

// Ganti / inisialisasi secret pembatas antara nil & kv (nipis)
export default {
  hasKv,
  get: kvGet,
  set: kvSet,
  setEx: kvSetEx,
  del: kvDel,
  incr: kvIncr,
  scan: kvScan,
  pipeline: kvPipeline,
  mget: kvMGet,
  getJSON: kvGetJSON,
  setJSON: kvSetJSON,
  todayUTC
};