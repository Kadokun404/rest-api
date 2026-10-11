import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";

export const metadata = {
  title: "Dokumentasi",
  description: "Panduan singkat memakai Kaelyn Api's: base URL, autentikasi, format response, dan penanganan error.",
  alternates: { canonical: "/docs" }
};

const CURL_AUTH = "curl https://api.kadokunn.com/qris/status \\\n  -H 'x-api-key: KEY_KAMU'";

export default function DocsPage() {
  return (
    <div className="container fade-in">
      <div className="page-head">
        <h1>Dokumentasi</h1>
        <p>Panduan singkat memakai Kaelyn Api&apos;s: base URL, autentikasi, format response, dan penanganan error.</p>
      </div>

      <section className="section section-narrow">
        <p className="section-title">Base URL</p>
        <CodeBlock title="base url" code="https://api.kadokunn.com" />
      </section>

      <section className="section section-narrow">
        <p className="section-title">Autentikasi</p>
        <p className="muted" style={{ marginTop: 0, fontSize: 14 }}>
          Endpoint publik tidak butuh key. Endpoint premium wajib menyertakan API key lewat header <code className="inline-code">x-api-key</code>. Query <code className="inline-code">?apikey=</code> juga didukung.
        </p>
        <CodeBlock title="bash" code={CURL_AUTH} />
      </section>

      <section className="section section-narrow">
        <p className="section-title">Format response</p>
        <div className="stack">
          <CodeBlock title="json - sukses" copyText={'{\n  "status": true,\n  "creator": "Kadokun",\n  "result": {}\n}'}>
            <span className="j-key">&quot;status&quot;</span>: <span className="j-bool">true</span>,{"\n"}
            <span className="j-key">&quot;creator&quot;</span>: <span className="j-str">&quot;Kadokun&quot;</span>,{"\n"}
            <span className="j-key">&quot;result&quot;</span>: {"{ ... }"}
          </CodeBlock>
          <CodeBlock title="json - error" copyText={'{\n  "status": false,\n  "message": "API key tidak valid"\n}'}>
            <span className="j-key">&quot;status&quot;</span>: <span className="j-bool">false</span>,{"\n"}
            <span className="j-key">&quot;message&quot;</span>: <span className="j-str">&quot;API key tidak valid&quot;</span>
          </CodeBlock>
        </div>
      </section>

      <section className="section section-narrow section-last">
        <p className="section-title">Rate limit</p>
        <p className="muted" style={{ fontSize: 14, margin: 0 }}>
          Setiap response menyertakan header limit harian. Limit reset pada 00:00 UTC. Punya akun? Cek kuota kamu di halaman{" "}
          <Link href="/account" className="link-underline">Akun</Link>.
        </p>
      </section>
    </div>
  );
}
