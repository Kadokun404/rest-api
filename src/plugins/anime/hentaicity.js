import { searchVideos, getVideoDetail } from "../../services/hentaicity.js";

export default {
  name: "HentaiCity Search",
  category: "anime",
  description: "Search video anime dari HentaiCity",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: true,
      description: "Kata kunci video",
      example: "maid"
    },
    slug: {
      type: "string",
      required: false,
      description: "Slug video untuk detail stream",
      example: ""
    }
  },
  execute: async (req) => {
    const slug = req.query?.slug || req.body?.slug || req.query?.url || req.body?.url;
    if (slug) {
      return await getVideoDetail(slug);
    }
    const query = req.query?.query || req.body?.query;
    if (!query) throw new Error("Parameter 'query' atau 'slug' wajib disertakan");
    return await searchVideos(query);
  }
};
