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
        <h1>Premium</h1>
        <p>Naikkan limit harian dan buka endpoint eksklusif seperti QRIS. Pembayaran otomatis via QRIS GoPay.</p>
      </div>

      <section className="section">
        <p className="section-title">Paket</p>
        <PlanGrid />
      </section>

      <section className="section section-narrow">
        <p className="section-title">Cara pakai API key</p>
        <p className="muted" style={{ marginTop: 0, fontSize: 14 }}>
          Setelah pembayaran terkonfirmasi, kamu akan menerima API key. Kirimkan lewat header <code className="inline-code">x-api-key</code> pada setiap request ke endpoint premium.
        </p>
        <CodeBlock title="bash" code={"curl https://api.kadokunn.com/qris/status \\\n  -H 'x-api-key: KEY_KAMU'"} />
      </section>

      <section className="section section-last">
        <p className="section-title">Endpoint QRIS</p>
        <QrisList />
      </section>
    </div>
  );
}
