// Konfigurasi utama Kaelyn Api's
//
// API key bisa diisi dari dua tempat (keduanya digabung):
//   1. Daftar `localKeys` di bawah ini
//   2. Environment variable KAELYN_API_KEYS (JSON array, format sama dengan localKeys)
//
// PENTING: jika repository ini publik (GitHub), jangan taruh key asli di file ini.
// Pakai environment variable di Vercel (Settings > Environment Variables) supaya key tidak bocor.
//
// Buat key baru dengan:  npm run genkey -- premium "Nama Pemilik"

export const config = {
  siteName: "Arashi Api's",
  creator: "Kadokun",
  baseUrl: "https://kadokunn.com",

  // Nama header yang dibaca untuk API key (query ?apikey= dan Authorization: Bearer juga didukung)
  keyHeader: "x-api-key",

  // Gateway QRIS (plugin di src/plugins/qris). Token diambil dari env QRIS_INTERNAL_TOKEN.
  qrisBaseUrl: "https://qris.kadokunn.com",
  qrisInternalToken: "",

  // Batas token per hari untuk anonim (per IP) & free user. 100 token / hari.
  anonymousDailyLimit: 100,

  // Biaya token per pemanggilan fitur gratis (10 token per request)
  tokenCostPerCall: 10,

  // Definisi plan:
  // - Free: 100 token / hari (10 request gratis)
  // - Premium: 500 token / hari (50 request), Rp 500 / hari, default 7 hari = Rp 3.500
  // - VIP: Unlimited token & request, Rp 950 / hari, default 7 hari = Rp 6.650
  plans: {
    free: {
      dailyLimit: 100,
      premium: false,
      label: "Free",
      tagline: "100 token / hari (10 request)"
    },
    premium: {
      dailyLimit: 500,
      premium: true,
      dailyRate: 500,
      durationDays: 7,
      price: 3500,
      label: "Premium",
      tagline: "500 token / hari (50 request) · Rp 500/hari"
    },
    vip: {
      dailyLimit: 0,
      premium: true,
      unlimited: true,
      dailyRate: 950,
      durationDays: 7,
      price: 6650,
      label: "VIP",
      tagline: "Unlimited token & request tanpa batas · Rp 950/hari",
      featured: true
    }
  },

  // Urutan paket yang ditampilkan di halaman beli
  planOrder: ["premium", "vip"]
};

// Contoh entri:
// { key: "ka-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", name: "Owner", plan: "premium" },
// { key: "ka-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", name: "Teman", plan: "free", dailyLimit: 1000 },
// { key: "ka-xxx…(signed)…", name: "Klien A", plan: "premium", expires: "2026-12-31" }
export const localKeys = [];

// Kredensial Spotify (untuk metadata lagu di plugin /search/genius).
// Wajib diisi lewat env SPOTIFY_CLIENT_ID & SPOTIFY_CLIENT_SECRET, kalau kosong endpoint genius akan 404.
export const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "";
export const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "";
