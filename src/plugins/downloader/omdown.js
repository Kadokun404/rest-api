import { resolve } from "../../services/omdown.js";

export default {
  name: "OmDown Media Downloader",
  category: "downloader",
  description: "Download media lintas platform dengan resolusi tinggi",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    url: {
      type: "string",
      required: true,
      description: "URL media yang ingin diproses",
      example: "https://youtube.com/watch?v=..."
    }
  },
  execute: async (req) => {
    const url = req.query?.url || req.body?.url;
    if (!url) throw new Error("Parameter 'url' wajib disertakan");
    return await resolve(url);
  }
};
