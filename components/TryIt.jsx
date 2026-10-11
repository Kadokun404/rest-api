"use client";
import { useState } from "react";
import CodeBlock from "./CodeBlock";
import JsonView from "./JsonView";
import { APIKEY_STORAGE } from "@/lib/site";
import { storage } from "@/lib/storage";
import { cx } from "@/lib/format";

export default function TryIt({ ep }) {
  const params = Object.entries(ep.params || {});
  const method = (ep.method && ep.method[0]) || "GET";
  const [values, setValues] = useState(() => Object.fromEntries(params.filter(([, v]) => v.type !== "file").map(([k, v]) => [k, v.example != null ? String(v.example) : ""])));
  const [files, setFiles] = useState({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  async function run() {
    setRunning(true);
    setResult({ pending: true });

    const headers = {};
    let url = ep.endpoint;
    let body;
    const fileKey = params.find(([, v]) => v.type === "file")?.[0];

    if (method === "GET") {
      const qs = new URLSearchParams();
      Object.entries(values).forEach(([k, v]) => { if (v !== "") qs.append(k, v); });
      if (qs.toString()) url += "?" + qs.toString();
    } else if (fileKey && files[fileKey]) {
      const fd = new FormData();
      fd.append(fileKey, files[fileKey]);
      body = fd;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(values);
    }
    const key = storage.get(APIKEY_STORAGE);
    if (ep.premium && key) headers["x-api-key"] = key;

    const t0 = performance.now();
    try {
      const res = await fetch(url, { method, headers, body });
      const ms = Math.round(performance.now() - t0);
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch {}
      setResult({ status: res.status, statusText: res.statusText, ms, json, text });
    } catch (err) {
      setResult({ error: err.message || "Request gagal" });
    } finally {
      setRunning(false);
    }
  }

  const statusClass = (s) => (s >= 200 && s < 300 ? "status-2xx" : s >= 400 && s < 500 ? "status-4xx" : "status-5xx");

  return (
    <div>
      {params.length ? params.map(([k, v]) => (
        <div className="field" key={k}>
          <label htmlFor={`p-${k}`}>
            {k}{v.required && <span className="req">*</span>} {v.type !== "file" && <span className="muted">({v.type || "string"})</span>}
          </label>
          {v.type === "file" ? (
            <input id={`p-${k}`} className="input" type="file" onChange={(e) => setFiles((f) => ({ ...f, [k]: e.target.files?.[0] || null }))} />
          ) : (
            <input id={`p-${k}`} className="input" value={values[k] ?? ""} placeholder={v.description || ""} autoCapitalize="off" autoCorrect="off" spellCheck={false}
              onChange={(e) => setValues((s) => ({ ...s, [k]: e.target.value }))} />
          )}
        </div>
      )) : <p className="muted" style={{ fontSize: 13, margin: "0 0 8px" }}>Langsung jalankan.</p>}

      <div className="row" style={{ marginTop: 12 }}>
        <button type="button" className="btn btn-primary btn-sm" onClick={run} disabled={running}>{running ? "Berjalan..." : "Run"}</button>
        <span className="muted" style={{ fontSize: 12.5 }}>{ep.premium ? "Endpoint premium - set API key di Akun." : "Endpoint publik."}</span>
      </div>

      {result?.pending && <p className="muted mono-sm" style={{ marginTop: 14 }}>Mengirim request...</p>}
      {result?.error && (
        <>
          <div className="resp-meta"><span className="status-code status-5xx">Gagal</span></div>
          <CodeBlock wrap bodyClassName="result-scroll" code={result.error} />
        </>
      )}
      {result?.status != null && (
        <>
          <div className="resp-meta">
            <span className={cx("status-code", statusClass(result.status))}>{result.status} {result.statusText}</span>
            <span className="resp-time">{result.ms} ms</span>
          </div>
          <CodeBlock title="response" copyText={result.json ? JSON.stringify(result.json, null, 2) : result.text} bodyClassName="result-scroll">
            {result.json ? <JsonView value={result.json} /> : result.text || "(kosong)"}
          </CodeBlock>
        </>
      )}
    </div>
  );
}
