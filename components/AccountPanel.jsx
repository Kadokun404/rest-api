"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import CodeBlock from "./CodeBlock";
import { GithubIcon, GoogleIcon } from "./Icons";
import { useToast } from "./Toast";
import { getJSON, postJSON } from "@/lib/api";
import { APIKEY_STORAGE } from "@/lib/site";
import { storage } from "@/lib/storage";

function TelegramWidget({ username }) {
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = ref.current;
    if (!host || !username) return;
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://telegram.org/js/telegram-widget.js?22";
    s.setAttribute("data-telegram-login", username);
    s.setAttribute("data-size", "large");
    s.setAttribute("data-radius", "10");
    s.setAttribute("data-auth-url", `${window.location.origin}/api/auth/telegram`);
    s.setAttribute("data-request-access", "write");
    s.onerror = () => setFailed(true);
    host.appendChild(s);
    return () => { host.innerHTML = ""; };
  }, [username]);

  if (failed) return null;
  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: 40,
        marginBottom: 2
      }}
    />
  );
}

function GuestCard({ cfg, onLoggedIn }) {
  const { toast } = useToast();
  const [mode, setMode] = useState("login"); // "login" | "register" | "verify"
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [loginInput, setLoginInput] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [regName, setRegName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regEmail, setRegEmail] = useState("");

  const [verifyUsername, setVerifyUsername] = useState("");
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyCode, setVerifyCode] = useState("");

  const tg = cfg?.telegram;
  const gh = cfg?.github;
  const goog = cfg?.google;
  const tgReady = Boolean(tg?.enabled && tg?.username);
  const ghReady = Boolean(gh?.enabled);
  const googReady = Boolean(goog?.enabled);

  async function handleLogin(e) {
    e.preventDefault();
    if (!loginInput || !loginPassword) {
      toast("Email/Username dan password wajib diisi", "err");
      return;
    }
    setSubmitting(true);
    const { ok, data } = await postJSON("/api/auth/login", {
      login: loginInput,
      password: loginPassword
    });
    setSubmitting(false);

    if (ok && data?.status === true) {
      toast(data.result?.message || "Login berhasil!", "ok");
      if (data.result?.api_key) storage.set(APIKEY_STORAGE, data.result.api_key);
      onLoggedIn();
    } else {
      toast(data?.message || "Login gagal", "err");
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!regName || !regUsername || !regPassword || !regConfirm) {
      toast("Semua kolom bertanda bintang wajib diisi", "err");
      return;
    }
    if (regPassword !== regConfirm) {
      toast("Password dan konfirmasi password tidak cocok!", "err");
      return;
    }
    if (regPassword.length < 6) {
      toast("Password minimal 6 karakter", "err");
      return;
    }

    setSubmitting(true);
    const { ok, data } = await postJSON("/api/auth/register", {
      name: regName,
      username: regUsername,
      password: regPassword,
      confirmPassword: regConfirm,
      email: regEmail || undefined
    });
    setSubmitting(false);

    if (ok && data?.status === true) {
      if (data.result?.need_verification) {
        toast(data.result.message, "ok");
        setVerifyUsername(regUsername);
        setVerifyEmail(regEmail);
        setMode("verify");
      } else {
        toast("Akun berhasil dibuat dan otomatis login!", "ok");
        if (data.result?.api_key) storage.set(APIKEY_STORAGE, data.result.api_key);
        onLoggedIn();
      }
    } else {
      toast(data?.message || "Pendaftaran gagal", "err");
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    if (!verifyCode) {
      toast("Masukkan kode 6 digit verifikasi", "err");
      return;
    }

    setSubmitting(true);
    const { ok, data } = await postJSON("/api/auth/verify-code", {
      username: verifyUsername,
      code: verifyCode
    });
    setSubmitting(false);

    if (ok && data?.status === true) {
      toast("Verifikasi berhasil! Selamat datang.", "ok");
      if (data.result?.api_key) storage.set(APIKEY_STORAGE, data.result.api_key);
      onLoggedIn();
    } else {
      toast(data?.message || "Kode verifikasi salah", "err");
    }
  }

  async function handleResend() {
    setSubmitting(true);
    const { ok, data } = await postJSON("/api/auth/resend-code", { username: verifyUsername });
    setSubmitting(false);
    if (ok && data?.status === true) {
      toast(data.result?.message || "Kode baru telah dikirim", "ok");
    } else {
      toast(data?.message || "Gagal mengirim ulang kode", "err");
    }
  }

  return (
    <div className="account-center-wrap">
      <div className="card card-pad auth-center-card">
        {mode === "login" && (
            <>
              <div style={{ marginBottom: 18 }}>
                <h3 style={{ margin: "0 0 6px" }}>Masuk ke Akun</h3>
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                  Gunakan email atau username untuk mengelola kuota token dan API key.
                </p>
              </div>

              <form onSubmit={handleLogin} className="stack" style={{ gap: 12 }}>
                <div className="field">
                  <label>Email atau Username</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="username/email@kamu.com"
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label>Password</label>
                  <input
                    className="input"
                    type="password"
                    placeholder="password akun"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                  {submitting ? "Memproses..." : "Masuk"}
                </button>
              </form>

              <div style={{ marginTop: 14, textAlign: "center", fontSize: 13 }}>
                <span className="muted">Belum punya akun? </span>
                <button
                  type="button"
                  className="btn btn-xs"
                  style={{ padding: "2px 8px", color: "var(--accent, #f25c05)", fontWeight: 600 }}
                  onClick={() => setMode("register")}
                >
                  Daftar sekarang!
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0 16px" }}>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                <span className="muted mono-sm" style={{ fontSize: 11 }}>ATAU MASUK LEWAT</span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>

              <div className="stack" style={{ gap: 10 }}>
                {tgReady && <TelegramWidget username={tg.username} />}
                <a className="btn btn-block" href="/api/auth/google" aria-disabled={!googReady} tabIndex={googReady ? undefined : -1}>
                  <GoogleIcon style={{ width: 18, height: 18, marginRight: 8 }} /> Login dengan Google
                </a>
                <a className="btn btn-block" href="/api/auth/github" aria-disabled={!ghReady} tabIndex={ghReady ? undefined : -1}>
                  <GithubIcon style={{ width: 18, height: 18, marginRight: 8 }} /> Login dengan GitHub
                </a>
              </div>
            </>
          )}

          {mode === "register" && (
            <>
              <div style={{ marginBottom: 18 }}>
                <h3 style={{ margin: "0 0 6px" }}>Daftar Akun Baru</h3>
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                  Buat akun developer Arashi API. Email bersifat opsional.
                </p>
              </div>

              <form onSubmit={handleRegister} className="stack" style={{ gap: 12 }}>
                <div className="field">
                  <label>Nama Lengkap *</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Nama kamu"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label>Username *</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="username (huruf, angka, underscore)"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label>Password *</label>
                  <input
                    className="input"
                    type="password"
                    placeholder="Minimal 6 karakter"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label>Konfirmasi Password *</label>
                  <input
                    className="input"
                    type="password"
                    placeholder="Ketik ulang password"
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label>
                    Email <span className="muted" style={{ fontSize: 11 }}>(Opsional - untuk verifikasi 6 digit via noreply@kadokunn.com)</span>
                  </label>
                  <input
                    className="input"
                    type="email"
                    placeholder="nama@email.com (bisa dikosongkan)"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                  {submitting ? "Mendaftarkan..." : "Daftar Akun"}
                </button>
              </form>

              <div style={{ marginTop: 14, textAlign: "center", fontSize: 13 }}>
                <span className="muted">Sudah punya akun? </span>
                <button
                  type="button"
                  className="btn btn-xs"
                  style={{ padding: "2px 8px", color: "var(--accent, #f25c05)", fontWeight: 600 }}
                  onClick={() => setMode("login")}
                >
                  Masuk sekarang
                </button>
              </div>
            </>
          )}

          {mode === "verify" && (
            <>
              <div style={{ marginBottom: 18, textAlign: "center" }}>
                <span style={{ fontSize: 32 }}>📧</span>
                <h3 style={{ margin: "8px 0 6px" }}>Verifikasi Email</h3>
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                  Kode 6 digit telah dikirimkan dari <code className="inline-code">noreply@kadokunn.com</code> ke <b>{verifyEmail}</b>.
                </p>
              </div>

              <form onSubmit={handleVerify} className="stack" style={{ gap: 12 }}>
                <div className="field">
                  <label style={{ textAlign: "center", display: "block" }}>Masukkan Kode 6 Digit</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    style={{ textAlign: "center", letterSpacing: 8, fontSize: 24, fontWeight: 700 }}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                  {submitting ? "Memverifikasi..." : "Verifikasi & Masuk"}
                </button>
              </form>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: 12 }}>
                <button
                  type="button"
                  className="btn btn-xs"
                  onClick={handleResend}
                  disabled={submitting}
                >
                  Kirim ulang kode
                </button>
                <button
                  type="button"
                  className="btn btn-xs"
                  onClick={() => setMode("register")}
                >
                  Kembali ke pendaftaran
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

function ProfileCard({ result, onChanged }) {
  const { toast } = useToast();
  const a = result.account;
  const q = result.quota || {};
  const key = result.api_key;
  const [showKey, setShowKey] = useState(false);

  const isUnlimited = a.owner || a.dev || q.daily_limit === 0;
  const usedTokens = q.used_today || 0;
  const totalTokens = isUnlimited ? "Unlimited" : (q.daily_limit || 100);
  const remainingTokens = isUnlimited ? "∞ Unlimited" : (q.remaining_today != null ? q.remaining_today : 100);
  const usagePercent = isUnlimited ? 0 : Math.min(100, Math.round((usedTokens / (q.daily_limit || 100)) * 100));

  useEffect(() => { if (key) storage.set(APIKEY_STORAGE, key); }, [key]);

  async function resetKey() {
    const { ok, data } = await postJSON("/api/auth/reset-key");
    if (ok && data?.result) { storage.set(APIKEY_STORAGE, data.result.api_key); toast("API key direset", "ok"); onChanged(); }
    else toast("Gagal reset key", "err");
  }
  async function logout() {
    await postJSON("/api/auth/logout");
    storage.remove(APIKEY_STORAGE);
    toast("Berhasil keluar", "ok");
    onChanged();
  }
  function saveKey() {
    if (!key) return;
    storage.set(APIKEY_STORAGE, key);
    toast("API key disimpan di browser", "ok");
  }
  async function copyKey() {
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      toast("API key tersalin ke clipboard!", "ok");
    } catch {
      toast("Gagal menyalin key", "err");
    }
  }

  const maskedDisplay = key
    ? showKey
      ? key
      : `${key.slice(0, 3)}••••••••••••••••${key.slice(-4)}`
    : "-";

  return (
    <div className="account-profile-container">
      <div className="page-head" style={{ marginBottom: 24, textAlign: "left" }}>
        <span className="sub-badge" style={{ marginBottom: 8, display: "inline-block" }}>[ DEVELOPER DASHBOARD ]</span>
        <h1 style={{ margin: "0 0 6px" }}>Akun Developer</h1>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          Kelola kuota token harian, monitor pemakaian endpoint, dan atur API key akun kamu.
        </p>
      </div>

      <div className="card card-pad">
        <div className="profile">
          {a.photo ? <img className="avatar" src={a.photo} alt="" referrerPolicy="no-referrer" /> : <span className="avatar-fallback">{(a.name || "?")[0].toUpperCase()}</span>}
          <div className="profile-info">
            <div className="profile-name">{a.name || "Tanpa nama"}</div>
            <div className="muted mono-sm">{a.provider || ""}{a.username ? ` · @${a.username}` : ""}{a.owner ? " · Owner / Dev" : a.dev ? " · Dev" : ""}</div>
          </div>
          <span className="pill" style={a.owner || a.dev ? { background: "var(--accent, #f25c05)", color: "#fff", fontWeight: 700 } : undefined}>
            {a.owner || a.dev ? "Dev & Owner (Unlimited)" : (a.premium ? a.premium.label : "Free")}
          </span>
        </div>

        {/* 3 STAT CARDS */}
        <div className="account-stat-grid">
          <div className="account-stat-card">
            <div className="account-stat-label">Kuota Token Harian</div>
            <div className="account-stat-value">{totalTokens}</div>
            <div className="account-stat-sub">{isUnlimited ? "Tanpa batasan limit" : "Reset tiap 00:00 UTC"}</div>
          </div>
          <div className="account-stat-card">
            <div className="account-stat-label">Terpakai Hari Ini</div>
            <div className="account-stat-value">{usedTokens}</div>
            <div className="account-stat-sub">1 request = 10 token</div>
          </div>
          <div className="account-stat-card">
            <div className="account-stat-label">Sisa Token</div>
            <div className="account-stat-value" style={{ color: "var(--accent)" }}>{remainingTokens}</div>
            <div className="account-stat-sub">{isUnlimited ? "Bypass rate limit" : "Tersedia untuk hari ini"}</div>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="stat-progress-container">
          <div className="stat-progress-header">
            <span>Penggunaan Token Hari Ini</span>
            <span className="mono-sm">{isUnlimited ? "0% (Unlimited)" : `${usagePercent}% (${usedTokens}/${totalTokens})`}</span>
          </div>
          <div className="stat-progress-track">
            <div className="stat-progress-fill" style={{ width: isUnlimited ? "100%" : `${usagePercent}%` }} />
          </div>
        </div>

        {a.email && <div className="kv"><span className="k">Email terdaftar</span><span className="mono-sm">{a.email}</span></div>}
        {a.premium?.expires && <div className="kv"><span className="k">Masa aktif akun</span><span className="mono-sm">{a.premium.expires}</span></div>}

        {/* MASKED API KEY BOX */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label className="muted" style={{ fontSize: 13, fontWeight: 500 }}>API Key Kamu</label>
            <span className="muted mono-sm" style={{ fontSize: 11 }}>Header: x-api-key</span>
          </div>

          <div className="masked-key-wrapper">
            <span className="masked-key-text">{maskedDisplay}</span>
            <div className="masked-key-actions">
              <button
                type="button"
                className="btn btn-xs"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? "Sembunyikan API Key" : "Tampilkan API Key"}
              >
                {showKey ? "Sembunyikan" : "Tampilkan"}
              </button>
              <button
                type="button"
                className="btn btn-xs btn-primary"
                onClick={copyKey}
                aria-label="Salin API Key"
              >
                Salin Key
              </button>
            </div>
          </div>

          <div className="row" style={{ marginTop: 14 }}>
            <button type="button" className="btn btn-sm" onClick={resetKey}>Reset API key</button>
            <button type="button" className="btn btn-sm" onClick={saveKey}>Pakai di Try it</button>
            <button type="button" className="btn btn-sm btn-danger" onClick={logout}>Keluar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccountPanel() {
  const { toast } = useToast();
  const [state, setState] = useState({ loading: true, session: null, cfg: null });

  const load = useCallback(async () => {
    const [cfgRes, sessionRes] = await Promise.all([getJSON("/api/auth/config"), getJSON("/api/auth/session")]);
    const cfg = cfgRes.data?.result ?? cfgRes.data ?? {};
    const session = sessionRes.ok && sessionRes.data?.result?.account ? sessionRes.data.result : null;
    setState({ loading: false, session, cfg });
  }, []);

  useEffect(() => { load(); }, [load]);

  // Pesan hasil redirect login (?error= / ?welcome=)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) toast(params.get("error"), "err");
    if (params.get("welcome")) toast("Login berhasil", "ok");
    if (params.has("error") || params.has("welcome")) window.history.replaceState({}, "", "/account");
  }, [toast]);

  if (state.loading) return <p className="muted" style={{ fontSize: 14 }}>Memuat...</p>;
  return state.session ? <ProfileCard result={state.session} onChanged={load} /> : <GuestCard cfg={state.cfg} onLoggedIn={load} />;
}
