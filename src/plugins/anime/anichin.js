import { AnichinScraper } from "../../services/anichin.js";

const scraper = new AnichinScraper();

export default {
  name: "Anichin Donghua Anime",
  category: "anime",
  description: "Pencarian dan streaming rilisan anime/donghua terbaru dari Anichin",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: false,
      description: "Kata kunci donghua (kosongkan untuk episode terbaru)",
      example: "Soul Land"
    },
    url: {
      type: "string",
      required: false,
      description: "URL episode/series untuk melihat stream & mirror",
      example: ""
    }
  },
  execute: async (req) => {
    const url = req.query?.url || req.body?.url;
    if (url) {
      return await scraper.getEpisode(url);
    }
    const query = req.query?.query || req.body?.query;
    if (query) {
      return await scraper.search(query);
    }
    return await scraper.getLatest();
  }
};
