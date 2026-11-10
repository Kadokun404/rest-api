"use client";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";

const CURL_AUTH = `curl -X GET "https://kadokunn.com/api/info/runtime" \\
  -H "x-api-key: KEY_KAMU" \\
  -H "Accept: application/json"`;

const CURL_DOWNLOAD = `curl -X GET "https://kadokunn.com/api/downloader/tiktok?url=https://vt.tiktok.com/ZSjxxxxxx/" \\
  -H "x-api-key: KEY_KAMU"`;

const JS_EXAMPLE = `// Menggunakan Fetch API di Node.js / Browser
const response = await fetch("https://kadokunn.com/api/downloader/spotify?url=https://open.spotify.com/track/...", {
  headers: {
    "x-api-key": "KEY_KAMU",
    "Accept": "application/json"
  }
});
const data = await response.json();
console.log(data);`;

const PYTHON_EXAMPLE = `import requests

url = "https://kadokunn.com/api/search/google-image"
headers = {
    "x-api-key": "KEY_KAMU",
    "Accept": "application/json"
}
params = {"query": "anime aesthetic wallpaper"}

response = requests.get(url, headers=headers, params=params)
print(response.json())`;

const BAILEYS_EXAMPLE = `// Integrasi langsung di bot WhatsApp (Baileys)
import { downloadMediaMessage } from "@whiskeysockets/baileys";

async function handleTiktok(sock, m, tiktokUrl) {
  const res = await fetch(\`https://kadokunn.com/api/downloader/tiktok?url=\${encodeURIComponent(tiktokUrl)}\`, {
    headers: { "x-api-key": "KEY_KAMU" }
  });
  const json = await res.json();
  if (json.status && json.result?.video) {
    await sock.sendMessage(m.key.remoteJid, {
      video: { url: json.result.video },
      caption: \`🎬 \${json.result.title || "TikTok Video"}\`
    }, { quoted: m });
  }
}`;

export default function DocsPage() {
  return (
    <div className="container fade-in">
      <div className="page-head" style={{ marginBottom: 28 }}>
        <span className="sub-badge" style={{ marginBottom: 8, display: "inline-block" }}>[ DEVELOPER DOCUMENTATION ]</span>
        <h1 style={{ margin: "0 0 8px" }}>Dokumentasi Arashi API</h1>
        <p className="muted" style={{ maxWidth: 650, margin: 0, fontSize: 15 }}>
          Panduan lengkap integrasi Arashi REST API: Base URL, autentikasi header, sistem kuota token, format respons seragam, dan contoh kode implementasi.
        </p>
      </div>

      <div className="docs-stripe-container">
        {/* KOLOM KIRI: SIDEBAR NAVIGASI TOPIK */}
        <aside className="docs-sidebar-nav">
          <div className="docs-nav-group-title">Overview</div>
          <a href="#base-url" className="docs-nav-link">Base URL</a>
          <a href="#autentikasi" className="docs-nav-link">Autentikasi</a>
          <a href="#kuota-token" className="docs-nav-link">Kuota Token & Limit</a>

          <div className="docs-nav-group-title">Standar Response</div>
          <a href="#format-response" className="docs-nav-link">Format JSON</a>
          <a href="#status-code" className="docs-nav-link">Kode Status HTTP</a>

          <div className="docs-nav-group-title">Contoh Integrasi</div>
          <a href="#sdk-curl" className="docs-nav-link">cURL (Bash)</a>
          <a href="#sdk-js" className="docs-nav-link">JavaScript / Node.js</a>
          <a href="#sdk-python" className="docs-nav-link">Python</a>
          <a href="#sdk-baileys" className="docs-nav-link">WhatsApp Bot (Baileys)</a>

          <div className="docs-nav-group-title">Bantuan</div>
          <a href="#support-faq" className="docs-nav-link">Support & Bantuan</a>
        </aside>

        {/* KOLOM TENGAH: KONTEN UTAMA DOKUMENTASI */}
        <div className="docs-main-content">
          {/* BASE URL */}
          <section id="base-url" className="docs-section-card">
            <h2>Base URL</h2>
            <p>
              Semua endpoint Arashi API disajikan melalui protokol aman HTTPS dengan serverless Edge Network Vercel. Gunakan domain resmi berikut sebagai host dasar pengerjaan request kamu:
            </p>
            <CodeBlock title="production base url" code="https://kadokunn.com" />
            <p style={{ marginTop: 12, fontSize: 13 }}>
              Alias mirror alternatif: <code className="inline-code">https://www.kadokunn.com</code>
            </p>
          </section>

          {/* AUTENTIKASI */}
          <section id="autentikasi" className="docs-section-card">
            <h2>Autentikasi API</h2>
            <p>
              Arashi API menggunakan sistem autentikasi fleksibel:
            </p>
            <ul style={{ paddingLeft: 20, margin: "0 0 16px", fontSize: 14, lineHeight: 1.7 }} className="muted">
              <li><strong style={{ color: "var(--text)" }}>Wajib API Key:</strong> Semua endpoint wajib menyertakan API key aktif (lewat header <code className="inline-code">x-api-key</code> atau query <code className="inline-code">?apikey=</code>).</li>
              <li><strong style={{ color: "var(--text)" }}>HTTP Header:</strong> Sangat direkomendasikan mengirim key melalui HTTP header <code className="inline-code">x-api-key: KEY_KAMU</code>.</li>
              <li><strong style={{ color: "var(--text)" }}>Query Parameter:</strong> Alternatif query <code className="inline-code">?apikey=KEY_KAMU</code> juga didukung untuk kemudahan URL embedding / download langsung.</li>
              <li><strong style={{ color: "var(--text)" }}>Dev & Owner Mode:</strong> Akun admin (<code className="inline-code">admin@kadokunn.com</code>) otomatis memiliki hak istimewa unlimited bypass rate limit!</li>
            </ul>
            <CodeBlock title="bash - autentikasi header" code={CURL_AUTH} />
          </section>

          {/* KUOTA TOKEN & RATE LIMIT */}
          <section id="kuota-token" className="docs-section-card">
            <h2>Sistem Kuota Token & Limit Harian</h2>
            <p>
              Untuk memastikan stabilitas performa server dan mencegah spam bot, konsumsi API dihitung berdasarkan sistem token harian yang di-reset otomatis setiap hari pada <b>00:00 UTC</b>:
            </p>
            <div className="table-scroll" style={{ marginBottom: 16 }}>
              <table className="params">
                <thead>
                  <tr>
                    <th>Tier Akun</th>
                    <th>Kuota Harian</th>
                    <th>Konsumsi per Request</th>
                    <th>Total Panggilan / Hari</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="name">Anonim (Belum Login)</td>
                    <td className="mono-sm">100 Token</td>
                    <td className="mono-sm">10 Token</td>
                    <td>10 request / hari (per IP)</td>
                  </tr>
                  <tr>
                    <td className="name">Free User (Sudah Login)</td>
                    <td className="mono-sm">100 Token</td>
                    <td className="mono-sm">10 Token</td>
                    <td>10 request / hari (per API key)</td>
                  </tr>
                  <tr>
                    <td className="name">Premium Member</td>
                    <td className="mono-sm">500 Token</td>
                    <td className="mono-sm">10 Token</td>
                    <td>50 request / hari</td>
                  </tr>
                  <tr>
                    <td className="name" style={{ color: "var(--accent)" }}>VIP & Dev Admin</td>
                    <td className="mono-sm" style={{ fontWeight: 700 }}>Unlimited</td>
                    <td className="mono-sm">0 Token</td>
                    <td>Tanpa Batasan (Unlimited)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 13 }}>
              Kamu dapat memantau sisa kuota kamu secara real-time di halaman <Link href="/account" className="link-underline">Pengaturan Akun</Link>.
            </p>
          </section>

          {/* FORMAT RESPONSE */}
          <section id="format-response" className="docs-section-card">
            <h2>Format Response Standar JSON</h2>
            <p>
              Setiap response dari Arashi API selalu mengembalikan struktur payload JSON seragam, sehingga memudahkan parsing di bahasa pemrograman apapun.
            </p>
            <div className="stack" style={{ gap: 14 }}>
              <div>
                <p className="section-title" style={{ margin: "0 0 6px" }}>Respons Sukses (HTTP 200)</p>
                <CodeBlock title="json - response sukses" copyText={'{\n  "status": true,\n  "creator": "Kadokun",\n  "result": {\n    "title": "Contoh Judul Konten",\n    "url": "https://cdn.kadokunn.com/media/file.mp4"\n  }\n}'}>
                  <span className="j-key">&quot;status&quot;</span>: <span className="j-bool">true</span>,{"\n"}
                  <span className="j-key">&quot;creator&quot;</span>: <span className="j-str">&quot;Kadokun&quot;</span>,{"\n"}
                  <span className="j-key">&quot;result&quot;</span>: {"{\n    \"title\": \"Contoh Judul Konten\",\n    \"url\": \"https://cdn.kadokunn.com/media/file.mp4\"\n  }"}
                </CodeBlock>
              </div>

              <div>
                <p className="section-title" style={{ margin: "0 0 6px" }}>Respons Error / Kuota Habis (HTTP 4xx / 5xx)</p>
                <CodeBlock title="json - response error" copyText={'{\n  "status": false,\n  "creator": "Kadokun",\n  "message": "Token harian kamu telah habis. Silakan upgrade ke Premium atau tunggu reset pukul 00:00 UTC."\n}'}>
                  <span className="j-key">&quot;status&quot;</span>: <span className="j-bool">false</span>,{"\n"}
                  <span className="j-key">&quot;creator&quot;</span>: <span className="j-str">&quot;Kadokun&quot;</span>,{"\n"}
                  <span className="j-key">&quot;message&quot;</span>: <span className="j-str">&quot;Token harian kamu telah habis. Silakan upgrade ke Premium.&quot;</span>
                </CodeBlock>
              </div>
            </div>
          </section>

          {/* KODE STATUS HTTP */}
          <section id="status-code" className="docs-section-card">
            <h2>Kode Status HTTP</h2>
            <p>
              Arashi API menggunakan kode status HTTP standar untuk mengindikasikan keberhasilan atau kegagalan request:
            </p>
            <div className="table-scroll">
              <table className="params">
                <thead>
                  <tr><th>Kode</th><th>Status</th><th>Keterangan</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="name" style={{ color: "var(--ok)" }}>200</td>
                    <td>OK</td>
                    <td>Permintaan berhasil diproses dan hasil data ada di field <code className="inline-code">result</code>.</td>
                  </tr>
                  <tr>
                    <td className="name" style={{ color: "var(--warn)" }}>400</td>
                    <td>Bad Request</td>
                    <td>Parameter wajib kurang atau format URL yang dikirim tidak valid.</td>
                  </tr>
                  <tr>
                    <td className="name" style={{ color: "var(--warn)" }}>401</td>
                    <td>Unauthorized</td>
                    <td>API key tidak disediakan atau token key tidak terdaftar di sistem.</td>
                  </tr>
                  <tr>
                    <td className="name" style={{ color: "var(--err)" }}>429</td>
                    <td>Too Many Requests</td>
                    <td>Kuota token harian telah habis atau terkena rate limit abuse protection.</td>
                  </tr>
                  <tr>
                    <td className="name" style={{ color: "var(--err)" }}>500</td>
                    <td>Internal Server Error</td>
                    <td>Terjadi kesalahan pada upstream provider service pihak ketiga.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* SDK INTEGRASI */}
          <section id="sdk-integrasi" className="docs-section-card">
            <h2>Contoh Integrasi & SDK</h2>
            <p>
              Contoh pemanggilan endpoint Arashi API di berbagai bahasa pemrograman dan framework modern:
            </p>

            <div id="sdk-curl" style={{ marginBottom: 20 }}>
              <p className="section-title" style={{ margin: "0 0 6px" }}>cURL / Shell</p>
              <CodeBlock title="bash" code={CURL_DOWNLOAD} />
            </div>

            <div id="sdk-js" style={{ marginBottom: 20 }}>
              <p className="section-title" style={{ margin: "0 0 6px" }}>JavaScript / Node.js (Fetch API)</p>
              <CodeBlock title="javascript" code={JS_EXAMPLE} />
            </div>

            <div id="sdk-python" style={{ marginBottom: 20 }}>
              <p className="section-title" style={{ margin: "0 0 6px" }}>Python (Requests)</p>
              <CodeBlock title="python" code={PYTHON_EXAMPLE} />
            </div>

            <div id="sdk-baileys" style={{ marginBottom: 10 }}>
              <p className="section-title" style={{ margin: "0 0 6px" }}>WhatsApp Bot (Baileys Multi-Device)</p>
              <CodeBlock title="baileys" code={BAILEYS_EXAMPLE} />
            </div>
          </section>

          {/* SUPPORT & FAQ */}
          <section id="support-faq" className="docs-section-card">
            <h2>Bantuan & Kontak Support</h2>
            <p>
              Mengalami kendala teknis, butuh integrasi custom, atau ingin upgrade ke kuota enterprise tanpa batas? Hubungi tim support resmi kami kapan saja:
            </p>
            <div className="mistral-support-card">
              <div className="mistral-support-content">
                <div className="mistral-support-icon">✉️</div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 15 }}>Official Support Mailbox</h4>
                  <p className="muted" style={{ margin: "2px 0 0", fontSize: 13 }}>
                    Email: <a href="mailto:admin@kadokunn.com" className="link-underline" style={{ color: "var(--accent)" }}>admin@kadokunn.com</a>
                  </p>
                </div>
              </div>
              <a href="mailto:admin@kadokunn.com" className="btn mistral-btn-support">
                Kirim Email Support
              </a>
            </div>
          </section>
        </div>

        {/* KOLOM KANAN: STICKY ON-THIS-PAGE TOC */}
        <aside className="docs-toc-sticky">
          <div className="docs-toc-title">Pada Halaman Ini</div>
          <a href="#base-url" className="docs-toc-link">Base URL</a>
          <a href="#autentikasi" className="docs-toc-link">Autentikasi API</a>
          <a href="#kuota-token" className="docs-toc-link">Kuota Token & Limit</a>
          <a href="#format-response" className="docs-toc-link">Format Response</a>
          <a href="#status-code" className="docs-toc-link">Kode Status HTTP</a>
          <a href="#sdk-integrasi" className="docs-toc-link">Contoh Integrasi</a>
          <a href="#sdk-curl" className="docs-toc-link" style={{ paddingLeft: 10 }}>• cURL</a>
          <a href="#sdk-js" className="docs-toc-link" style={{ paddingLeft: 10 }}>• JavaScript</a>
          <a href="#sdk-python" className="docs-toc-link" style={{ paddingLeft: 10 }}>• Python</a>
          <a href="#sdk-baileys" className="docs-toc-link" style={{ paddingLeft: 10 }}>• WhatsApp Baileys</a>
          <a href="#support-faq" className="docs-toc-link">Bantuan & Kontak</a>
        </aside>
      </div>
    </div>
  );
}