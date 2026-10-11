import { Suspense } from "react";
import EndpointExplorer from "@/components/EndpointExplorer";

export const metadata = {
  title: "Endpoints",
  description: "Semua endpoint Kaelyn Api's. Pilih kategori, buka endpoint, lalu coba langsung dari panel Try it.",
  alternates: { canonical: "/endpoints" }
};

export default function EndpointsPage() {
  return (
    <div className="container fade-in">
      <div className="page-head">
        <h1>Endpoints</h1>
        <p>Semua endpoint Kaelyn Api&apos;s. Pilih kategori, buka endpoint, lalu coba langsung dari panel Try it.</p>
      </div>
      <Suspense fallback={<p className="muted">Memuat...</p>}>
        <EndpointExplorer />
      </Suspense>
    </div>
  );
}
