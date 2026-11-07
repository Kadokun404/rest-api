import { searchManga, getMangaDetail } from "../../services/imhentai.js";

export default {
  name: "ImHentai Manga Reader",
  category: "anime",
  description: "Pencarian manga doujin dan pembaca online dari ImHentai",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: false,
      description: "Kata kunci judul manga",
      example: "naruto"
    },
    id: {
      type: "string",
      required: false,
      description: "ID atau URL manga untuk detail chapter/gambar",
      example: ""
    }
  },
  execute: async (req) => {
    const id = req.query?.id || req.body?.id || req.query?.url || req.body?.url;
    if (id) {
      return await getMangaDetail(id);
    }
    const query = req.query?.query || req.body?.query;
    if (!query) throw new Error("Parameter 'query' atau 'id' wajib disertakan");
    const page = Number(req.query?.page || req.body?.page || 1);
    return await searchManga(query, page);
  }
};
