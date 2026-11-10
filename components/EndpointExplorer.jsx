"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useEndpoints } from "@/lib/endpoints";
import { buildSnippets } from "@/lib/snippets";
import { cx } from "@/lib/format";
import CodeBlock from "./CodeBlock";
import { MethodBadges } from "./EndpointRow";
import TryIt from "./TryIt";
import { SearchIcon } from "./Icons";
import { APIKEY_STORAGE } from "@/lib/site";
import { storage } from "@/lib/storage";

const TABS = [["curl", "curl"], ["javascript", "JavaScript"], ["python", "Python"]];

const matches = (ep, q) =>
  !q || ep.endpoint.toLowerCase().includes(q) || (ep.name || "").toLowerCase().includes(q) || (ep.description || "").toLowerCase().includes(q);

function EndpointDetail({ ep }) {
  const [tab, setTab] = useState("curl");
  const params = Object.entries(ep.params || {});
  const availableMethods = Array.isArray(ep.method) ? ep.method : [ep.method || "GET"];
  const [method, setMethod] = useState(availableMethods[0] || "GET");
  const [apiKey, setApiKey] = useState("");
  const [values, setValues] = useState(() =>
    Object.fromEntries(params.filter(([, v]) => v.type !== "file").map(([k, v]) => [k, v.example != null ? String(v.example) : ""]))
  );
  const [files, setFiles] = useState({});

  useEffect(() => {
    const savedKey = storage.get(APIKEY_STORAGE) || "";
    setApiKey(savedKey);
  }, []);

  useEffect(() => {
    const nextMethods = Array.isArray(ep.method) ? ep.method : [ep.method || "GET"];
    setMethod(nextMethods[0] || "GET");
    setValues(Object.fromEntries(params.filter(([, v]) => v.type !== "file").map(([k, v]) => [k, v.example != null ? String(v.example) : ""])));
    setFiles({});
  }, [ep.endpoint]);

  const snippets = useMemo(() =>
    buildSnippets(ep, values, files, method, apiKey),
    [ep, values, files, method, apiKey]
  );

  return (
    <div className="ep-detail wide">
      <div>
        {ep.premium && <p style={{ margin: "14px 0 0" }}><span className="badge badge-premium">Premium - butuh apikey</span></p>}

        <h3>Parameter</h3>
        {params.length ? (
          <div className="table-scroll">
            <table className="params">
              <thead><tr><th>Nama</th><th>Tipe</th><th>Deskripsi</th><th>Contoh</th></tr></thead>
              <tbody>
                {params.map(([k, v]) => (
                  <tr key={k}>
                    <td className="name">{k}{v.required && <span className="req">*</span>}</td>
                    <td className="mono-sm muted">{v.type || "string"}</td>
                    <td>{v.description || ""}</td>
                    <td className="mono-sm muted">{v.example != null ? String(v.example) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="muted" style={{ fontSize: 13, margin: 0 }}>Tanpa parameter.</p>}

        <h3>Try it</h3>
        <TryIt
          key={ep.endpoint}
          ep={ep}
          method={method}
          setMethod={setMethod}
          apiKey={apiKey}
          setApiKey={setApiKey}
          values={values}
          setValues={setValues}
          files={files}
          setFiles={setFiles}
          snippets={snippets}
        />
      </div>

      <div>
        <h3>Contoh kode</h3>
        <div className="tabs" role="tablist">
          {TABS.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className={cx("tab", tab === id && "active")} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        <div style={{ marginTop: 10 }}>
          <CodeBlock title={tab} code={snippets[tab]} />
        </div>
      </div>
    </div>
  );
}

export default function EndpointExplorer() {
  const { registry, loading, failed } = useEndpoints();
  const params = useSearchParams();
  const [activeCat, setActiveCat] = useState(null);
  const [openEp, setOpenEp] = useState(null);
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);

  const focusSearch = useCallback(() => {
    searchRef.current?.focus();
    searchRef.current?.select();
  }, []);

  // Pilih kategori / endpoint dari URL (?cat=...&ep=...) atau default kategori pertama.
  const catParam = params.get("cat");
  const epParam = params.get("ep");
  useEffect(() => {
    const cats = Object.keys(registry);
    if (!cats.length) return;
    setActiveCat((cur) => {
      if (catParam && registry[catParam]) return catParam;
      if (epParam) {
        const hit = cats.find((c) => registry[c].some((e) => e.endpoint === epParam));
        if (hit) return hit;
      }
      return cur && registry[cur] ? cur : cats[0];
    });
    if (epParam) setOpenEp(epParam);
  }, [registry, catParam, epParam]);

  // Ctrl+K dari header, atau ?focus=1.
  useEffect(() => {
    window.addEventListener("kaelyn:focus-search", focusSearch);
    if (params.get("focus")) setTimeout(focusSearch, 60);
    return () => window.removeEventListener("kaelyn:focus-search", focusSearch);
  }, [focusSearch, params]);

  const q = query.trim().toLowerCase();
  const cats = Object.entries(registry)
    .map(([cat, list]) => ({ cat, list: list.filter((ep) => matches(ep, q)) }))
    .filter((c) => c.list.length || !q);
  const current = cats.find((c) => c.cat === activeCat) || cats[0];

  return (
    <div className="explorer">
      <aside className="explorer-side">
        <div className="search-wrap">
          <SearchIcon />
          <input ref={searchRef} className="search-input" type="search" placeholder="Cari endpoint..." autoComplete="off" aria-label="Cari endpoint"
            value={query} onChange={(e) => setQuery(e.target.value)} />
          <span className="search-hint" aria-hidden="true">Ctrl K</span>
        </div>
        <div className="cat-list" role="tablist" aria-label="Kategori">
          {cats.map(({ cat, list }) => (
            <button key={cat} type="button" role="tab" aria-selected={current?.cat === cat} className={cx("cat-item", current?.cat === cat && "active")}
              onClick={() => { setActiveCat(cat); setOpenEp(null); }}>
              <span>{cat}</span>
              <span className="cat-count">{list.length}</span>
            </button>
          ))}
        </div>
      </aside>

      <div style={{ minWidth: 0 }}>
        {loading && <p className="muted">Memuat endpoint...</p>}
        {failed && <p className="muted">Gagal memuat daftar endpoint. Coba muat ulang halaman.</p>}
        {!loading && !failed && !current && <p className="muted">Tidak ada hasil.</p>}
        {current && (
          <>
            <p className="section-title" style={{ textTransform: "capitalize", marginBottom: 16 }}>
              {current.cat} · {current.list.length} endpoint
            </p>
            {current.list.length === 0 ? (
              <p className="muted">Tidak ada endpoint yang cocok.</p>
            ) : (
              <div className="bento-grid">
                {current.list.map((ep) => {
                  const open = openEp === ep.endpoint;
                  const paramCount = Object.keys(ep.params || {}).length;
                  return (
                    <div key={ep.endpoint} className={cx("bento-card", open && "open")}>
                      <div
                        className="bento-card-header"
                        onClick={() => setOpenEp(open ? null : ep.endpoint)}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="bento-badges">
                          <MethodBadges methods={ep.method} />
                          {ep.premium && <span className="badge badge-premium">Premium</span>}
                        </div>
                        <span className="mono-sm muted" style={{ fontSize: 11, textTransform: "uppercase" }}>
                          {current.cat}
                        </span>
                      </div>

                      <div
                        onClick={() => setOpenEp(open ? null : ep.endpoint)}
                        style={{ cursor: "pointer", flex: 1 }}
                      >
                        <h3 className="bento-card-title">{ep.name || ep.endpoint.split("/").pop()}</h3>
                        <code className="bento-card-endpoint">{ep.endpoint}</code>
                        <p className="bento-card-desc">
                          {ep.description || "Endpoint siap pakai dengan performa tinggi."}
                        </p>
                      </div>

                      <div className="bento-card-footer">
                        <span>{paramCount > 0 ? `${paramCount} parameter` : "Tanpa parameter"}</span>
                        <button
                          type="button"
                          className="btn btn-xs"
                          onClick={() => setOpenEp(open ? null : ep.endpoint)}
                          style={{ fontWeight: 600 }}
                        >
                          {open ? "Tutup ▲" : "Coba / Test ▼"}
                        </button>
                      </div>

                      {open && (
                        <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                          <EndpointDetail ep={{ ...ep, category: current.cat }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
