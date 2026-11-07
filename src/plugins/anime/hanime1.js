import { searchHanime, getLatestHanime, getHanimeDetail } from "../../services/hanime1.js";

export default {
  name: "Hanime1 Anime Stream",
  category: "anime",
  description: "Search dan stream anime dari Hanime1",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: false,
      description: "Kata kunci judul anime",
      example: "overflow"
    },
    id: {
      type: "string",
      required: false,
      description: "ID atau URL video untuk detail stream",
      example: ""
    }
  },
  execute: async (req) => {
    const id = req.query?.id || req.body?.id || req.query?.url || req.body?.url;
    if (id) {
      return await getHanimeDetail(id);
    }
    const query = req.query?.query || req.body?.query;
    if (query) {
      return await searchHanime(query);
    }
    return await getLatestHanime();
  }
};
