import { fetchTelegramStickers } from "../../services/telegram-sticker.js";

export default {
  name: "Telegram Sticker Fetcher",
  category: "search",
  description: "Ambil stiker pack Telegram langsung dari link atau nama pack",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: true,
      description: "Nama pack atau link stiker Telegram (t.me/addstickers/...)",
      example: "https://t.me/addstickers/CatMemes"
    }
  },
  execute: async (req) => {
    const query = req.query?.query || req.body?.query || req.query?.url || req.body?.url;
    if (!query) throw new Error("Parameter 'query' (nama atau URL sticker pack) wajib disertakan");
    return await fetchTelegramStickers(query);
  }
};
