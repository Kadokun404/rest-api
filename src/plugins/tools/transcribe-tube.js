import { transcript } from "../../services/transcribe-tube.js";

export default {
  name: "YouTube Transcript & Subtitles",
  category: "tools",
  description: "Ambil teks transkrip dan subtitle lengkap dari video YouTube",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    url: {
      type: "string",
      required: true,
      description: "URL video YouTube",
      example: "https://youtu.be/..."
    }
  },
  execute: async (req) => {
    const url = req.query?.url || req.body?.url;
    if (!url) throw new Error("Parameter 'url' wajib disertakan");
    return await transcript(url);
  }
};
