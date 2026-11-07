import { generateGoogleVoice } from "../../services/tsundere-tts.js";

export default {
  name: "Google Voice Note TTS",
  category: "tools",
  description: "Ubah teks menjadi suara Google Voice Note (Mbak Google) tanpa batas karakter",
  method: ["GET", "POST"],
  tokenCost: 5,
  params: {
    text: {
      type: "string",
      required: true,
      description: "Teks yang ingin diucapkan",
      example: "Halo sayang, ini suara Google TTS asli"
    },
    lang: {
      type: "string",
      required: false,
      description: "Kode bahasa (contoh: id, en, ja, jv)",
      example: "id"
    }
  },
  execute: async (req) => {
    const text = req.query?.text || req.body?.text;
    const lang = req.query?.lang || req.body?.lang || "id";
    if (!text) throw new Error("Parameter 'text' wajib disertakan");
    return await generateGoogleVoice(text, lang);
  }
};