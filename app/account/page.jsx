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
      <AccountPanel />
    </div>
  );
}
