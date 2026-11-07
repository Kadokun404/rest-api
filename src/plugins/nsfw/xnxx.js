import { search, getBest, getHits, getDetail } from "../../services/xnxx.js";

export default {
  name: "XNXX Video Search",
  category: "nsfw",
  description: "Search video dan best hits dari XNXX",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: false,
      description: "Kata kunci video",
      example: "teen"
    },
    id: {
      type: "string",
      required: false,
      description: "URL atau ID video XNXX",
      example: ""
    }
  },
  execute: async (req) => {
    const id = req.query?.id || req.body?.id || req.query?.url || req.body?.url;
    if (id) {
      return await getDetail(id);
    }
    const query = req.query?.query || req.body?.query;
    if (query) {
      return await search(query);
    }
    return await getHits();
  }
};
