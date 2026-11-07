import { searchRule34 } from "../../services/rule34.js";

export default {
  name: "Rule34 Image Search",
  category: "anime",
  description: "Cari ilustrasi dan gambar anime dari database Rule34",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    tags: {
      type: "string",
      required: true,
      description: "Tags pencarian (pisahkan dengan spasi)",
      example: "hatsune_miku 1girl"
    },
    limit: {
      type: "number",
      required: false,
      description: "Jumlah gambar (default 10)",
      example: 10
    }
  },
  execute: async (req) => {
    const tags = req.query?.tags || req.body?.tags || req.query?.query || req.body?.query;
    if (!tags) throw new Error("Parameter 'tags' atau 'query' wajib disertakan");
    const limit = Number(req.query?.limit || req.body?.limit || 10);
    return await searchRule34(tags, { limit });
  }
};
