import { searchPixhentai, getPixhentaiDetail } from "../../services/pixhentai.js";

export default {
  name: "PixHentai Manga Search",
  category: "anime",
  description: "Search galeri dan ilustrasi PixHentai",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: true,
      description: "Kata kunci galeri",
      example: "cosplay"
    },
    slug: {
      type: "string",
      required: false,
      description: "Slug galeri untuk melihat foto",
      example: ""
    }
  },
  execute: async (req) => {
    const slug = req.query?.slug || req.body?.slug || req.query?.url || req.body?.url;
    if (slug) {
      return await getPixhentaiDetail(slug);
    }
    const query = req.query?.query || req.body?.query;
    if (!query) throw new Error("Parameter 'query' atau 'slug' wajib disertakan");
    return await searchPixhentai(query);
  }
};
