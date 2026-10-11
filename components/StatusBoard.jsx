"use client";
import { useCallback, useEffect, useState } from "react";
import { cx } from "@/lib/format";

const SERVICES = [
  { name: "REST API", desc: "Server utama", url: "/info/ping" },
  { name: "Endpoint Catalog", desc: "Registry endpoint", url: "/api/endpoints" },
  { name: "Pembayaran QRIS", desc: "Paket & donasi", url: "/api/plans" },
  { name: "Autentikasi", desc: "Login Telegram & GitHub", url: "/api/auth/config" },
  { name: "Uploader", desc: "Penyimpanan file", url: "/info/ping" }
];

export default function StatusBoard() {
  const [results, setResults] = useState(() => SERVICES.map(() => ({ state: "wait", label: "memeriksa..." })));

  const check = useCallback(() => {
    setResults(SERVICES.map(() => ({ state: "wait", label: "memeriksa..." })));
    SERVICES.forEach(async (s, i) => {
      const t0 = performance.now();
      let next;
      try {
        const r = await fetch(s.url, { cache: "no-store" });
        next = r.ok ? { state: "on", label: `${Math.round(performance.now() - t0)} ms` } : { state: "off", label: `HTTP ${r.status}` };
      } catch {
        next = { state: "off", label: "offline" };
      }
      setResults((prev) => prev.map((x, idx) => (idx === i ? next : x)));
    });
  }, []);

  useEffect(() => { check(); }, [check]);

  return (
    <>
      <div className="grid">
        {SERVICES.map((s, i) => (
          <div className="card svc" key={s.name}>
            <span className={cx("dot", `dot-${results[i].state}`)} />
            <div className="svc-info">
              <div className="svc-name">{s.name}</div>
              <div className="svc-desc">{s.desc}</div>
            </div>
            <span className="svc-lat">{results[i].label}</span>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-sm" style={{ marginTop: 14 }} onClick={check}>Cek ulang</button>
    </>
  );
}
