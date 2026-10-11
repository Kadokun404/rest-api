import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container">
      <div className="page-head" style={{ padding: "72px 0" }}>
        <h1>404</h1>
        <p style={{ marginBottom: 20 }}>Halaman yang kamu cari tidak ditemukan.</p>
        <Link href="/" className="btn btn-primary">Ke beranda</Link>
      </div>
    </div>
  );
}
