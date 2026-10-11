"use client";
import { useState } from "react";
import PaymentModal from "./PaymentModal";
import { useToast } from "./Toast";
import { fmtRp } from "@/lib/format";

const PRESETS = [5000, 10000, 20000, 50000];

export default function DonateForm() {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [checkout, setCheckout] = useState(null);

  function submit() {
    const n = Math.round(Number(amount || 0));
    if (!Number.isFinite(n) || n < 1000) { toast("Nominal minimal Rp 1.000", "err"); return; }
    setCheckout({ kind: "donate", amount: n });
  }

  return (
    <div className="card card-pad">
      <label htmlFor="donate-amount" className="muted" style={{ fontSize: 13 }}>Nominal (Rp)</label>
      <input id="donate-amount" className="input" type="number" inputMode="numeric" min={1000} placeholder="10000" value={amount}
        onChange={(e) => setAmount(e.target.value)} style={{ margin: "6px 0 12px" }} />
      <div className="grid grid-2" style={{ gap: 8, marginBottom: 16 }}>
        {PRESETS.map((n) => (
          <button key={n} type="button" className="btn btn-sm" onClick={() => setAmount(String(n))}>{fmtRp(n)}</button>
        ))}
      </div>
      <button type="button" className="btn btn-primary btn-block" onClick={submit}>Lanjut bayar</button>
      <p className="muted" style={{ fontSize: 12.5, margin: "12px 0 0" }}>Pembayaran diproses via QRIS GoPay. Minimum Rp 1.000.</p>
      {checkout && <PaymentModal cfg={checkout} onClose={() => setCheckout(null)} />}
    </div>
  );
}
