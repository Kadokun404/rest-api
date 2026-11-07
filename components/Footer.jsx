import Link from "next/link";
import { SITE } from "@/lib/site";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" className="brand" style={{ marginBottom: 8 }}>
              <span className="brand-logo" style={{ overflow: "hidden", background: "transparent" }}>
                <img src="/favicon1.png" alt="Arashi" width={24} height={24} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </span>
              <span className="brand-name">Arashi Api&apos;s</span>
            </Link>
            <p className="muted" style={{ fontSize: 13, margin: 0, maxWidth: 300 }}>
              REST API publik dan premium berkecepatan tinggi untuk developer. Dibuat oleh {SITE.creator}.
            </p>
          </div>
          <div className="footer-col">
            <h4>Produk</h4>
            <Link href="/endpoints">Endpoints</Link>
            <Link href="/premium">Premium</Link>
            <Link href="/uploader">Uploader</Link>
            <Link href="/status">Status</Link>
          </div>
          <div className="footer-col">
            <h4>Navigasi</h4>
            <Link href="/docs">Docs</Link>
            <Link href="/payment">Dukung Kami</Link>
            <Link href="/account">Akun</Link>
          </div>
          <div className="footer-col">
            <h4>Bantuan & Kontak</h4>
            <a href={`mailto:${SITE.supportEmail}`} className="support-link" style={{ color: "var(--accent)", fontWeight: 500 }}>
              {SITE.supportEmail}
            </a>
            <p className="muted" style={{ fontSize: 12.5, margin: "6px 0 0" }}>
              Butuh integrasi kustom, laporan bug, atau bantuan API key? Hubungi tim support kami.
            </p>
          </div>
        </div>
        <div className="footer-bottom-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
          <p className="footer-note" style={{ margin: 0 }}>© {year} Arashi Api&apos;s · kadokunn.com</p>
          <div className="footer-socials" style={{ display: "flex", gap: 14, fontSize: 13 }}>
            <a href="https://t.me/kaelynapibot" target="_blank" rel="noopener noreferrer" className="muted link-underline">Telegram</a>
            <a href="https://whatsapp.com/channel/0029Vb9RLRs8PgsHbmafzM1e" target="_blank" rel="noopener noreferrer" className="muted link-underline">WhatsApp Channel</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
