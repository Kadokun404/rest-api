import { generateAnimeVoice } from "../../services/tsundere-tts.js";

export default {
  name: "Tsundere Anime Voice TTS",
  category: "tools",
  description: "Ubah teks menjadi suara anime tsundere gemas",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    text: {
      type: "string",
      required: true,
      description: "Teks yang ingin diucapkan",
      example: "B-baka! Jangan lihat-lihat terus!"
    }
  },
  execute: async (req) => {
    const text = req.query?.text || req.body?.text;
    if (!text) throw new Error("Parameter 'text' wajib disertakan");
    return await generateAnimeVoice(text);
  }
};
