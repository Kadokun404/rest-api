"use client";
import { useState, useRef } from "react";
import CodeBlock from "./CodeBlock";
import JsonView from "./JsonView";
import { CopyIcon, CheckIcon, ImageIcon } from "./Icons";
import { APIKEY_STORAGE } from "@/lib/site";
import { storage } from "@/lib/storage";
import { cx } from "@/lib/format";

export default function TryIt({
  ep,
  method: parentMethod,
  setMethod: parentSetMethod,
  values: parentValues,
  setValues: parentSetValues,
  files: parentFiles,
  setFiles: parentSetFiles,
  snippets: parentSnippets
}) {
  const params = Object.entries(ep.params || {});
  const availableMethods = Array.isArray(ep.method) ? ep.method : [ep.method || "GET"];

  // Local state fallbacks if not controlled by parent
  const [localMethod, setLocalMethod] = useState(availableMethods[0] || "GET");
  const [localValues, setLocalValues] = useState(() =>
    Object.fromEntries(params.filter(([, v]) => v.type !== "file").map(([k, v]) => [k, v.example != null ? String(v.example) : ""]))
  );
  const [localFiles, setLocalFiles] = useState({});

  const method = parentMethod !== undefined ? parentMethod : localMethod;
  const setMethod = parentSetMethod || setLocalMethod;
  const values = parentValues !== undefined ? parentValues : localValues;
  const setValues = parentSetValues || setLocalValues;
  const files = parentFiles !== undefined ? parentFiles : localFiles;
  const setFiles = parentSetFiles || setLocalFiles;

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [uploadingKey, setUploadingKey] = useState(null);

  // Helper untuk deteksi apakah parameter ini menerima gambar
  const isImageParam = (k, v) => {
    if (v.type === "file") return true;
    const key = k.toLowerCase();
    const desc = (v.description || "").toLowerCase();
    return (
      key === "url" ||
      key.includes("image") ||
      key.includes("img") ||
      key.includes("foto") ||
      desc.includes("gambar") ||
      desc.includes("foto") ||
      desc.includes("image")
    );
  };

  async function handleGalleryPick(k, file) {
    if (!file) return;
    setUploadingKey(k);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data?.status && data?.result?.url) {
        setValues((s) => ({ ...s, [k]: data.result.url }));
      } else {
        alert(data?.message || "Gagal mengunggah foto dari galeri");
      }
    } catch (err) {
      alert("Gagal mengunggah: " + err.message);
    } finally {
      setUploadingKey(null);
    }
  }

  async function run() {
    setRunning(true);
    setResult({ pending: true });

    const headers = {};
    let url = ep.endpoint;
    let body;
    const fileKey = params.find(([, v]) => v.type === "file")?.[0];

    if (method === "GET") {
      const qs = new URLSearchParams();
      Object.entries(values).forEach(([k, v]) => {
        if (v !== "" && v !== undefined) qs.append(k, v);
      });
      if (qs.toString()) url += "?" + qs.toString();
    } else if (fileKey && files[fileKey]) {
      const fd = new FormData();
      fd.append(fileKey, files[fileKey]);
      Object.entries(values).forEach(([k, v]) => {
        if (v !== "" && v !== undefined) fd.append(k, v);
      });
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
      try {
        json = JSON.parse(text);
      } catch {}
      setResult({ status: res.status, statusText: res.statusText, ms, json, text });
    } catch (err) {
      setResult({ error: err.message || "Request gagal" });
    } finally {
      setRunning(false);
    }
  }

  const copyCurl = () => {
    const textToCopy = parentSnippets?.curl || "";
    if (textToCopy && navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const statusClass = (s) =>
    s >= 200 && s < 300 ? "status-2xx" : s >= 400 && s < 500 ? "status-4xx" : "status-5xx";

  return (
    <div>
      {/* Method selector bila endpoint mendukung GET & POST */}
      {availableMethods.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>Pilih Method:</span>
          <div className="tabs" style={{ margin: 0 }}>
            {availableMethods.map((m) => (
              <button
                key={m}
                type="button"
                className={cx("tab", method === m && "active")}
                style={{ padding: "4px 14px", fontSize: 12, fontWeight: 700 }}
                onClick={() => setMethod(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input parameters */}
      {params.length ? (
        params.map(([k, v]) => {
          const isFile = v.type === "file";
          const isImage = isImageParam(k, v);

          return (
            <div className="field" key={k} style={{ marginBottom: 16 }}>
              <label htmlFor={`p-${k}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span>
                  {k}{v.required && <span className="req">*</span>}{" "}
                  <span className="muted" style={{ fontSize: 11.5 }}>({v.type || "string"})</span>
                </span>
                {v.description && (
                  <span className="muted" style={{ fontSize: 11.5 }}>{v.description}</span>
                )}
              </label>

              {isFile ? (
                /* Custom Gallery Image Upload Box - menggantikan browser file default */
                <div style={{ marginTop: 6 }}>
                  <input
                    id={`file-${k}`}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setFiles((f) => ({ ...f, [k]: file }));
                    }}
                  />
                  {files[k] ? (
                    <div className="gallery-selected">
                      <img
                        src={URL.createObjectURL(files[k])}
                        alt="Preview"
                        style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {files[k].name}
                        </div>
                        <div className="muted" style={{ fontSize: 11 }}>
                          {(files[k].size / 1024).toFixed(1)} KB · Foto galeri dipilih
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{ padding: "4px 10px", fontSize: 11 }}
                        onClick={() => {
                          setFiles((f) => {
                            const next = { ...f };
                            delete next[k];
                            return next;
                          });
                        }}
                      >
                        Ganti Foto
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn-gallery-upload"
                      onClick={() => document.getElementById(`file-${k}`)?.click()}
                    >
                      <ImageIcon style={{ width: 20, height: 20, color: "var(--accent)" }} />
                      <span>Pilih Foto dari Galeri</span>
                    </button>
                  )}
                </div>
              ) : isImage ? (
                /* Text input untuk URL gambar dengan tombol gallery picker instan */
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      id={`p-${k}`}
                      className="input"
                      value={values[k] ?? ""}
                      placeholder={v.description || "https://..."}
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      onChange={(e) => setValues((s) => ({ ...s, [k]: e.target.value }))}
                      style={{ flex: 1 }}
                    />
                    <input
                      id={`gallery-upload-${k}`}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => handleGalleryPick(k, e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", padding: "8px 12px" }}
                      onClick={() => document.getElementById(`gallery-upload-${k}`)?.click()}
                      disabled={uploadingKey === k}
                      title="Pilih foto langsung dari galeri HP / perangkat"
                    >
                      <ImageIcon style={{ width: 16, height: 16, color: "var(--accent)" }} />
                      <span>{uploadingKey === k ? "Mengunggah..." : "Galeri"}</span>
                    </button>
                  </div>

                  {/* Preview thumbnail foto bila terisi URL gambar */}
                  {values[k] && typeof values[k] === "string" && values[k].startsWith("http") && (
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
                      <img
                        src={values[k]}
                        alt="Preview"
                        style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }}
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                      <span className="muted" style={{ fontSize: 11.5 }}>Preview foto aktif siap diproses</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Standard input text */
                <input
                  id={`p-${k}`}
                  className="input"
                  value={values[k] ?? ""}
                  placeholder={v.description || ""}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  onChange={(e) => setValues((s) => ({ ...s, [k]: e.target.value }))}
                  style={{ marginTop: 6 }}
                />
              )}
            </div>
          );
        })
      ) : (
        <p className="muted" style={{ fontSize: 13, margin: "0 0 10px" }}>Langsung jalankan tanpa parameter.</p>
      )}

      {/* Action Buttons: Run & Copy cURL */}
      <div className="row" style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary btn-sm" onClick={run} disabled={running}>
          {running ? "Memproses..." : "Run"}
        </button>

        {parentSnippets?.curl && (
          <button
            type="button"
            className="btn btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            onClick={copyCurl}
            title="Salin cURL dengan parameter dan method saat ini"
          >
            {copied ? (
              <>
                <CheckIcon style={{ width: 14, height: 14, color: "var(--ok)" }} />
                <span>cURL Disalin!</span>
              </>
            ) : (
              <>
                <CopyIcon style={{ width: 14, height: 14 }} />
                <span>Copy cURL</span>
              </>
            )}
          </button>
        )}

        <span className="muted" style={{ fontSize: 12.5 }}>
          {ep.premium ? "Endpoint premium · butuh apikey." : "Endpoint publik."}
        </span>
      </div>

      {result?.pending && <p className="muted mono-sm" style={{ marginTop: 14 }}>Mengirim request...</p>}
      {result?.error && (
        <div style={{ marginTop: 14 }}>
          <div className="resp-meta"><span className="status-code status-5xx">Gagal</span></div>
          <CodeBlock wrap bodyClassName="result-scroll" code={result.error} />
        </div>
      )}
      {result?.status != null && (
        <div style={{ marginTop: 14 }}>
          <div className="resp-meta">
            <span className={cx("status-code", statusClass(result.status))}>
              {result.status} {result.statusText}
            </span>
            <span className="resp-time">{result.ms} ms</span>
          </div>
          <CodeBlock
            title="response"
            copyText={result.json ? JSON.stringify(result.json, null, 2) : result.text}
            bodyClassName="result-scroll"
          >
            {result.json ? <JsonView value={result.json} /> : result.text || "(kosong)"}
          </CodeBlock>
        </div>
      )}
    </div>
  );
}
