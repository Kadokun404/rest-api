import { searchImages } from "../../services/google-image.js";

export default {
  name: "Google Image Search",
  category: "search",
  description: "Pencarian gambar Google Images dengan resolusi tinggi",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: true,
      description: "Kata kunci gambar yang ingin dicari",
      example: "cyberpunk anime girl"
    },
    limit: {
      type: "number",
      required: false,
      description: "Jumlah hasil (default 15)",
      example: 10
    }
  },
  execute: async (req) => {
    const query = req.query?.query || req.body?.query;
    if (!query) throw new Error("Parameter 'query' wajib disertakan");
    const limit = Number(req.query?.limit || req.body?.limit || 15);
    return await searchImages(query, limit);
  }
};
