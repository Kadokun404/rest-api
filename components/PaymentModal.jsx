"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Modal from "./Modal";
import CodeBlock from "./CodeBlock";
import { useToast } from "./Toast";
import { getJSON, postJSON } from "@/lib/api";
import { fmtRp } from "@/lib/format";
import { APIKEY_STORAGE } from "@/lib/site";
import { storage } from "@/lib/storage";

const TIMEOUT_MS = 5 * 60 * 1000;
const POLL_MS = 4000;
const MAX_ATTEMPTS = 150;

function Countdown({ deadline }) {
  const [left, setLeft] = useState(() => Math.max(0, deadline - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, deadline - Date.now())), 1000);
    return () => clearInterval(id);
  }, [deadline]);
  const m = String(Math.floor(left / 60000)).padStart(2, "0");
  const s = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
  return <span className="countdown">{m}:{s}</span>;
}

function QrView({ pay }) {
  if (pay.qr_image) return <div className="qr-wrap"><img src={pay.qr_image} alt="QRIS" /></div>;
  if (pay.qr_string) return <div className="qr-wrap"><QRCodeSVG value={pay.qr_string} size={220} level="M" /></div>;
  return <div className="qr-wrap"><p className="muted">QR tidak tersedia</p></div>;
}

/**
 * cfg: { kind: 'buy', plan } atau { kind: 'donate', amount }
 */
export default function PaymentModal({ cfg, onClose }) {
  const { toast } = useToast();
  const [phase, setPhase] = useState("creating"); // creating | qr | paid | error
  const [error, setError] = useState("");
  const [pay, setPay] = useState(null);
  const [paid, setPaid] = useState(null);
  const [deadline, setDeadline] = useState(0);
  const timer = useRef(null);
  const attempts = useRef(0);
  const stopped = useRef(false);

  const stop = useCallback(() => { stopped.current = true; clearInterval(timer.current); }, []);

  // 1) Buat QRIS
  useEffect(() => {
    stopped.current = false;
    (async () => {
      const res = cfg.kind === "buy" ? await postJSON("/api/buy", { plan: cfg.plan }) : await postJSON("/api/donate", { amount: cfg.amount });
      if (stopped.current) return;
      if (!res.ok || res.data?.status !== true || !res.data?.result) {
        setError(res.data?.message || "Gagal membuat QRIS");
        setPhase("error");
        return;
      }
      const o = res.data.result;
      setPay({
        ...cfg,
        ref: o.ref,
        amount: o.amount || cfg.amount,
        created_at: o.created_at,
        label: o.label || (cfg.kind === "donate" ? "Donasi" : "Premium"),
        qr_string: o.qr_string,
        qr_image: o.qr_image
      });
      setDeadline(Date.now() + TIMEOUT_MS);
      setPhase("qr");
    })();
    return stop;
  }, [cfg, stop]);

  // 2) Polling status pembayaran
  useEffect(() => {
    if (phase !== "qr" || !pay?.ref) return;
    attempts.current = 0;

    const check = async () => {
      if (stopped.current) return;
      attempts.current += 1;
      const base = pay.kind === "buy" ? `/api/buy/status?plan=${encodeURIComponent(pay.plan)}&` : "/api/donate/status?";
      const url = `${base}ref=${encodeURIComponent(pay.ref)}&amount=${encodeURIComponent(pay.amount)}${pay.created_at ? "&created_at=" + encodeURIComponent(pay.created_at) : ""}`;
      const { ok, data } = await getJSON(url);
      if (stopped.current) return;
      if (ok && data?.status === true && data.result?.paid) {
        stop();
        if (data.result.api_key) storage.set(APIKEY_STORAGE, data.result.api_key);
        setPaid(data.result);
        setPhase("paid");
      } else if (attempts.current > MAX_ATTEMPTS) {
        clearInterval(timer.current);
      }
    };

    timer.current = setInterval(check, POLL_MS);
    check();
    return () => clearInterval(timer.current);
  }, [phase, pay, stop]);

  function cancel() {
    if (pay?.ref) postJSON("/api/buy/cancel", { ref: pay.ref, amount: pay.amount });
    stop();
    onClose();
  }

  function close() { stop(); onClose(); }

  async function downloadReceipt() {
    const { ok, data } = await postJSON("/api/buy/receipt", { ref: pay.ref, amount: pay.amount, label: pay.label });
    if (ok && data?.result?.image) {
      const a = document.createElement("a");
      a.href = data.result.image;
      a.download = `struk-${pay.ref}.png`;
      a.click();
    } else toast("Gagal membuat struk", "err");
  }

  if (phase === "creating") {
    return <Modal title="Pembayaran" onClose={close}><p className="muted mono-sm" style={{ margin: 0 }}>Membuat QRIS...</p></Modal>;
  }

  if (phase === "error") {
    return (
      <Modal title="Pembayaran" onClose={close} footer={<button type="button" className="btn btn-block" onClick={close}>Tutup</button>}>
        <p className="muted" style={{ margin: 0 }}>{error}</p>
      </Modal>
    );
  }

  if (phase === "paid") {
    return (
      <Modal title="Pembayaran Berhasil" onClose={close}
        footer={<>
          <button type="button" className="btn btn-block" onClick={downloadReceipt}>Unduh struk</button>
          <button type="button" className="btn btn-primary btn-block" onClick={close}>Selesai</button>
        </>}>
        <p style={{ fontSize: 14, marginTop: 0 }}>Pembayaran berhasil. Terima kasih!</p>
        {paid?.api_key && (
          <>
            <label className="muted" style={{ fontSize: 13 }}>API Key kamu</label>
            <div style={{ margin: "6px 0 12px" }}><CodeBlock title="x-api-key" code={paid.api_key} bodyClassName="key-box" /></div>
          </>
        )}
        {paid?.bound_to_account && (
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            Premium sudah ditempel ke akunmu. Buka halaman <Link href="/account" className="link-underline" onClick={close}>Akun</Link>.
          </p>
        )}
      </Modal>
    );
  }

  return (
    <Modal title={`Pembayaran ${pay.label}`} onClose={close} footer={<button type="button" className="btn btn-block" onClick={cancel}>Batalkan</button>}>
      <QrView pay={pay} />
      <div className="center" style={{ marginTop: 12 }}>
        <div className="plan-price">{fmtRp(pay.amount)}</div>
        <div className="muted" style={{ fontSize: 13 }}>Ref: <span className="mono-sm">{pay.ref || "-"}</span></div>
        <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>Sisa waktu <Countdown deadline={deadline} /></div>
      </div>
      <p className="muted center" style={{ fontSize: 13, margin: "14px 0 0" }}>Scan QRIS dengan aplikasi e-wallet / mobile banking kamu.</p>
    </Modal>
  );
}
