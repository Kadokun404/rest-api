import { generateEmail, getInbox, getMessage } from "../../services/emailnator.js";

export default {
  name: "Emailnator Disposable Mail",
  category: "tools",
  description: "Generate alamat email sementara (Gmail/Custom) dan baca pesan masuk",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    action: {
      type: "string",
      required: false,
      description: "'generate' untuk buat email baru, atau 'inbox' untuk baca kotak masuk",
      example: "generate"
    },
    email: {
      type: "string",
      required: false,
      description: "Alamat email sementara (wajib jika action=inbox)",
      example: ""
    }
  },
  execute: async (req) => {
    const action = String(req.query?.action || req.body?.action || "generate").toLowerCase();
    if (action === "inbox") {
      const email = req.query?.email || req.body?.email;
      if (!email) throw new Error("Parameter 'email' wajib disertakan untuk cek inbox");
      return await getInbox(email);
    }
    return await generateEmail();
  }
};
