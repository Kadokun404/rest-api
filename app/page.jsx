import Link from "next/link";
import CodePlayground from "@/components/CodePlayground";
import HomeStats from "@/components/HomeStats";
import { SITE } from "@/lib/site";

export default function HomePage() {
  return (
    <div className="container fade-in">
      {/* ---------- HERO SECTION (MISTRAL STYLE) ---------- */}
      <section className="hero mistral-hero">
        <div className="mistral-badge-row">
          <span className="mistral-pixel-badge">
            <span className="pixel-square" />
            ARASHI REST API · DEVELOPER ENGINE
          </span>
          <span className="mistral-status-pill">
            <span className="status-live-dot" />
            All Systems Operational
          </span>
        </div>

        <h1 className="mistral-headline">
          Frontend Elegan, <br />
          <span className="mistral-flame-text">API Bertenaga.</span>
        </h1>

        <p className="lead mistral-lead">
          Arashi Api&apos;s menyediakan ekosistem REST API publik dan premium berkecepatan tinggi.
          Satu endpoint, format JSON konsisten, arsitektur serverless siap produksi, tanpa konfigurasi rumit.
        </p>

        <div className="hero-actions">
          <Link href="/endpoints" className="btn btn-primary mistral-btn-primary">
            Jelajahi Endpoints <span className="arrow-icon">→</span>
          </Link>
          <Link href="/docs" className="btn mistral-btn-secondary">
            Dokumentasi API
          </Link>
          <Link href="/premium" className="btn mistral-btn-secondary">
            Paket Premium
          </Link>
        </div>

        {/* ---------- INTERACTIVE CODE PLAYGROUND ---------- */}
        <div className="hero-playground-wrapper">
          <CodePlayground />
        </div>
      </section>

      {/* ---------- LIVE STATS ---------- */}
      <HomeStats />

      {/* ---------- MISTRAL FEATURE CARDS ---------- */}
      <section className="section">
        <div className="section-header-block">
          <span className="sub-badge">[ PLATFORM CAPABILITIES ]</span>
          <h2 className="section-heading">Fitur & Keunggulan Arashi API</h2>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
            Dibangun khusus untuk developer modern, bot developer, dan aplikasi web performa tinggi.
          </p>
        </div>

        <div className="grid grid-2 mistral-cards-grid">
          <div className="card mistral-card">
            <div className="mistral-card-num">[ 01 ]</div>
            <h3 className="mistral-card-title">Tanpa API Key (Publik)</h3>
            <p className="muted mistral-card-desc">
              Endpoint publik langsung bisa kamu panggil dari cURL, browser, atau aplikasi tanpa registrasi. Sangat cocok untuk prototyping dan project skala kecil.
            </p>
            <div className="mistral-card-footer">
              <Link href="/endpoints" className="mistral-card-link">
                Cari endpoint gratis →
              </Link>
            </div>
          </div>

          <div className="card mistral-card">
            <div className="mistral-card-num">[ 02 ]</div>
            <h3 className="mistral-card-title">Performa & Latency Rendah</h3>
            <p className="muted mistral-card-desc">
              Dijalankan di infrastruktur Vercel Edge Network global dengan optimasi kompresi response dan intelligent caching untuk kecepatan maksimal.
            </p>
            <div className="mistral-card-footer">
              <Link href="/status" className="mistral-card-link">
                Cek status latency →
              </Link>
            </div>
          </div>

          <div className="card mistral-card">
            <div className="mistral-card-num">[ 03 ]</div>
            <h3 className="mistral-card-title">Paket Premium & Kuota Tinggi</h3>
            <p className="muted mistral-card-desc">
              Butuh kuota request harian lebih besar atau akses endpoint eksklusif? Dapatkan API key kustom dengan autentikasi header <code className="inline-code">x-api-key</code>.
            </p>
            <div className="mistral-card-footer">
              <Link href="/premium" className="mistral-card-link">
                Lihat pilihan kuota →
              </Link>
            </div>
          </div>

          <div className="card mistral-card">
            <div className="mistral-card-num">[ 04 ]</div>
            <h3 className="mistral-card-title">QRIS & Payment Gateway</h3>
            <p className="muted mistral-card-desc">
              Integrasi pembuatan barcode QRIS dinamis instan dengan webhook callback untuk verifikasi pembayaran otomatis di bot atau aplikasi toko online.
            </p>
            <div className="mistral-card-footer">
              <Link href="/payment" className="mistral-card-link">
                Eksplorasi integrasi payment →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- CONTACT SUPPORT BANNER ---------- */}
      <section className="section section-last">
        <div className="card mistral-support-card">
          <div className="mistral-support-content">
            <div className="mistral-support-icon">✉</div>
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600 }}>Butuh Bantuan atau Integrasi Khusus?</h3>
              <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
                Hubungi support teknis resmi kami melalui email:{" "}
                <a href={`mailto:${SITE.supportEmail}`} className="link-underline" style={{ color: "var(--accent)", fontWeight: 600 }}>
                  {SITE.supportEmail}
                </a>
              </p>
            </div>
          </div>
          <a href={`mailto:${SITE.supportEmail}`} className="btn mistral-btn-support">
            Kirim Email Support
          </a>
        </div>
      </section>
    </div>
  );
}
