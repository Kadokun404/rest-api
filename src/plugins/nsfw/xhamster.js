import { search, getLatest, getDetail } from "../../services/xhamster.js";

export default {
  name: "XHamster Search & Video",
  category: "nsfw",
  description: "Search dan video stream dari XHamster",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: false,
      description: "Kata kunci video (kosongkan untuk terbaru)",
      example: "asian"
    },
    id: {
      type: "string",
      required: false,
      description: "ID atau URL video XHamster",
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
    return await getLatest();
  }
};
