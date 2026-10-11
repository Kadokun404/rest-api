import crypto from "node:crypto";
import { todayUTC, kvGetJSON, kvSetJSON } from "./store.js";
import { signApiKey } from "./function.js";
import { config } from "./config.js";

// ---------------------------------------------------------------------------
// Auth: login Telegram (Login Widget) & GitHub (OAuth), sesi cookie bertanda
// tangan (stateless), akun + API key per-akun, pengecekan owner.
// ---------------------------------------------------------------------------

const b64url = (buf) => Buffer.from(buf).toString("base64url");

const sessionSecret = () => {
  const raw =
    process.env.AUTH_SESSION_SECRET ||
    process.env.KAELYN_SIGNING_SECRET ||
    process.env.QRIS_INTERNAL_TOKEN ||
    "kaelyn-local-session-secret";
  return crypto.createHash("sha256").update(`kaelyn-session:v1:${raw}`).digest();
};

// ---------------- cookie helpers ----------------

export const parseCookies = (req) => {
  const out = {};
  const header = req.headers?.cookie || "";
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (name) out[name] = decodeURIComponent(value);
  });
  return out;
};

export const buildCookie = (name, value, { maxAge = 30 * 86400, httpOnly = true, secure = false, path = "/" } = {}) =>
  `${name}=${encodeURIComponent(value)}; Path=${path}; Max-Age=${maxAge}; SameSite=Lax${httpOnly ? "; HttpOnly" : ""}${secure ? "; Secure" : ""}`;

const signSession = (payload) => {
  const data = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = crypto.createHmac("sha256", sessionSecret()).update(data).digest("base64url");
  return `v1.${data}.${sig}`;
};

const verifySession = (token) => {
  if (typeof token !== "string") return null;
  const match = /^v1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(token);
  if (!match) return null;
  const [, data, sig] = match;
  const expected = crypto.createHmac("sha256", sessionSecret()).update(data).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  } catch {
    return null;
  }
};

export const getSessionPayload = (req) => {
  const cookies = parseCookies(req);
  const payload = verifySession(cookies.kae_sess || "");
  return payload || null;
};

export const sessionCookie = (accountId, secure = false) => {
  const token = signSession({ a: accountId, ts: Date.now() });
  return buildCookie("kae_sess", token, { secure });
};

export const setSessionCookie = (res, accountId, secure) => {
  res.setHeader("Set-Cookie", sessionCookie(accountId, secure));
};

export const clearSessionCookie = (res) => {
  res.setHeader("Set-Cookie", buildCookie("kae_sess", "", { maxAge: 0, secure: false }));
};

// ---------------- account store ----------------

const accountKey = (id) => `account:${id}`;

export const getAccount = async (id) => kvGetJSON(accountKey(id));

export const saveAccount = async (acct) => {
  await kvSetJSON(accountKey(acct.id), acct);
  return acct;
};

// Buat / update akun dari data provider, lengkapi API key akun kalau belum ada
export const upsertAccount = async (profile) => {
  let acct = await getAccount(profile.id);
  if (!acct) {
    acct = {
      id: profile.id,
      provider: profile.provider,
      name: profile.name || "User",
      username: profile.username || null,
      photo: profile.photo || null,
      email: profile.email || null,
      createdAt: todayUTC(),
      premium: null,
      apiKey: null
    };
  } else {
    if (profile.name) acct.name = profile.name;
    if (profile.username != null) acct.username = profile.username;
    if (profile.photo) acct.photo = profile.photo;
    if (profile.email) acct.email = profile.email;
  }
  if (!acct.apiKey) {
    acct.apiKey = signApiKey({ plan: "user", name: acct.name, a: acct.id });
  }
  await saveAccount(acct);
  return acct;
};

export const rotateAccountKey = async (acct) => {
  acct.apiKey = signApiKey({ plan: "user", name: acct.name || "User", a: acct.id });
  await saveAccount(acct);
  return acct.apiKey;
};

// ---------------- owner & premium & quota ----------------

export const isOwnerId = (id) =>
  (process.env.KAELYN_OWNER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(id);

export const isPremiumActive = (acct) => {
  if (!acct?.premium) return false;
  if (acct.premium.unlimited) return true;
  if (!acct.premium.expires) return true;
  const time = Date.parse(acct.premium.expires);
  if (isNaN(time)) return true;
  const end = String(acct.premium.expires).length <= 10 ? time + 86400000 : time;
  return Date.now() < end;
};

// 0 = unlimited. Owner > premium paket > user baru (100) > 50/hari.
export const getAccountLimit = (acct) => {
  if (!acct) return 50;
  if (isOwnerId(acct.id)) return 0;
  if (isPremiumActive(acct)) {
    const p = config.plans[acct.premium.plan] || config.plans.free;
    if (p.unlimited) return 0;
    return Number(p.dailyLimit) || 0;
  }
  if (acct.createdAt === todayUTC()) return 100;
  return 50;
};

export const accountView = (acct) => ({
  id: acct.id,
  provider: acct.provider,
  name: acct.name,
  username: acct.username || null,
  photo: acct.photo || null,
  email: acct.email || null,
  createdAt: acct.createdAt,
  owner: isOwnerId(acct.id),
  premium: isPremiumActive(acct)
    ? {
        plan: acct.premium.plan,
        label: acct.premium.label || acct.premium.plan,
        unlimited: !!acct.premium.unlimited,
        expires: acct.premium.expires || null
      }
    : null
});

// ---------------- Telegram Login Widget ----------------

const safeEqual = (a, b) => {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

export const verifyTelegramLogin = (data = {}) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { error: "Telegram belum dikonfigurasi (TELEGRAM_BOT_TOKEN kosong)" };
  }

  const hash = data.hash;
  const authDate = data.auth_date;
  if (!hash || !authDate) {
    return { error: "Data login Telegram tidak lengkap" };
  }

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(authDate));
  if (!Number.isFinite(Number(authDate)) || ageSeconds > 86400) {
    return { error: "Login Telegram sudah kedaluwarsa" };
  }

  const secretKey = crypto.createHash("sha256").update(token).digest();
  const checkString = Object.entries(data)
    .filter(([k]) => k !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const computed = crypto.createHmac("sha256", secretKey).update(checkString).digest("hex");

  if (!safeEqual(computed, hash)) {
    return { error: "Verifikasi login Telegram gagal" };
  }

  const name = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
  return {
    id: `tg:${data.id}`,
    provider: "telegram",
    name: name || data.username || `Telegram ${data.id}`,
    username: data.username || null,
    photo: data.photo_url || null
  };
};

// ---------------- GitHub OAuth ----------------

export const githubEnabled = () => Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);

const githubCallbackUrl = (origin) =>
  process.env.GITHUB_CALLBACK_URL || `${origin.replace(/\/+$/, "")}/api/auth/github/callback`;

export const githubLoginUrl = (origin, state) => {
  if (!githubEnabled()) return null;
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: githubCallbackUrl(origin),
    scope: "read:user user:email",
    state
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
};

export const githubExchange = async (origin, code) => {
  if (!githubEnabled()) {
    return { error: "GitHub login belum dikonfigurasi" };
  }
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: githubCallbackUrl(origin)
    })
  });
  const tokenData = await res.json();
  if (!tokenData.access_token) {
    return { error: tokenData.error_description || tokenData.error || "GitHub OAuth gagal" };
  }

  const me = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: "application/json", "User-Agent": "kaelyn-api" }
  }).then((r) => r.json());

  const login = me.login || String(me.id);
  return {
    id: `gh:${login}`,
    provider: "github",
    name: me.name || login,
    username: login,
    photo: me.avatar_url || null,
    email: me.email || null
  };
};

// ---------------- helpers dipakai app.js ----------------

export const authConfig = () => ({
  telegram: {
    enabled: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME),
    username: process.env.TELEGRAM_BOT_USERNAME || null
  },
  github: {
    enabled: githubEnabled()
  }
});

export const dayKey = (scope, id) => `quota:${scope}:${id}:${todayUTC()}`;