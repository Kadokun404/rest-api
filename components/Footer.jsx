import Link from "next/link";
import { LogoMark } from "./Icons";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" className="brand" style={{ marginBottom: 8 }}>
              <span className="brand-logo"><LogoMark /></span>
              <span className="brand-name">Kaelyn Api&apos;s</span>
            </Link>
            <p className="muted" style={{ fontSize: 13, margin: 0, maxWidth: 280 }}>REST API publik untuk developer. Dibuat oleh Kadokun.</p>
          </div>
          <div className="footer-col">
            <h4>Produk</h4>
            <Link href="/endpoints">Endpoints</Link>
            <Link href="/premium">Premium</Link>
            <Link href="/uploader">Uploader</Link>
            <Link href="/status">Status</Link>
          </div>
          <div className="footer-col">
            <h4>Lainnya</h4>
            <Link href="/docs">Docs</Link>
            <Link href="/payment">Dukung Kami</Link>
            <Link href="/account">Akun</Link>
          </div>
        </div>
        <p className="footer-note">© {year} Kaelyn Api&apos;s · api.kadokunn.com</p>
      </div>
    </footer>
  );
}
