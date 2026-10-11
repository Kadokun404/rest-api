"use client";
import { useRef, useState } from "react";
import CodeBlock, { CopyButton } from "./CodeBlock";
import { UploadIcon } from "./Icons";
import { useToast } from "./Toast";
import { UPLOAD_SNIPPETS } from "@/lib/snippets";
import { cx } from "@/lib/format";

const MAX_BYTES = 50 * 1024 * 1024;
const TABS = [["curl", "curl"], ["javascript", "JavaScript"], ["python", "Python"]];

export default function Uploader() {
  const { toast } = useToast();
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState(null); // null = idle
  const [result, setResult] = useState(null); // { url } | { error } | { pending }
  const [tab, setTab] = useState("curl");

  function upload(file) {
    if (!file) return;
    if (file.size > MAX_BYTES) { toast("File maksimal 50 MB", "err"); return; }
    const fd = new FormData();
    fd.append("file", file);
    setProgress(0);
    setResult({ pending: true });

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/upload");
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      setProgress(null);
      let data = null;
      try { data = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && data?.status === true && data.result?.url) setResult({ url: data.result.url });
      else setResult({ error: data?.message || "Upload gagal" });
    };
    xhr.onerror = () => { setProgress(null); setResult({ error: "Koneksi gagal" }); };
    xhr.send(fd);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <>
      <section className="section" style={{ maxWidth: 680 }}>
        <div
          className={cx("dropzone", over && "over")}
          onDragEnter={(e) => { e.preventDefault(); setOver(true); }}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setOver(false); }}
          onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files?.[0]); }}
        >
          <UploadIcon />
          <div style={{ fontWeight: 500 }}>Tarik file ke sini</div>
          <div className="muted" style={{ fontSize: 13, margin: "4px 0 12px" }}>atau pilih dari perangkat · maks 50 MB</div>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => inputRef.current?.click()}>Pilih file</button>
          <input ref={inputRef} type="file" hidden onChange={(e) => upload(e.target.files?.[0])} />
        </div>

        {progress !== null && <div className="progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${progress}%` }} /></div>}

        <div style={{ marginTop: 16 }}>
          {result?.pending && <p className="muted mono-sm" style={{ margin: 0 }}>Mengunggah...</p>}
          {result?.error && <p style={{ color: "var(--err)", fontSize: 13, margin: 0 }}>{result.error}</p>}
          {result?.url && (
            <div className="card card-pad">
              <div className="muted" style={{ fontSize: 13 }}>Berhasil diunggah</div>
              <div className="result-url">
                <input className="input" value={result.url} readOnly aria-label="URL file" onFocus={(e) => e.target.select()} />
                <CopyButton text={result.url} plain className="btn btn-sm btn-primary" />
              </div>
              <div style={{ marginTop: 10 }}>
                <a className="btn btn-sm" href={result.url} target="_blank" rel="noopener noreferrer">Buka file</a>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="section section-narrow section-last">
        <p className="section-title">Contoh kode</p>
        <div className="tabs" role="tablist">
          {TABS.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className={cx("tab", tab === id && "active")} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        <div style={{ marginTop: 10 }}>
          <CodeBlock title="POST /upload" code={UPLOAD_SNIPPETS[tab]} />
        </div>
      </section>
    </>
  );
}
