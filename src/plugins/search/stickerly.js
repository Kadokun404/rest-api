import { searchStickerly, getStickerPackDetails } from "../../services/stickerly.js";

export default {
  name: "Sticker.ly Search & Pack",
  category: "search",
  description: "Cari paket stiker WhatsApp dari Sticker.ly dan dapatkan link pack lengkap",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: false,
      description: "Kata kunci stiker yang ingin dicari",
      example: "lucu gemes"
    },
    pack_id: {
      type: "string",
      required: false,
      description: "Pack ID untuk melihat detail stiker",
      example: "abc123xyz"
    }
  },
  execute: async (req) => {
    const packId = req.query?.pack_id || req.body?.pack_id;
    if (packId) {
      return await getStickerPackDetails(packId);
    }
    const query = req.query?.query || req.body?.query;
    if (!query) throw new Error("Parameter 'query' atau 'pack_id' wajib disertakan");
    return await searchStickerly(query);
  }
};
