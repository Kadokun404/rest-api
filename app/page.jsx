import Link from "next/link";
import CodePlayground from "@/components/CodePlayground";
import HomeStats from "@/components/HomeStats";
import { SITE } from "@/lib/site";

export default function HomePage() {
  return (
    <div className="container fade-in">
      {/* ---------- HERO SECTION (SENSUAL CYBERPUNK NOIR) ---------- */}
      <section className="hero mistral-hero">
        <div className="mistral-badge-row">
          <span className="mistral-pixel-badge">
            <span className="pixel-square" />
            ARASHI REST API · SENSUAL &amp; POWERFUL ENGINE
          </span>
          <span className="mistral-status-pill">
            <span className="status-live-dot" />
            Sange &amp; Aktif 24/7 · 99.9% Uptime
          </span>
        </div>

        <h1 className="mistral-headline">
          Sensual &amp; Elegan, <br />
          <span className="mistral-flame-text">API Tanpa Batas.</span>
        </h1>

        <p className="lead mistral-lead">
          Arashi Api&apos;s menyediakan ekosistem REST API publik dan VIP berkecepatan tinggi:
          AI berotak pintar, anime &amp; scraper terlengkap, downloader media tanpa watermark,
          dan otomasi bot siap pakai dengan respon JSON konsisten.
        </p>

        <div className="hero-actions">
          <Link href="/endpoints" className="btn btn-primary mistral-btn-primary">
            Jelajahi 150+ Endpoints <span className="arrow-icon">→</span>
          </Link>
          <Link href="/docs" className="btn mistral-btn-secondary">
            Dokumentasi API
          </Link>
          <Link href="/premium" className="btn mistral-btn-secondary">
            Paket VIP Premium
          </Link>
        </div>

        {/* ---------- INTERACTIVE CODE PLAYGROUND ---------- */}
        <div className="hero-playground-wrapper">
          <CodePlayground />
        </div>
      </section>

      {/* ---------- LIVE STATS ---------- */}
      <HomeStats />

      {/* ---------- PLATFORM CAPABILITIES ---------- */}
      <section className="section">
        <div className="section-header-block">
          <span className="sub-badge" style={{ color: "var(--accent)", letterSpacing: "0.1em" }}>
            [ SENSUAL PLATFORM CAPABILITIES ]
          </span>
          <h2 className="section-heading">Fitur &amp; Keunggulan Arashi API</h2>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
            Dibangun khusus untuk developer modern, bot developer, dan aplikasi web performa tinggi.
          </p>
        </div>

        <div className="grid grid-2 mistral-cards-grid">
          <div className="card mistral-card">
            <div className="mistral-card-num">[ 01 ]</div>
            <h3 className="mistral-card-title">AI Brain &amp; Engine Pintar</h3>
            <p className="muted mistral-card-desc">
              Integrasi multi-model AI cerdas, natural language chat, text-to-speech sensual, dan image processing siap pakai untuk bot WhatsApp maupun web app kamu.
            </p>
            <div className="mistral-card-footer">
              <Link href="/endpoints?category=ai" className="mistral-card-link">
                Coba AI endpoints →
              </Link>
            </div>
          </div>

          <div className="card mistral-card">
            <div className="mistral-card-num">[ 02 ]</div>
            <h3 className="mistral-card-title">Ultimate Anime &amp; Media Scraper</h3>
            <p className="muted mistral-card-desc">
              Scraper tercepat &amp; terlengkap: AnimeIDHentai, NekoPoi, Otakudesu, Hanime, streaming m3u8, dan komik reader tanpa ribet atau terhalang proteksi.
            </p>
            <div className="mistral-card-footer">
              <Link href="/endpoints?category=anime" className="mistral-card-link">
                Eksplorasi anime scraper →
              </Link>
            </div>
          </div>

          <div className="card mistral-card">
            <div className="mistral-card-num">[ 03 ]</div>
            <h3 className="mistral-card-title">Performa &amp; Latency Sub-100ms</h3>
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
            <div className="mistral-card-num">[ 04 ]</div>
            <h3 className="mistral-card-title">QRIS Instan &amp; VIP Access</h3>
            <p className="muted mistral-card-desc">
              Integrasi pembuatan barcode QRIS dinamis otomatis dengan webhook callback untuk verifikasi pembayaran real-time di bot WhatsApp dan web store.
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
            <div className="mistral-support-icon">♥</div>
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                Butuh Bantuan atau Integrasi Khusus?
              </h3>
              <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
                Hubungi support resmi kami atau request custom endpoint via email:{" "}
                <a href={`mailto:${SITE.supportEmail}`} className="link-underline" style={{ color: "var(--accent)", fontWeight: 600 }}>
                  {SITE.supportEmail}
                </a>
              </p>
            </div>
          </div>
          <a href={`mailto:${SITE.supportEmail}`} className="btn mistral-btn-support">
            Hubungi Support
          </a>
        </div>
      </section>
    </div>
  );
}
