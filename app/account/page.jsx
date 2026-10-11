import AccountPanel from "@/components/AccountPanel";

export const metadata = {
  title: "Akun",
  description: "Masuk untuk melihat kuota, mengelola API key, dan menyinkronkan pembelian premium.",
  alternates: { canonical: "/account" },
  robots: { index: false }
};

export default function AccountPage() {
  return (
    <div className="container fade-in">
      <div className="page-head">
        <h1>Akun</h1>
        <p>Masuk untuk melihat kuota, mengelola API key, dan menyinkronkan pembelian premium.</p>
      </div>
      <section className="section section-last" style={{ maxWidth: 560 }}>
        <AccountPanel />
      </section>
    </div>
  );
}
