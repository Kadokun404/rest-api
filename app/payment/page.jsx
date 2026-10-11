import DonateForm from "@/components/DonateForm";

export const metadata = {
  title: "Dukung Kami",
  description: "Kaelyn Api's gratis untuk dipakai. Kalau bermanfaat, traktir kami segelas kopi via QRIS.",
  alternates: { canonical: "/payment" }
};

export default function PaymentPage() {
  return (
    <div className="container fade-in">
      <div className="page-head">
        <h1>Dukung Kami</h1>
        <p>Kaelyn Api&apos;s gratis untuk dipakai. Kalau bermanfaat, kamu bisa traktir kami segelas kopi via QRIS.</p>
      </div>
      <section className="section section-last" style={{ maxWidth: 520 }}>
        <DonateForm />
      </section>
    </div>
  );
}
