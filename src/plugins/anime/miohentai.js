import { searchMiohentai, getLatestMiohentai, getMiohentaiDetail } from "../../services/miohentai.js";

export default {
  name: "MioHentai Search & Detail",
  category: "anime",
  description: "Search dan baca manga hentai dari MioHentai",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: false,
      description: "Kata kunci manga (kosongkan untuk rilisan terbaru)",
      example: "genshin"
    },
    slug: {
      type: "string",
      required: false,
      description: "Slug manga untuk membaca",
      example: ""
    }
  },
  execute: async (req) => {
    const slug = req.query?.slug || req.body?.slug || req.query?.url || req.body?.url;
    if (slug) {
      return await getMiohentaiDetail(slug);
    }
    const query = req.query?.query || req.body?.query;
    if (query) {
      return await searchMiohentai(query);
    }
    return await getLatestMiohentai();
  }
};
