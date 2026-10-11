"use client";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/format";

export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export function CopyButton({ text, label = "Copy", className = "", plain = false }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function onClick() {
    if (await copyToClipboard(text)) {
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1200);
    }
  }
  return (
    <button type="button" className={cx(!plain && "copy-btn", copied && "copied", className)} onClick={onClick}>
      {copied ? "Tersalin" : label}
    </button>
  );
}

/**
 * Blok kode dengan header + tombol copy.
 * `copyText` dipakai bila isi (children) sudah berupa elemen berwarna.
 */
export default function CodeBlock({ title, code, copyText, children, dots = false, wrap = false, bodyClassName = "" }) {
  const toCopy = copyText ?? code ?? "";
  return (
    <div className="code">
      <div className="code-head">
        {dots && (<span className="code-dots" aria-hidden="true"><i /><i /><i /></span>)}
        {title && <span className="code-title">{title}</span>}
        {toCopy ? <CopyButton text={toCopy} /> : null}
      </div>
      <pre className={cx("code-body", wrap && "wrap", bodyClassName)}>{children ?? code}</pre>
    </div>
  );
}
