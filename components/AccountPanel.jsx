"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import CodeBlock from "./CodeBlock";
import { GithubIcon, TelegramIcon } from "./Icons";
import { useToast } from "./Toast";
import { getJSON, postJSON } from "@/lib/api";
import { APIKEY_STORAGE } from "@/lib/site";
import { storage } from "@/lib/storage";

function TelegramWidget({ username }) {
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
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

  if (failed) return <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>Gagal memuat widget Telegram.</p>;
  return <div ref={ref} className="tg-login-wrap" />;
}

function GuestCard({ cfg }) {
  const tg = cfg?.telegram;
  const gh = cfg?.github;
  const tgReady = Boolean(tg?.enabled && tg?.username);
  const ghReady = Boolean(gh?.enabled);

  return (
    <div className="card card-pad">
      <p className="muted" style={{ marginTop: 0, fontSize: 14 }}>Belum login. Masuk untuk melihat kuota dan mengelola API key.</p>
      <div className="stack" style={{ gap: 10 }}>
        {tgReady ? <TelegramWidget username={tg.username} /> : (
          <button type="button" className="btn btn-block" disabled><TelegramIcon /> Login dengan Telegram</button>
        )}
        <a className="btn btn-block" href="/api/auth/github" aria-disabled={!ghReady} tabIndex={ghReady ? undefined : -1}>
          <GithubIcon /> Login dengan GitHub
        </a>
      </div>
      {tgReady
        ? <div className="muted mono-sm" style={{ marginTop: 14 }}>Bot: @{tg.username}</div>
        : <p className="muted" style={{ fontSize: 12.5, margin: "14px 0 0" }}>Telegram login belum dikonfigurasi server (butuh <code className="inline-code">TELEGRAM_BOT_TOKEN</code> &amp; <code className="inline-code">TELEGRAM_BOT_USERNAME</code>).</p>}
      {!ghReady && <p className="muted" style={{ fontSize: 12.5, margin: "8px 0 0" }}>GitHub login belum dikonfigurasi server.</p>}
    </div>
  );
}

function ProfileCard({ result, onChanged }) {
  const { toast } = useToast();
  const a = result.account;
  const q = result.quota || {};
  const key = result.api_key;

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

  return (
    <div className="card card-pad">
      <div className="profile">
        {a.photo ? <img className="avatar" src={a.photo} alt="" referrerPolicy="no-referrer" /> : <span className="avatar-fallback">{(a.name || "?")[0].toUpperCase()}</span>}
        <div className="profile-info">
          <div className="profile-name">{a.name || "Tanpa nama"}</div>
          <div className="muted mono-sm">{a.provider || ""}{a.username ? ` · @${a.username}` : ""}{a.owner ? " · owner" : ""}</div>
        </div>
        <span className="pill">{a.premium ? a.premium.label : "Free"}</span>
      </div>

      <div className="kv"><span className="k">Kuota harian</span><span className="mono-sm">{String(q.daily_limit)}</span></div>
      <div className="kv"><span className="k">Terpakai hari ini</span><span className="mono-sm">{String(q.used_today)}</span></div>
      <div className="kv"><span className="k">Sisa hari ini</span><span className="mono-sm">{String(q.remaining_today)}</span></div>
      {a.premium?.expires && <div className="kv"><span className="k">Premium berakhir</span><span className="mono-sm">{a.premium.expires}</span></div>}

      <div style={{ marginTop: 16 }}>
        <label className="muted" style={{ fontSize: 13 }}>API key</label>
        <div style={{ margin: "6px 0 10px" }}><CodeBlock title="x-api-key" code={key || "-"} copyText={key || ""} bodyClassName="key-box" /></div>
        <div className="row">
          <button type="button" className="btn btn-sm" onClick={resetKey}>Reset API key</button>
          <button type="button" className="btn btn-sm" onClick={saveKey}>Pakai di Try it</button>
          <button type="button" className="btn btn-sm btn-danger" onClick={logout}>Keluar</button>
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
  return state.session ? <ProfileCard result={state.session} onChanged={load} /> : <GuestCard cfg={state.cfg} />;
}
