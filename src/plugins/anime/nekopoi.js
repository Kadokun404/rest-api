import { search, getLatest, getDetail } from "../../services/nekopoi.js";

export default {
  name: "NekoPoi Anime & Hentai",
  category: "anime",
  description: "Search, rilisan terbaru, dan detail mirror video dari NekoPoi",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: false,
      description: "Judul anime/hentai untuk dicari",
      example: "isekai"
    },
    slug: {
      type: "string",
      required: false,
      description: "Slug postingan untuk detail mirror download",
      example: ""
    },
    page: {
      type: "number",
      required: false,
      description: "Halaman rilisan terbaru (default 1)",
      example: 1
    }
  },
  execute: async (req) => {
    const slug = req.query?.slug || req.body?.slug || req.query?.url || req.body?.url;
    if (slug) {
      return await getDetail(slug);
    }
    const query = req.query?.query || req.body?.query;
    if (query) {
      return await search(query);
    }
    const page = Number(req.query?.page || req.body?.page || 1);
    return await getLatest(page);
  }
};
