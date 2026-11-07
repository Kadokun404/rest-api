import { callFeelbetter } from "../../services/feelbetter.js";

export default {
  name: "FeelBetter Mental Health & Advice",
  category: "ai",
  description: "Dukungan emosional, motivasi, dan saran bijak untuk kesehatan mental",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    text: {
      type: "string",
      required: true,
      description: "Ceritakan apa yang sedang kamu rasakan",
      example: "Aku merasa lelah dan butuh semangat hari ini"
    }
  },
  execute: async (req) => {
    const text = req.query?.text || req.body?.text || req.query?.topic || req.body?.topic;
    if (!text) throw new Error("Parameter 'text' wajib disertakan");
    return await callFeelbetter([{ role: "user", content: text }]);
  }
};
