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
  siteName: "Kaelyn Api's",
  creator: "Kadokun",
  baseUrl: "https://api.kadokunn.com",

  // Nama header yang dibaca untuk API key (query ?apikey= dan Authorization: Bearer juga didukung)
  keyHeader: "x-api-key",

  // Gateway QRIS (plugin di src/plugins/qris). Token diambil dari env QRIS_INTERNAL_TOKEN.
  // Untuk repo private, token boleh diisi di sini, tapi env tetap lebih aman.
  qrisBaseUrl: "https://qris.kadokunn.com",
  qrisInternalToken: "",

  // Batas request per hari untuk pengguna tanpa API key (per IP). 0 = tanpa batas.
  anonymousDailyLimit: 0,

  // Definisi plan. dailyLimit = jumlah request per hari (reset 00:00 UTC). 0 = tanpa batas.
  // Plan yang bisa dibeli punya: price (rupiah), durationDays (null = selamanya), label.
  plans: {
    free: { dailyLimit: 500, premium: false },
    premium: { dailyLimit: 10000, premium: true },

    // Paket berbayar (dibeli lewat /api/buy + QRIS GoPay)
    weekly: { dailyLimit: 1000, premium: true, price: 5000, durationDays: 7, label: "Weekly", tagline: "7 hari akses premium" },
    biweekly: { dailyLimit: 2000, premium: true, price: 10000, durationDays: 14, label: "2 Weeks", tagline: "14 hari akses premium" },
    monthly: { dailyLimit: 5000, premium: true, price: 20000, durationDays: 30, label: "1 Month", tagline: "30 hari akses premium" },
    quarterly: { dailyLimit: 10000, premium: true, price: 40000, durationDays: 90, label: "3 Months", tagline: "90 hari akses premium" },
    vvip: { dailyLimit: 0, premium: true, price: 50000, durationDays: null, label: "VVIP", tagline: "Unlimited request, selamanya", unlimited: true, featured: true }
  },

  // Urutan paket yang ditampilkan di halaman beli
  planOrder: ["weekly", "biweekly", "monthly", "quarterly", "vvip"]
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
