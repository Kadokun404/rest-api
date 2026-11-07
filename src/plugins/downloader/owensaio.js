import { downloadAio } from "../../services/owensaio.js";

export default {
  name: "Owens AIO Downloader",
  category: "downloader",
  description: "Alternative engine All-in-One video downloader",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    url: {
      type: "string",
      required: true,
      description: "URL media sosial yang ingin diunduh",
      example: "https://twitter.com/..."
    }
  },
  execute: async (req) => {
    const url = req.query?.url || req.body?.url;
    if (!url) throw new Error("Parameter 'url' wajib disertakan");
    return await downloadAio(url);
  }
};
