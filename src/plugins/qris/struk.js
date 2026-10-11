import { qrisRequest } from "../../function.js";

// items boleh dikirim sebagai array (body JSON) atau string JSON (dari form tester)
const parseItems = (items) => {
  if (typeof items !== "string") return items;
  try {
    return JSON.parse(items);
  } catch {
    throw new Error("Parameter 'items' harus berupa JSON array yang valid");
  }
};

export default {
  name: "QRIS Struk",
  category: "qris",
  premium: true,
  description: "Membuat gambar struk pembayaran (PNG, base64)",
  method: ["POST"],
  timeout: 30000,
  params: {
    toko: { type: "string", example: "Kadokun Store", required: true, description: "Nama toko" },
    items: { type: "json", example: '[{"nama":"Kopi","qty":2,"harga":10000}]', required: true, description: "Daftar item (array JSON)" },
    bayar: { type: "number", example: 20000, required: true, description: "Total yang dibayar" },
    metodeBayar: { type: "string", example: "QRIS", required: false, description: "Metode pembayaran, contoh: QRIS" },
    nomorStruk: { type: "string", example: "INV-0001", required: false, description: "Nomor struk" }
  },
  execute: async (req, res, { input, signal }) => {
    const body = {
      toko: input.toko,
      items: parseItems(input.items),
      bayar: Number(input.bayar)
    };
    if (input.metodeBayar) body.metodeBayar = input.metodeBayar;
    if (input.nomorStruk) body.nomorStruk = input.nomorStruk;

    return qrisRequest("/api/maker/struk", { method: "POST", body, signal });
  }
};
