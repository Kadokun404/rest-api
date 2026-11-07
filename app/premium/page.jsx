import CodeBlock from "@/components/CodeBlock";
import { PlanGrid, QrisList } from "@/components/PlansSection";

export const metadata = {
  title: "Premium",
  description: "Naikkan limit harian dan buka endpoint eksklusif seperti QRIS. Pembayaran otomatis via QRIS GoPay.",
  alternates: { canonical: "/premium" }
};

export default function PremiumPage() {
  return (
    <div className="container fade-in">
      <div className="page-head">
        <h1>Langganan &amp; Token</h1>
        <p>Sistem token kuota Arashi Api: anonim / free mendapatkan 100 token/hari (10 token per call = 10 request). Upgrade ke Premium atau VIP untuk kuota lebih besar!</p>
      </div>

      {/* Free Tier Info */}
      <div className="card card-pad" style={{ marginBottom: 24, background: "var(--bg-subtle, #141416)", border: "1px dashed var(--border-color, #27272a)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <span className="mono-sm" style={{ color: "var(--accent, #f25c05)", fontWeight: 700 }}>TIER GRATIS / ANONIM</span>
            <h3 style={{ margin: "4px 0 2px" }}>100 Token / Hari</h3>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>Setiap pemanggilan endpoint gratis memakan 10 token (total 10 request harian). Reset otomatis setiap 00:00 UTC.</p>
          </div>
          <span className="pill">Gratis</span>
        </div>
      </div>

      <section className="section">
        <p className="section-title">Pilihan Paket Premium &amp; VIP</p>
        <PlanGrid />
      </section>

      <section className="section section-narrow">
        <p className="section-title">Cara pakai API key</p>
        <p className="muted" style={{ marginTop: 0, fontSize: 14 }}>
          Setelah pembayaran terkonfirmasi, kamu akan menerima API key. Kirimkan lewat header <code className="inline-code">x-api-key</code> pada setiap request ke endpoint premium.
        </p>
        <CodeBlock title="bash" code={"curl https://kadokunn.com/qris/status \\\n  -H 'x-api-key: KEY_KAMU'"} />
      </section>

      <section className="section section-last">
        <p className="section-title">Endpoint QRIS</p>
        <QrisList />
      </section>
    </div>
  );
}
