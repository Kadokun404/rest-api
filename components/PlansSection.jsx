"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import PaymentModal from "./PaymentModal";
import EndpointRowStatic from "./EndpointRowStatic";
import { useEndpoints } from "@/lib/endpoints";
import { getJSON } from "@/lib/api";
import { fmtNum, fmtRp, cx } from "@/lib/format";

const DURATION_OPTIONS = [
  { days: 1, label: "1 Hari" },
  { days: 3, label: "3 Hari" },
  { days: 7, label: "7 Hari (Default)" },
  { days: 14, label: "14 Hari" },
  { days: 30, label: "30 Hari" }
];

export function PlanGrid() {
  const [plans, setPlans] = useState(null);
  const [failed, setFailed] = useState(false);
  const [checkout, setCheckout] = useState(null);
  const [selectedDays, setSelectedDays] = useState({ premium: 7, vip: 7 });

  useEffect(() => {
    let alive = true;
    getJSON("/api/plans").then(({ ok, data }) => {
      if (!alive) return;
      if (ok && data?.result?.plans) {
        setPlans(data.result.plans);
        const initial = {};
        for (const p of data.result.plans) {
          initial[p.id] = p.durationDays || 7;
        }
        setSelectedDays((prev) => ({ ...initial, ...prev }));
      } else {
        setFailed(true);
      }
    });
    return () => { alive = false; };
  }, []);

  if (failed) return <p className="muted" style={{ fontSize: 14 }}>Daftar paket belum bisa dimuat. Coba lagi nanti.</p>;
  if (!plans) return <p className="muted" style={{ fontSize: 14 }}>Memuat paket...</p>;

  return (
    <>
      <div className="grid grid-2" style={{ maxWidth: 840, margin: "0 auto" }}>
        {plans.map((p) => {
          const days = selectedDays[p.id] || p.durationDays || 7;
          const dailyRate = p.dailyRate || Math.round(p.price / (p.durationDays || 7)) || 500;
          const currentPrice = dailyRate * days;

          return (
            <div key={p.id} className={cx("card plan", p.featured && "featured")}>
              {p.featured && <span className="plan-badge">REKOMENDASI</span>}
              <span className="plan-label">{p.label}</span>
              <span className="plan-price">{fmtRp(currentPrice)}</span>
              <span className="plan-tag" style={{ fontSize: 12 }}>
                {fmtRp(dailyRate)} / hari · Durasi: {days} hari
              </span>

              {/* Selector Durasi */}
              <div style={{ margin: "14px 0 10px" }}>
                <span className="muted mono-sm" style={{ display: "block", marginBottom: 6, fontSize: 11 }}>
                  PILIH DURASI PAKET:
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      className={cx("btn btn-xs", days === opt.days ? "btn-primary" : "btn-subtle")}
                      style={{ fontSize: 11, padding: "4px 8px" }}
                      onClick={() => setSelectedDays((prev) => ({ ...prev, [p.id]: opt.days }))}
                    >
                      {opt.days === 7 ? "7 Hari (Seminggu)" : opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <ul>
                <li>{p.unlimited ? "Token & request tanpa batas (Unlimited)" : `Limit ${fmtNum(p.dailyLimit || 500)} token / hari`}</li>
                <li>{p.unlimited ? "Bebas akses semua endpoint" : `10 token / request (s.d. ${(p.dailyLimit || 500) / 10} request / hari)`}</li>
                <li>{`${days} hari akses aktif`}</li>
                <li>Akses penuh ke semua endpoint premium &amp; QRIS</li>
              </ul>

              <button
                type="button"
                className="btn btn-primary btn-sm btn-block"
                style={{ marginTop: 14 }}
                onClick={() => setCheckout({ kind: "buy", plan: p.id, days })}
              >
                Beli {p.label} ({days} Hari - {fmtRp(currentPrice)})
              </button>
            </div>
          );
        })}
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
