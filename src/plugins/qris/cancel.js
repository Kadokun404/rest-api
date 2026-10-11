import { qrisRequest } from "../../function.js";

export default {
  name: "QRIS Cancel",
  category: "qris",
  premium: true,
  description: "Membatalkan transaksi QRIS GoPay yang masih pending",
  method: ["POST"],
  timeout: 30000,
  params: {
    ref: { type: "string", required: true, description: "Referensi transaksi dari endpoint create" },
    amount: { type: "number", example: 5000, required: true, description: "Nominal transaksi" }
  },
  execute: async (req, res, { input, signal }) => {
    return qrisRequest("/api/gopay/cancel", {
      method: "POST",
      body: { ref: String(input.ref), amount: Number(input.amount) },
      signal
    });
  }
};
