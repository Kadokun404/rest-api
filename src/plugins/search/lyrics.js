import { searchLyrics } from "../../services/lyrics.js";

export default {
  name: "Song Lyrics Search",
  category: "search",
  description: "Cari lirik lagu lengkap dari Spotify & database musik global",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: true,
      description: "Judul lagu atau nama artis",
      example: "Rewrite the Stars"
    }
  },
  execute: async (req) => {
    const query = req.query?.query || req.body?.query;
    if (!query) throw new Error("Parameter 'query' wajib disertakan");
    return await searchLyrics(query);
  }
};
