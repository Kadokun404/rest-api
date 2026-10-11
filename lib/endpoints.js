"use client";
import { useEffect, useState } from "react";
import { getJSON } from "./api";

const UPLOAD_ENDPOINT = {
  name: "Upload File",
  category: "tools",
  endpoint: "/upload",
  method: ["POST"],
  description: "Upload file multipart (maks 50 MB), hasilkan URL langsung pakai",
  premium: false,
  params: {
    file: { type: "file", required: true, description: 'File yang diunggah, dikirim sebagai multipart field "file"' }
  }
};

let cache = null; // { registry, flat }
let inflight = null;

async function fetchRegistry() {
  if (cache) return cache;
  if (!inflight) {
    inflight = getJSON("/api/endpoints").then(({ ok, data }) => {
      const raw = ok && data?.result?.endpoints ? data.result.endpoints : null;
      if (!raw) { inflight = null; return null; }
      const registry = {};
      for (const [cat, list] of Object.entries(raw)) registry[cat] = [...list];
      registry.tools = [UPLOAD_ENDPOINT, ...(registry.tools || [])];
      const flat = Object.entries(registry).flatMap(([category, list]) => list.map((ep) => ({ ...ep, category })));
      cache = { registry, flat };
      return cache;
    });
  }
  return inflight;
}

/** Memuat katalog endpoint sekali, lalu dipakai ulang antar halaman. */
export function useEndpoints() {
  const [state, setState] = useState(() => ({ ...(cache || { registry: {}, flat: [] }), loading: !cache, failed: false }));

  useEffect(() => {
    let alive = true;
    fetchRegistry().then((res) => {
      if (!alive) return;
      setState(res ? { ...res, loading: false, failed: false } : { registry: {}, flat: [], loading: false, failed: true });
    });
    return () => { alive = false; };
  }, []);

  return state;
}
