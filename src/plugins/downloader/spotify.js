import { scrape, spotifySearch, spotifyDownload } from "../../services/spotify.js";

export default {
  name: "Spotify Downloader & Search",
  category: "downloader",
  description: "Cari dan download audio lagu dari Spotify",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: false,
      description: "Judul lagu untuk pencarian atau URL track Spotify",
      example: "Blue - Yung Kai"
    },
    url: {
      type: "string",
      required: false,
      description: "URL track Spotify langsung",
      example: "https://open.spotify.com/track/..."
    }
  },
  execute: async (req) => {
    const target = req.query?.url || req.body?.url || req.query?.query || req.body?.query;
    if (!target) throw new Error("Parameter 'query' atau 'url' wajib disertakan");
    if (String(target).includes("open.spotify.com")) {
      return await spotifyDownload(target);
    }
    return await scrape(target);
  }
};
