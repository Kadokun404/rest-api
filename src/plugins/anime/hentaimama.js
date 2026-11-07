import { searchHentaimama, getSeriesDetail } from "../../services/hentaimama.js";

export default {
  name: "HentaiMama Search & Series",
  category: "anime",
  description: "Database anime & series HentaiMama",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: true,
      description: "Kata kunci judul series",
      example: "school"
    },
    slug: {
      type: "string",
      required: false,
      description: "Slug series untuk detail episode",
      example: ""
    }
  },
  execute: async (req) => {
    const slug = req.query?.slug || req.body?.slug || req.query?.url || req.body?.url;
    if (slug) {
      return await getSeriesDetail(slug);
    }
    const query = req.query?.query || req.body?.query;
    if (!query) throw new Error("Parameter 'query' atau 'slug' wajib disertakan");
    return await searchHentaimama(query);
  }
};
