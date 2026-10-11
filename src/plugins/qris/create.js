import { qrisRequest } from "../../function.js";

export default {
  name: "QRIS Create",
  category: "qris",
  premium: true,
  description: "Membuat kode QRIS GoPay dinamis untuk nominal tertentu",
  method: ["POST"],
  timeout: 30000,
  params: {
    amount: { type: "number", example: 5000, required: true, description: "Nominal dalam rupiah, contoh: 10000" }
  },
  execute: async (req, res, { input, signal }) => {
    const amount = Number(input.amount);
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error("Parameter 'amount' harus berupa bilangan bulat lebih dari 0");
    }
    return qrisRequest("/api/gopay/create", { method: "POST", body: { amount }, signal });
  }
};
