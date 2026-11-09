import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import multer from "multer";
import {
  plugins,
  loadAllPlugins,
  resolveSingleRouteOnDemand,
  sendSuccess,
  sendError,
  extractAndValidateInput,
  getCache,
  setCache,
  authorizeRequest,
  resolveApiKey,
  describeApiKey,
  signApiKey,
  qrisRequest,
  recordHit,
  safeFetch
} from "./function.js";
import {
  getSessionPayload,
  setSessionCookie,
  clearSessionCookie,
  sessionCookie,
  parseCookies,
  upsertAccount,
  getAccount,
  saveAccount,
  rotateAccountKey,
  verifyTelegramLogin,
  getAccountLimit,
  accountView,
  authConfig,
  githubEnabled,
  githubLoginUrl,
  githubExchange,
  googleEnabled,
  googleLoginUrl,
  googleExchange,
  dayKey
} from "./auth.js";
import { config } from "./config.js";
import { todayUTC, kvGet, kvSet, kvSetEx, kvDel, kvScan, kvMGet } from "./store.js";
import { sendVerificationEmail } from "./mail.js";
import { handleMediaProxy, buildPermanentUrl, inferExt } from "./mediaProxy.js";

const app = express();

app.set("json spaces", 2);

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  const originalSend = res.send;
  res.send = function (body) {
    if (
      typeof body === "string" &&
      body.length > 1024 &&
      req.headers["accept-encoding"] &&
      req.headers["accept-encoding"].includes("gzip") &&
      !res.getHeader("Content-Encoding")
    ) {
      res.setHeader("Content-Encoding", "gzip");
      res.removeHeader("Content-Length");
      zlib.gzip(Buffer.from(body), (err, zipped) => {
        if (!err) {
          originalSend.call(this, zipped);
        } else {
          originalSend.call(this, body);
        }
      });
      return res;
    }
    return originalSend.call(this, body);
  };

  next();
});

let initialized = false;
app.use(async (req, res, next) => {
  if (!initialized) {
    try {
      await loadAllPlugins();
    } catch (err) {
      console.error("[Init Error]:", err.message);
    }
    initialized = true;
  }
  next();
});

// Banner maintenance di front-end. Atur lewat env di Vercel:
//   MAINTENANCE_ENABLED=true
//   MAINTENANCE_MESSAGE="Server sedang dalam perbaikan ..."
app.get("/api/maintenance", (req, res) => {
  const enabled = ["1", "true", "yes", "on"].includes(String(process.env.MAINTENANCE_ENABLED || "").toLowerCase());
  return sendSuccess(res, {
    enabled,
    message: process.env.MAINTENANCE_MESSAGE || "Server sedang dalam perbaikan (maintenance). Silakan coba lagi nanti."
  });
});

app.get("/api/endpoints", async (req, res) => {
  try {
    await loadAllPlugins();
  } catch {}

  const endpoints = {};

  for (const [routePath, data] of plugins.entries()) {
    const category = data.category || "general";

    if (!endpoints[category]) {
      endpoints[category] = [];
    }

    endpoints[category].push({
      name: data.name,
      category: data.category,
      endpoint: routePath,
      method: data.method,
      description: data.description,
      premium: data.premium === true,
      params: data.params
    });
  }

  return sendSuccess(res, {
    total: plugins.size,
    endpoints
  });
});

app.get("/api/checkkey", async (req, res) => {
  const resolved = resolveApiKey(req);

  if (resolved.none) {
    return sendError(res, "API key tidak ditemukan. Kirim lewat header 'x-api-key' atau query '?apikey='", 401);
  }

  if (resolved.error) {
    return sendError(res, resolved.error.message, resolved.error.status);
  }

  return sendSuccess(res, await describeApiKey(resolved));
});

// ---------------------------------------------------------------------------
// Auth & akun (login Telegram / GitHub, sesi cookie, kuota per-akun)
// ---------------------------------------------------------------------------

const requestOrigin = (req) => {
  const proto = req.headers["x-forwarded-proto"]?.split(",")[0]?.trim() || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`.replace(/\/+$/, "");
};

const isSecureReq = (req) => requestOrigin(req).startsWith("https");

const currentAccount = async (req) => {
  const payload = getSessionPayload(req);
  if (!payload?.a) return null;
  return getAccount(payload.a);
};

const resetsInUtc = () => {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((next - now.getTime()) / 1000));
};

const quotaStatus = async (acct) => {
  const limit = getAccountLimit(acct);
  const used = Number((await kvGet(dayKey("acct", acct.id))) || 0);
  return {
    daily_limit: limit > 0 ? limit : "unlimited",
    used_today: used,
    remaining_today: limit > 0 ? Math.max(0, limit - used) : "unlimited",
    resets_in_seconds: resetsInUtc()
  };
};

app.get("/api/auth/config", (req, res) => {
  return sendSuccess(res, authConfig());
});

app.get("/api/auth/session", async (req, res) => {
  const acct = await currentAccount(req);
  if (!acct) {
    return sendError(res, "Belum login", 401);
  }
  return sendSuccess(res, {
    account: accountView(acct),
    quota: await quotaStatus(acct),
    api_key: acct.apiKey || null
  });
});

app.post("/api/auth/logout", (req, res) => {
  clearSessionCookie(res);
  return sendSuccess(res, { logged_out: true });
});

async function verifyTurnstileToken(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY || "0x4AAAAAAF5bdCsIbeAJYsg8AF4ZfQMd2k0";
  if (!secret) return true;
  if (!token) return false;
  try {
    const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        ...(ip ? { remoteip: ip } : {})
      })
    });
    const result = await resp.json();
    return Boolean(result.success);
  } catch (err) {
    console.error("[Turnstile] verification error:", err.message);
    return false;
  }
}

app.post("/api/auth/login", async (req, res) => {
  const turnstileToken = req.body?.turnstileToken || req.headers["cf-turnstile-response"];
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress;
  const isHuman = await verifyTurnstileToken(turnstileToken, ip);
  if (!isHuman) {
    return sendError(res, "Security verification failed. Please complete the verification.", 403);
  }

  const login = String(req.body?.login || req.body?.username || req.body?.email || "").trim();
  const password = String(req.body?.password || "");

  if (!login || !password) {
    return sendError(res, "Email/Username dan password wajib diisi", 400);
  }

  // 1. Akun Master Admin: admin@kadokunn.com / arasange223
  if (login.toLowerCase() === "admin@kadokunn.com" || login.toLowerCase() === "admin") {
    if (password === "arasange223") {
      let adminAcct = await getAccount("local:admin");
      if (!adminAcct) {
        adminAcct = {
          id: "local:admin",
          provider: "local",
          name: "Kadokun (Admin)",
          username: "admin",
          email: "admin@kadokunn.com",
          role: "admin",
          dev: true,
          createdAt: todayUTC(),
          premium: { plan: "vip", label: "Dev & Owner (Unlimited)", unlimited: true, expires: null },
          apiKey: null
        };
      }
      adminAcct.role = "admin";
      adminAcct.dev = true;
      if (!adminAcct.apiKey) {
        adminAcct.apiKey = signApiKey({ plan: "vip", name: "Administrator", a: "local:admin" });
      }
      await saveAccount(adminAcct);
      setSessionCookie(res, "local:admin", isSecureReq(req));
      return sendSuccess(res, {
        message: "Login admin berhasil! Mode dev & unlimited aktif.",
        account: accountView(adminAcct),
        api_key: adminAcct.apiKey
      });
    } else {
      return sendError(res, "Password admin salah!", 401);
    }
  }

  // 2. Akun pengguna biasa
  let accountId = await kvGet(`user:by:email:${login.toLowerCase()}`);
  if (!accountId) {
    accountId = await kvGet(`user:by:username:${login.toLowerCase()}`);
  }

  if (!accountId) {
    return sendError(res, "Akun tidak ditemukan. Cek kembali username/email kamu.", 404);
  }

  const acct = await getAccount(accountId);
  if (!acct || !acct.passwordHash || !acct.salt) {
    return sendError(res, "Akun ini didaftarkan via OAuth atau data rusak.", 400);
  }

  const computedHash = crypto.scryptSync(password, acct.salt, 32).toString("hex");
  if (!crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(acct.passwordHash))) {
    return sendError(res, "Password salah!", 401);
  }

  setSessionCookie(res, acct.id, isSecureReq(req));
  return sendSuccess(res, {
    message: "Login berhasil!",
    account: accountView(acct),
    api_key: acct.apiKey
  });
});

app.post("/api/auth/register", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const username = String(req.body?.username || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const confirmPassword = String(req.body?.confirmPassword || req.body?.confirm_password || "");
  const email = String(req.body?.email || "").trim().toLowerCase();

  if (!name) return sendError(res, "Nama lengkap wajib diisi", 400);
  if (!username || !/^[a-z0-9_]{3,20}$/.test(username)) {
    return sendError(res, "Username wajib 3-20 karakter alfanumerik / underscore", 400);
  }
  if (!password || password.length < 6) {
    return sendError(res, "Password minimal 6 karakter", 400);
  }
  if (password !== confirmPassword) {
    return sendError(res, "Password dan konfirmasi password tidak cocok", 400);
  }

  if (username === "admin" || (await kvGet(`user:by:username:${username}`))) {
    return sendError(res, "Username sudah digunakan, pilih username lain", 400);
  }

  if (email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return sendError(res, "Format email tidak valid", 400);
    }
    if (email === "admin@kadokunn.com" || (await kvGet(`user:by:email:${email}`))) {
      return sendError(res, "Email sudah terdaftar, gunakan email lain", 400);
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = crypto.scryptSync(password, salt, 32).toString("hex");

    await kvSetEx(
      `reg:pending:${username}`,
      JSON.stringify({ name, username, passwordHash, salt, email, code }),
      600
    );

    try {
      await sendVerificationEmail(email, code, name);
    } catch (err) {
      return sendError(res, `Gagal mengirim email verifikasi ke ${email}: ${err.message}`, 500);
    }

    return sendSuccess(res, {
      need_verification: true,
      message: `Kode verifikasi 6 digit telah dikirim ke ${email}. Silakan cek kotak masuk atau spam.`,
      username,
      email
    });
  }

  // Tanpa email (email opsional)
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = crypto.scryptSync(password, salt, 32).toString("hex");
  const id = `local:${username}`;

  const acct = {
    id,
    provider: "local",
    name,
    username,
    email: null,
    salt,
    passwordHash,
    createdAt: todayUTC(),
    role: "user",
    dev: false,
    premium: null,
    apiKey: null
  };
  acct.apiKey = signApiKey({ plan: "user", name: acct.name, a: acct.id });
  await saveAccount(acct);
  await kvSet(`user:by:username:${username}`, id);

  setSessionCookie(res, acct.id, isSecureReq(req));
  return sendSuccess(res, {
    need_verification: false,
    message: "Akun berhasil dibuat dan otomatis login!",
    account: accountView(acct),
    api_key: acct.apiKey
  });
});

app.post("/api/auth/verify-code", async (req, res) => {
  const username = String(req.body?.username || "").trim().toLowerCase();
  const code = String(req.body?.code || "").trim();

  if (!username || !code) {
    return sendError(res, "Username dan kode verifikasi wajib diisi", 400);
  }

  const rawPending = await kvGet(`reg:pending:${username}`);
  if (!rawPending) {
    return sendError(res, "Sesi verifikasi tidak ditemukan atau sudah kedaluwarsa. Silakan daftar ulang.", 400);
  }

  let pending;
  try {
    pending = typeof rawPending === "string" ? JSON.parse(rawPending) : rawPending;
  } catch {
    return sendError(res, "Data pendaftaran rusak", 500);
  }

  if (String(pending.code).trim() !== code) {
    return sendError(res, "Kode verifikasi 6 digit salah!", 400);
  }

  const id = `local:${pending.username}`;
  const acct = {
    id,
    provider: "local",
    name: pending.name,
    username: pending.username,
    email: pending.email,
    salt: pending.salt,
    passwordHash: pending.passwordHash,
    createdAt: todayUTC(),
    role: "user",
    dev: false,
    emailVerified: true,
    premium: null,
    apiKey: null
  };
  acct.apiKey = signApiKey({ plan: "user", name: acct.name, a: acct.id });
  await saveAccount(acct);
  await kvSet(`user:by:username:${pending.username}`, id);
  if (pending.email) {
    await kvSet(`user:by:email:${pending.email}`, id);
  }
  await kvDel(`reg:pending:${pending.username}`);

  setSessionCookie(res, acct.id, isSecureReq(req));
  return sendSuccess(res, {
    verified: true,
    message: "Verifikasi berhasil! Selamat datang di Arashi API.",
    account: accountView(acct),
    api_key: acct.apiKey
  });
});

app.post("/api/auth/resend-code", async (req, res) => {
  const username = String(req.body?.username || "").trim().toLowerCase();
  if (!username) return sendError(res, "Username wajib diisi", 400);

  const rawPending = await kvGet(`reg:pending:${username}`);
  if (!rawPending) {
    return sendError(res, "Sesi verifikasi tidak ditemukan atau sudah kedaluwarsa.", 400);
  }

  let pending;
  try {
    pending = typeof rawPending === "string" ? JSON.parse(rawPending) : rawPending;
  } catch {
    return sendError(res, "Data pendaftaran rusak", 500);
  }

  const newCode = String(Math.floor(100000 + Math.random() * 900000));
  pending.code = newCode;

  await kvSetEx(`reg:pending:${username}`, JSON.stringify(pending), 600);
  try {
    await sendVerificationEmail(pending.email, newCode, pending.name);
  } catch (err) {
    return sendError(res, `Gagal mengirim ulang email: ${err.message}`, 500);
  }

  return sendSuccess(res, {
    message: `Kode verifikasi baru telah dikirimkan ke ${pending.email}`,
    email: pending.email
  });
});

app.get("/api/auth/telegram", async (req, res) => {
  const origin = requestOrigin(req);
  const profile = verifyTelegramLogin(req.query || {});
  if (profile.error) {
    return res.redirect(`${origin}/account?error=${encodeURIComponent(profile.error)}`);
  }
  const acct = await upsertAccount(profile);
  setSessionCookie(res, acct.id, isSecureReq(req));
  return res.redirect(`${origin}/account?welcome=tg`);
});

app.get("/api/auth/github", (req, res) => {
  const origin = requestOrigin(req);
  if (!githubEnabled()) {
    return res.redirect(`${origin}/account?error=${encodeURIComponent("Login GitHub belum dikonfigurasi")}`);
  }
  const state = crypto.randomBytes(16).toString("base64url");
  const secure = isSecureReq(req);
  res.setHeader("Set-Cookie", [
    `kae_gh_state=${state}; Path=/; Max-Age=600; SameSite=Lax; HttpOnly${secure ? "; Secure" : ""}`
  ]);
  return res.redirect(githubLoginUrl(origin, state));
});

app.get("/api/auth/github/callback", async (req, res) => {
  const origin = requestOrigin(req);
  const { code, state } = req.query || {};
  const cookies = parseCookies(req);
  if (!code || !state || state !== cookies.kae_gh_state) {
    return res.redirect(`${origin}/account?error=${encodeURIComponent("Sesi login GitHub tidak valid atau kedaluwarsa")}`);
  }

  try {
    const profile = await githubExchange(origin, String(code));
    if (profile.error) {
      return res.redirect(`${origin}/account?error=${encodeURIComponent(profile.error)}`);
    }
    const acct = await upsertAccount(profile);
    const secure = isSecureReq(req);
    res.setHeader("Set-Cookie", [
      sessionCookie(acct.id, secure),
      "kae_gh_state=; Path=/; Max-Age=0; HttpOnly"
    ]);
    return res.redirect(`${origin}/account?welcome=gh`);
  } catch (err) {
    return res.redirect(`${origin}/account?error=${encodeURIComponent(err.message || "Login GitHub gagal")}`);
  }
});

app.get("/api/auth/google", (req, res) => {
  const origin = requestOrigin(req);
  if (!googleEnabled()) {
    return res.redirect(`${origin}/account?error=${encodeURIComponent("Login Google belum dikonfigurasi server (butuh GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET)")}`);
  }
  const state = crypto.randomBytes(16).toString("base64url");
  const secure = isSecureReq(req);
  res.setHeader("Set-Cookie", [
    `kae_goog_state=${state}; Path=/; Max-Age=600; SameSite=Lax; HttpOnly${secure ? "; Secure" : ""}`
  ]);
  return res.redirect(googleLoginUrl(origin, state));
});

app.get("/api/auth/google/callback", async (req, res) => {
  const origin = requestOrigin(req);
  const { code, state } = req.query || {};
  const cookies = parseCookies(req);
  if (!code || !state || state !== cookies.kae_goog_state) {
    return res.redirect(`${origin}/account?error=${encodeURIComponent("Sesi login Google tidak valid atau kedaluwarsa")}`);
  }

  try {
    const profile = await googleExchange(origin, String(code));
    if (profile.error) {
      return res.redirect(`${origin}/account?error=${encodeURIComponent(profile.error)}`);
    }
    const acct = await upsertAccount(profile);
    const secure = isSecureReq(req);
    res.setHeader("Set-Cookie", [
      sessionCookie(acct.id, secure),
      "kae_goog_state=; Path=/; Max-Age=0; HttpOnly"
    ]);
    return res.redirect(`${origin}/account?welcome=goog`);
  } catch (err) {
    return res.redirect(`${origin}/account?error=${encodeURIComponent(err.message || "Login Google gagal")}`);
  }
});

app.post("/api/auth/profile", async (req, res) => {
  const acct = await currentAccount(req);
  if (!acct) {
    return sendError(res, "Belum login", 401);
  }

  const body = req.body || {};
  if (typeof body.name === "string" && body.name.trim()) {
    acct.name = body.name.trim().slice(0, 40);
  }
  if (typeof body.photo === "string") {
    if (body.photo === "") {
      acct.photo = null;
    } else if (/^data:image\/(png|jpe?g|webp|gif);base64,/.test(body.photo) && body.photo.length <= 400000) {
      acct.photo = body.photo;
    } else {
      return sendError(res, "Foto tidak valid. Kirim data URI gambar (base64), maks ~300KB", 400);
    }
  }

  await saveAccount(acct);
  return sendSuccess(res, { account: accountView(acct) });
});

app.post("/api/auth/reset-key", async (req, res) => {
  const acct = await currentAccount(req);
  if (!acct) {
    return sendError(res, "Belum login", 401);
  }
  const apiKey = await rotateAccountKey(acct);
  return sendSuccess(res, { api_key: apiKey, account: accountView(acct) });
});

// Analitik publik: total hit API per hari (14 hari) + top endpoint hari ini
app.get("/api/stats", async (req, res) => {
  const day = todayUTC();
  const days = [...Array(14)].map((_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (13 - i));
    return d.toISOString().slice(0, 10);
  });

  let history = days.map((date) => ({ date, total: 0 }));
  let todayTotal = 0;
  let topEndpoints = [];

  try {
    const totals = await kvMGet(days.map((d) => `hit:total:${d}`));
    history = days.map((d, i) => ({ date: d, total: Number(totals[i] || 0) }));
    todayTotal = Number(history[history.length - 1]?.total || 0);

    const epKeys = await kvScan(`hit:ep:${day}:*`);
    const values = await kvMGet(epKeys);
    topEndpoints = epKeys
      .map((k, i) => {
        const raw = String(k).split(":").pop() || "";
        let endpoint = raw;
        try {
          endpoint = Buffer.from(raw, "base64url").toString("utf8");
        } catch {}
        return { endpoint, count: Number(values[i] || 0) };
      })
      .filter((e) => e.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  } catch {
    // analitik kosong kalau store gagal
  }

  return sendSuccess(res, {
    today: { date: day, total: todayTotal },
    history,
    topEndpoints,
    endpoints_total: topEndpoints.length
  });
});

// ---------------------------------------------------------------------------
// Pembelian API key via QRIS GoPay
// ---------------------------------------------------------------------------

const asText = (value) => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
};

const deepFind = (data, predicate) => {
  const stack = [data];
  const seen = new Set();

  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);

    for (const [key, value] of Object.entries(current)) {
      if (predicate(key, value)) return value;
      if (value && typeof value === "object") stack.push(value);
    }
  }
  return undefined;
};

const extractQr = (data) => {
  const qrString = asText(
    deepFind(data, (_k, v) => typeof v === "string" && /^000201/.test(v.trim()))
  );
  const qrImage = asText(
    deepFind(data, (_k, v) => {
      if (typeof v !== "string") return false;
      const t = v.trim();
      return /^data:image\//i.test(t) || /^https?:\/\/.+\.(png|jpg|jpeg|webp)(\?|$)/i.test(t);
    })
  );

  return {
    qr_string: qrString || null,
    qr_image: qrImage || null
  };
};

const extractRef = (data) =>
  asText(deepFind(data, (k, v) => /ref/i.test(k) && typeof v === "string")) ||
  asText(deepFind(data, (k, v) => /^(id|code|invoice|invoice_id|order_id|orderid|transaction_id|trx_id|trxid)$/i.test(k) && typeof v === "string"));

const extractCreatedAt = (data) =>
  asText(deepFind(data, (k, v) => /^(created_at|createdat|created|timestamp|time|datetime|date)$/i.test(k) && (typeof v === "string" || typeof v === "number")));

const PAID_VALUES = new Set(["paid", "success", "succeeded", "settlement", "settled", "capture", "captured", "completed", "complete", "berhasil"]);

const detectPaid = (data) => {
  const hit = deepFind(data, (k, v) => {
    const key = k.toLowerCase();
    if (["status", "state", "transaction_status", "payment_status", "transactionstatus", "paymentstatus"].includes(key)) {
      return typeof v === "string" && PAID_VALUES.has(v.toLowerCase());
    }
    if (["paid", "is_paid", "ispaid", "settled", "success"].includes(key)) {
      return v === true || v === "true" || v === 1 || v === "1";
    }
    return false;
  });
  return Boolean(hit);
};

const planCatalog = () =>
  (config.planOrder || Object.keys(config.plans))
    .filter((id) => config.plans[id] && (typeof config.plans[id].price === "number" || typeof config.plans[id].dailyRate === "number"))
    .map((id) => {
      const plan = config.plans[id];
      const dailyRate = plan.dailyRate || Math.round(plan.price / (plan.durationDays || 7)) || 500;
      const durationDays = plan.durationDays ?? 7;
      const price = plan.price || (dailyRate * durationDays);
      return {
        id,
        label: plan.label || id,
        tagline: plan.tagline || "",
        dailyRate,
        price,
        durationDays,
        unlimited: plan.unlimited === true,
        dailyLimit: plan.dailyLimit,
        featured: plan.featured === true
      };
    });

app.get("/api/plans", (req, res) => {
  return sendSuccess(res, { plans: planCatalog() });
});

app.post("/api/buy", async (req, res) => {
  const planId = String(req.body?.plan || req.query?.plan || "").toLowerCase();
  const plan = config.plans[planId];

  if (!plan || (typeof plan.price !== "number" && typeof plan.dailyRate !== "number")) {
    return sendError(res, "Plan tidak ditemukan", 400);
  }

  const requestedDays = parseInt(req.body?.days || req.query?.days, 10);
  const days = Number.isInteger(requestedDays) && requestedDays > 0 ? requestedDays : (plan.durationDays || 7);
  const dailyRate = plan.dailyRate || Math.round((plan.price || 3500) / (plan.durationDays || 7));
  const amount = dailyRate * days;

  try {
    const created = await qrisRequest("/api/gopay/create", {
      method: "POST",
      body: { amount }
    });

    const qr = extractQr(created);

    return sendSuccess(res, {
      plan: planId,
      label: plan.label || planId,
      amount,
      days,
      durationDays: days,
      dailyRate,
      unlimited: plan.unlimited === true,
      ref: extractRef(created) || null,
      created_at: extractCreatedAt(created) || new Date().toISOString(),
      qr_string: qr.qr_string,
      qr_image: qr.qr_image,
      raw: created
    });
  } catch (err) {
    return sendError(res, err.message || "Gagal membuat QRIS", 502);
  }
});

app.get("/api/buy/status", async (req, res) => {
  const planId = String(req.query?.plan || "").toLowerCase();
  const plan = config.plans[planId];

  if (!plan) {
    return sendError(res, "Plan tidak ditemukan", 400);
  }

  const requestedDays = parseInt(req.query?.days, 10);
  const days = Number.isInteger(requestedDays) && requestedDays > 0 ? requestedDays : (plan.durationDays || 7);
  const dailyRate = plan.dailyRate || Math.round((plan.price || 3500) / (plan.durationDays || 7));
  const defaultAmount = dailyRate * days;

  const ref = req.query?.ref ? String(req.query.ref) : "";
  const amount = Number(req.query?.amount || defaultAmount);
  const createdAt = req.query?.created_at ? String(req.query.created_at) : "";

  if (!ref) {
    return sendError(res, "Parameter 'ref' wajib diisi", 400);
  }

  try {
    const query = { ref, amount: String(amount) };
    if (createdAt) query.created_at = createdAt;

    const statusData = await qrisRequest("/api/gopay/status", { method: "GET", query });

    if (!detectPaid(statusData)) {
      return sendSuccess(res, { paid: false, plan: planId, status: statusData, api_key: null });
    }

    const expires = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

    // Kalau user lagi login: premium ditempel ke akun, bukan key standalone.
    const acct = await currentAccount(req);
    if (acct) {
      acct.premium = {
        plan: planId,
        label: plan.label || planId,
        unlimited: plan.unlimited === true,
        days,
        expires,
        purchased_at: new Date().toISOString(),
        ref
      };
      await saveAccount(acct);

      return sendSuccess(res, {
        paid: true,
        plan: planId,
        label: plan.label || planId,
        durationDays: days,
        unlimited: plan.unlimited === true,
        expires,
        api_key: acct.apiKey,
        bound_to_account: true,
        account: accountView(acct),
        status: statusData
      });
    }

    const apiKey = signApiKey({ plan: planId, name: "Arashi Buyer", expires });

    return sendSuccess(res, {
      paid: true,
      plan: planId,
      label: plan.label || planId,
      durationDays: days,
      unlimited: plan.unlimited === true,
      expires,
      api_key: apiKey,
      bound_to_account: false,
      status: statusData
    });
  } catch (err) {
    return sendError(res, err.message || "Gagal mengecek status pembayaran", 502);
  }
});

// Cari string gambar (data URI atau base64 panjang) di response apapun bentuknya
const extractImage = (data) =>
  deepFind(data, (k, v) =>
    typeof v === "string" &&
    (v.startsWith("data:image/") || (v.length > 400 && /^[A-Za-z0-9+/=\s]+$/.test(v)))
  );

// Normalisasi order QRIS agar dipakai bersama oleh buy & donate
const normalizeQris = (created, meta = {}) => {
  const qr = extractQr(created);
  return {
    ref: extractRef(created) || null,
    created_at: extractCreatedAt(created) || new Date().toISOString(),
    qr_string: qr.qr_string,
    qr_image: qr.qr_image,
    raw: created,
    ...meta
  };
};

// Batalkan transaksi QRIS (dipakai buy maupun donate)
app.post("/api/buy/cancel", async (req, res) => {
  const ref = String(req.body?.ref || req.query?.ref || "");
  const amount = Number(req.body?.amount || req.query?.amount || 0);

  if (!ref || !amount) {
    return sendError(res, "Parameter 'ref' dan 'amount' wajib diisi", 400);
  }

  try {
    const result = await qrisRequest("/api/gopay/cancel", {
      method: "POST",
      body: { ref, amount }
    });
    return sendSuccess(res, { cancelled: true, ref, raw: result });
  } catch (err) {
    return sendError(res, err.message || "Gagal membatalkan transaksi", 502);
  }
});

// Buat struk pembayaran (PNG base64) dari transaksi
app.post("/api/buy/receipt", async (req, res) => {
  const ref = String(req.body?.ref || "");
  const amount = Number(req.body?.amount || 0);
  const label = String(req.body?.label || "Kaelyn Premium");

  if (!ref || !amount) {
    return sendError(res, "Parameter 'ref' dan 'amount' wajib diisi", 400);
  }

  try {
    const result = await qrisRequest("/api/maker/struk", {
      method: "POST",
      body: {
        toko: "Kadokun Store",
        items: [{ nama: label, qty: 1, harga: amount }],
        bayar: amount,
        metodeBayar: "QRIS",
        nomorStruk: ref
      }
    });

    const image = extractImage(result);

    if (!image) {
      return sendError(res, "Struk gagal dibuat", 502);
    }

    return sendSuccess(res, { ref, image });
  } catch (err) {
    return sendError(res, err.message || "Gagal membuat struk", 502);
  }
});

// Donasi: QRIS dengan nominal bebas
const DONATE_MIN = 1000;
const DONATE_MAX = 10000000;

app.post("/api/donate", async (req, res) => {
  const amount = Math.round(Number(req.body?.amount || req.query?.amount || 0));

  if (!Number.isFinite(amount) || amount < DONATE_MIN || amount > DONATE_MAX) {
    return sendError(res, `Nominal donasi harus antara ${DONATE_MIN} - ${DONATE_MAX}`, 400);
  }

  try {
    const created = await qrisRequest("/api/gopay/create", {
      method: "POST",
      body: { amount }
    });

    return sendSuccess(res, normalizeQris(created, {
      mode: "donate",
      label: "Donasi",
      amount
    }));
  } catch (err) {
    return sendError(res, err.message || "Gagal membuat QRIS", 502);
  }
});

app.get("/api/donate/status", async (req, res) => {
  const ref = req.query?.ref ? String(req.query.ref) : "";
  const amount = Number(req.query?.amount || 0);
  const createdAt = req.query?.created_at ? String(req.query.created_at) : "";

  if (!ref || !amount) {
    return sendError(res, "Parameter 'ref' dan 'amount' wajib diisi", 400);
  }

  try {
    const query = { ref, amount: String(amount) };
    if (createdAt) query.created_at = createdAt;

    const statusData = await qrisRequest("/api/gopay/status", { method: "GET", query });

    return sendSuccess(res, {
      paid: detectPaid(statusData),
      ref,
      amount,
      status: statusData
    });
  } catch (err) {
    return sendError(res, err.message || "Gagal mengecek status donasi", 502);
  }
});

// ---------------------------------------------------------------------------
// Uploader publik: POST /upload (multipart, maks 50 MB) -> URL cloud
// ---------------------------------------------------------------------------

const UPLOAD_MAX_BYTES = 50 * 1024 * 1024;

const uploadMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_MAX_BYTES, files: 1 }
}).single("file");

const runUploadMulter = (req, res) =>
  new Promise((resolve, reject) => {
    uploadMulter(req, res, (err) => (err ? reject(err) : resolve()));
  });

app.post("/upload", async (req, res) => {
  if (!(await authorizeRequest(req, res, { premium: false }))) {
    return;
  }

  try {
    await runUploadMulter(req, res);
  } catch (err) {
    if (err?.code === "LIMIT_FILE_SIZE") {
      return sendError(res, "File maksimal 50 MB", 413);
    }
    return sendError(res, err.message || "Gagal membaca file", 400);
  }

  const file = req.file;
  if (!file) {
    return sendError(res, "Tidak ada file. Kirim multipart/form-data dengan field 'file'", 400);
  }

  await recordHit("/upload");

  const filename = String(file.originalname || "file").replace(/[/\\]/g, "_").slice(0, 120);
  const mimetype = file.mimetype || "application/octet-stream";

  // Simpan bytes ke storage (bisa dikonfigurasi), lalu ekspos via domain sendiri.
  const storageUrl = process.env.UPLOAD_STORAGE_URL || "https://cloud.yardansh.com/upload";

  const form = new FormData();
  form.append("file", new Blob([file.buffer], { type: mimetype }), filename);

  try {
    const cdnRes = await safeFetch(storageUrl, { method: "POST", body: form }, 60000);
    const data = await cdnRes.json().catch(() => null);
    const storedUrl = typeof data?.url === "string" ? data.url : null;

    if (!cdnRes.ok || !storedUrl) {
      throw new Error("Storage menolak file: " + JSON.stringify(data || { status: cdnRes.status }));
    }

    const ext = inferExt(filename === "file" ? "" : filename, "");
    const url = await buildPermanentUrl(req, storedUrl, ext || undefined);

    return sendSuccess(res, {
      url,
      filename,
      mimetype,
      size: file.size,
      max_size: UPLOAD_MAX_BYTES
    });
  } catch (err) {
    return sendError(res, err.message || "Gagal upload file", 502);
  }
});

// Halaman front-end sekarang dilayani Next.js (app/). GET /upload lama diarahkan ke /uploader.
app.get("/upload", (req, res) => res.redirect(302, "/uploader"));

// Media proxy: /<token>.<ext> -> redirect 302 ke URL media asli (lihat mediaProxy.js)
app.get(/^\/([A-Za-z0-9_-]+)\.([A-Za-z0-9]{1,6})$/, handleMediaProxy);

app.all("/:category/:plugin(*)", async (req, res) => {
  const routePath = `/${req.params.category}/${req.params.plugin}`.toLowerCase();
  let target = plugins.get(routePath);

  if (!target) {
    try {
      target = await resolveSingleRouteOnDemand(req.params.category, req.params.plugin);
    } catch {}
  }

  if (!target) {
    return sendError(res, `Endpoint '${routePath}' not found`, 404);
  }

  if (!target.method.includes(req.method)) {
    return sendError(res, `Method ${req.method} not allowed`, 405);
  }

  if (!(await authorizeRequest(req, res, target))) {
    return;
  }

  await recordHit(routePath);

  const { input, error } = extractAndValidateInput(target.params, req);
  if (error) {
    return sendError(res, error, 400);
  }

  const cacheKey = `${req.method}:${req.originalUrl}`;
  if (target.cache && req.method === "GET") {
    const cachedResult = getCache(cacheKey);
    if (cachedResult !== null) {
      return sendSuccess(res, cachedResult);
    }
  }

  try {
    const clientAbortController = new AbortController();
    req.on("close", () => {
      clientAbortController.abort();
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request execution timed out")), target.timeout || 60000);
    });

    const executionPromise = target.execute(req, res, {
      input,
      query: req.query || {},
      body: req.body || {},
      params: req.params || {},
      signal: clientAbortController.signal
    });

    const result = await Promise.race([executionPromise, timeoutPromise]);

    if (!res.headersSent && result !== undefined) {
      if (target.cache && req.method === "GET") {
        setCache(cacheKey, result, target.cache);
      }
      return sendSuccess(res, result);
    }
  } catch (err) {
    if (!res.headersSent) {
      return sendError(res, err.message || "Internal Server Error", 500);
    }
  }
});

app.use((req, res) => {
  return sendError(res, "Endpoint not found", 404);
});

export default app;