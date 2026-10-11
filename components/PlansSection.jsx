"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import PaymentModal from "./PaymentModal";
import EndpointRowStatic from "./EndpointRowStatic";
import { useEndpoints } from "@/lib/endpoints";
import { getJSON } from "@/lib/api";
import { fmtNum, fmtRp, cx } from "@/lib/format";

export function PlanGrid() {
  const [plans, setPlans] = useState(null);
  const [failed, setFailed] = useState(false);
  const [checkout, setCheckout] = useState(null);

  useEffect(() => {
    let alive = true;
    getJSON("/api/plans").then(({ ok, data }) => {
      if (!alive) return;
      if (ok && data?.result?.plans) setPlans(data.result.plans);
      else setFailed(true);
    });
    return () => { alive = false; };
  }, []);

  if (failed) return <p className="muted" style={{ fontSize: 14 }}>Daftar paket belum bisa dimuat. Coba lagi nanti.</p>;
  if (!plans) return <p className="muted" style={{ fontSize: 14 }}>Memuat paket...</p>;

  return (
    <>
      <div className="grid grid-3">
        {plans.map((p) => (
          <div key={p.id} className={cx("card plan", p.featured && "featured")}>
            {p.featured && <span className="plan-badge">TERPOPULER</span>}
            <span className="plan-label">{p.label}</span>
            <span className="plan-price">{fmtRp(p.price)}</span>
            <span className="plan-tag">{p.tagline || ""}</span>
            <ul>
              <li>{p.unlimited ? "Request tanpa batas" : `Limit ${fmtNum(p.dailyLimit)} / hari`}</li>
              <li>{p.durationDays ? `${p.durationDays} hari akses` : "Berlaku selamanya"}</li>
              <li>API key premium</li>
            </ul>
            <button type="button" className="btn btn-primary btn-sm btn-block" onClick={() => setCheckout({ kind: "buy", plan: p.id })}>Pilih</button>
          </div>
        ))}
      </div>
      {checkout && <PaymentModal cfg={checkout} onClose={() => setCheckout(null)} />}
    </>
  );
}

export function QrisList() {
  const { registry, loading } = useEndpoints();
  const list = registry.qris || [];
  if (loading) return <p className="muted" style={{ fontSize: 13 }}>Memuat endpoint QRIS...</p>;
  if (!list.length) return <p className="muted" style={{ fontSize: 13 }}>Tidak ada endpoint QRIS.</p>;
  return (
    <div className="ep-list">
      {list.map((ep) => (
        <Link key={ep.endpoint} href={`/endpoints?cat=qris&ep=${encodeURIComponent(ep.endpoint)}`} className="ep-item">
          <EndpointRowStatic ep={ep} />
        </Link>
      ))}
    </div>
  );
}
