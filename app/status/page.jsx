import StatusBoard from "@/components/StatusBoard";

export const metadata = {
  title: "Status",
  description: "Status layanan Kaelyn Api's secara real-time.",
  alternates: { canonical: "/status" }
};

export default function StatusPage() {
  return (
    <div className="container fade-in">
      <div className="page-head">
        <h1>Status</h1>
        <p>Status layanan Kaelyn Api&apos;s secara real-time.</p>
      </div>
      <section className="section section-narrow section-last">
        <StatusBoard />
      </section>
    </div>
  );
}
