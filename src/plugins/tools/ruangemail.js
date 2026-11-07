import { getMessages, checkAuth } from "../../services/ruangemail.js";

export default {
  name: "RuangEmail Webmail & Inbox",
  category: "tools",
  description: "Cek inbox dan validasi email domain kustom RuangEmail",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    email: {
      type: "string",
      required: true,
      description: "Alamat email RuangEmail",
      example: "user@domain.com"
    },
    password: {
      type: "string",
      required: true,
      description: "Password email",
      example: "password123"
    }
  },
  execute: async (req) => {
    const email = req.query?.email || req.body?.email;
    const password = req.query?.password || req.body?.password;
    if (!email || !password) throw new Error("Parameter 'email' dan 'password' wajib disertakan");
    return await getMessages({ email, password, limit: 15 });
  }
};
