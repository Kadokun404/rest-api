import { vdrop } from "../../services/vdrop.js";

export default {
  name: "Vdrop Video Downloader",
  category: "downloader",
  description: "Download video serbaguna via server Vdrop",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    url: {
      type: "string",
      required: true,
      description: "URL video yang ingin di-download",
      example: "https://www.tiktok.com/..."
    }
  },
  execute: async (req) => {
    const url = req.query?.url || req.body?.url;
    if (!url) throw new Error("Parameter 'url' wajib disertakan");
    return await vdrop(url);
  }
};
