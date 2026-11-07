import { download } from "../../services/aio.js";

export default {
  name: "All-in-One Downloader",
  category: "downloader",
  description: "Download media dari berbagai platform sosial (Instagram, Facebook, Twitter/X, Pinterest, TikTok, dll)",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    url: {
      type: "string",
      required: true,
      description: "URL video atau media dari platform yang didukung",
      example: "https://www.instagram.com/p/..."
    }
  },
  execute: async (req) => {
    const url = req.query?.url || req.body?.url;
    if (!url) throw new Error("Parameter 'url' wajib disertakan");
    return await download(url);
  }
};
