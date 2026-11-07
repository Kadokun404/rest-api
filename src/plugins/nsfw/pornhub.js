import { search, getTrending, getDetail } from "../../services/pornhub.js";

export default {
  name: "PornHub Search & Video",
  category: "nsfw",
  description: "Cari video trending dan detail dari PornHub",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: false,
      description: "Kata kunci video (kosongkan untuk trending)",
      example: "japanese"
    },
    id: {
      type: "string",
      required: false,
      description: "Viewkey atau URL video PornHub",
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
    return await getTrending();
  }
};
