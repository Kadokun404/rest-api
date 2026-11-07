import { ttdl } from "../../services/tiktok.js";

export default {
  name: "TikTok Downloader",
  category: "downloader",
  description: "Download TikTok video, slide foto, atau audio tanpa watermark",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    url: {
      type: "string",
      required: true,
      description: "URL video/foto TikTok (vt.tiktok.com atau tiktok.com/@user/video/...)",
      example: "https://vt.tiktok.com/ZS67L8K9/"
    }
  },
  execute: async (req) => {
    const url = req.query?.url || req.body?.url;
    if (!url) throw new Error("Parameter 'url' wajib disertakan");
    return await ttdl(url);
  }
};
