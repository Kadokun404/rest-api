import { search, getBest, getHome, getDetail } from "../../services/xvideos.js";

export default {
  name: "XVideos Search & Video",
  category: "nsfw",
  description: "Search video dan best video dari XVideos",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: false,
      description: "Kata kunci video",
      example: "korean"
    },
    id: {
      type: "string",
      required: false,
      description: "URL atau ID video XVideos",
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
    return await getBest();
  }
};
