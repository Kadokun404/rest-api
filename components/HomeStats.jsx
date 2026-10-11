"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useEndpoints } from "@/lib/endpoints";

export default function HomeStats() {
  const { registry, flat, loading } = useEndpoints();
  const [latency, setLatency] = useState(null);

  useEffect(() => {
    let alive = true;
    const t0 = performance.now();
    fetch("/info/ping")
      .then((r) => { if (alive) setLatency(r.ok ? Math.round(performance.now() - t0) : false); })
      .catch(() => { if (alive) setLatency(false); });
    return () => { alive = false; };
  }, []);

  const cats = Object.entries(registry);
  const dash = "-";

  return (
    <>
      <section className="section">
        <div className="grid grid-stats">
          <div className="card stat"><div className="stat-val">{loading ? dash : flat.length}</div><div className="stat-label">Total endpoint</div></div>
          <div className="card stat"><div className="stat-val">{loading ? dash : cats.length}</div><div className="stat-label">Kategori</div></div>
          <div className="card stat"><div className="stat-val">{latency === null ? dash : latency === false ? dash : `${latency} ms`}</div><div className="stat-label">Latensi API</div></div>
        </div>
      </section>

      {cats.length > 0 && (
        <section className="section">
          <p className="section-title">Kategori endpoint</p>
          <div className="grid grid-3">
            {cats.map(([cat, list]) => (
              <Link key={cat} href={`/endpoints?cat=${encodeURIComponent(cat)}`} className="card cat-card">
                <span className="cat-card-name">{cat}</span>
                <span className="cat-card-count">{list.length} endpoint</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
