import { search, getDetail } from "../../services/hentaitv.js";

export default {
  name: "HentaiTV Search",
  category: "anime",
  description: "Pencarian anime dari HentaiTV",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: true,
      description: "Kata kunci anime",
      example: "magic"
    },
    slug: {
      type: "string",
      required: false,
      description: "Slug video",
      example: ""
    }
  },
  execute: async (req) => {
    const slug = req.query?.slug || req.body?.slug || req.query?.url || req.body?.url;
    if (slug) {
      return await getDetail(slug);
    }
    const query = req.query?.query || req.body?.query;
    if (!query) throw new Error("Parameter 'query' atau 'slug' wajib disertakan");
    return await search(query);
  }
};
