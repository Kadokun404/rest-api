import { askGemini } from "../../services/gemini.js";

export default {
  name: "Google Gemini AI Chat",
  category: "ai",
  description: "Tanya jawab cerdas dengan model Google Gemini AI",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    text: {
      type: "string",
      required: true,
      description: "Pertanyaan atau pesan untuk Gemini",
      example: "Jelaskan konsep REST API dalam 2 paragraf singkat"
    },
    session: {
      type: "string",
      required: false,
      description: "Token session percakapan sebelumnya untuk chat bersambung",
      example: ""
    }
  },
  execute: async (req) => {
    const text = req.query?.text || req.body?.text || req.query?.prompt || req.body?.prompt;
    if (!text) throw new Error("Parameter 'text' atau 'prompt' wajib disertakan");
    const session = req.query?.session || req.body?.session || "";
    return await askGemini(text, session);
  }
};
