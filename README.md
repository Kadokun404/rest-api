# Kaelyn Api's

REST API hub di **api.kadokunn.com** oleh Kadokun.
Frontend **Next.js (App Router)**, backend tetap **Express + sistem plugin** (di-host lewat `pages/api`).

## Struktur

```text
app/                  halaman Next.js (/, /docs, /endpoints, /premium, /payment, /uploader, /status, /account)
components/           komponen UI (Header, EndpointExplorer, TryIt, PaymentModal, ...)
lib/                  helper frontend (api, snippets, hook endpoints, notifikasi)
styles/globals.css    seluruh CSS: tokens, base, komponen (mobile-first)
pages/api/[...path].js  jembatan Next -> Express
src/                  backend Express (app.js, auth.js, function.js, store.js, mediaProxy.js)
src/plugins/<kategori>/<nama>.js   1 file = 1 endpoint -> /<kategori>/<nama>
src/plugin-manifest.js   dibuat otomatis, jangan diedit
scripts/              gen-plugin-manifest.mjs, genkey.js
public/               favicon, og-image, manifest
```

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

`predev` dan `prebuild` membuat ulang `src/plugin-manifest.js`. Setelah menambah file plugin baru, jalankan ulang `npm run dev` atau `npm run build`.

## Deploy (Vercel)

```bash
vercel --prod
```

`vercel.json` sudah `"framework": "nextjs"`. Kalau di dashboard Vercel project ini sebelumnya diset **Other**, ubah Framework Preset ke **Next.js** dan kosongkan Build/Output override.

Environment variable yang dipakai backend (tidak berubah): `QRIS_INTERNAL_TOKEN`, `KAELYN_API_KEYS`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, dan variabel login GitHub / storage KV seperti sebelumnya.

Baru: banner maintenance memakai `MAINTENANCE_ENABLED=true` dan `MAINTENANCE_MESSAGE="..."`.

## Routing

| URL | Dilayani oleh |
| --- | --- |
| `/`, `/docs`, `/endpoints`, `/premium`, `/payment`, `/uploader`, `/status`, `/account` | Next.js |
| `/api/*` | Express via `pages/api/[...path].js` |
| `/<kategori>/<plugin>`, `POST /upload`, `/<token>.<ext>` | Express, lewat `rewrites` di `next.config.mjs` |
| `/donate`, `/stats` | redirect ke `/payment`, `/status` |
| `GET /upload` | redirect ke `/uploader` |
