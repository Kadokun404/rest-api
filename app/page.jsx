import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import HomeStats from "@/components/HomeStats";

export default function HomePage() {
  return (
    <div className="container fade-in">
      <section className="hero">
        <span className="hero-badge"><span className="hero-dot" /> REST API · Developer First</span>
        <h1>API yang rapi,<br /><span className="grad">langsung pakai.</span></h1>
        <p className="lead">Kaelyn Api&apos;s menyediakan REST API publik yang cepat dan konsisten. Satu endpoint, response JSON yang seragam, tanpa ribet.</p>
        <div className="hero-actions">
          <Link href="/docs" className="btn btn-primary">Mulai</Link>
          <Link href="/endpoints" className="btn">Lihat Endpoint</Link>
        </div>
        <div className="hero-code">
          <CodeBlock dots title="bash" code="curl https://api.kadokunn.com/info/ping" />
        </div>
      </section>

      <HomeStats />

      <section className="section section-last">
        <div className="grid grid-2">
          <div className="card card-pad">
            <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Tanpa API key</h3>
            <p className="muted" style={{ margin: "0 0 14px", fontSize: 14 }}>Endpoint publik langsung bisa dipanggil. Cocok untuk coba-coba dan project kecil.</p>
            <Link href="/endpoints" className="btn btn-sm">Jelajahi endpoint</Link>
          </div>
          <div className="card card-pad">
            <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Premium</h3>
            <p className="muted" style={{ margin: "0 0 14px", fontSize: 14 }}>Butuh limit lebih tinggi atau endpoint QRIS? Pakai API key di header <code className="inline-code">x-api-key</code>.</p>
            <Link href="/premium" className="btn btn-sm">Lihat paket</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
