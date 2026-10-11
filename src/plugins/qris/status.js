import { qrisRequest } from "../../function.js";

export default {
  name: "QRIS Status",
  category: "qris",
  premium: true,
  description: "Mengecek status pembayaran transaksi QRIS GoPay",
  method: ["GET"],
  timeout: 30000,
  params: {
    ref: { type: "string", required: true, description: "Referensi transaksi dari endpoint create" },
    amount: { type: "number", example: 5000, required: true, description: "Nominal transaksi" },
    created_at: { type: "string", required: false, description: "Waktu transaksi dibuat (dari endpoint create)" }
  },
  execute: async (req, res, { input, signal }) => {
    const query = { ref: String(input.ref), amount: String(input.amount) };
    if (input.created_at) query.created_at = String(input.created_at);
    return qrisRequest("/api/gopay/status", { method: "GET", query, signal });
  }
};
