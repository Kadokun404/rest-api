import { getSnippet, createSnippet } from "../../services/codeku.js";

export default {
  name: "Codeku Pastebin & Snippet",
  category: "tools",
  description: "Buat atau baca snippet kode / pastebin via Codeku",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    id: {
      type: "string",
      required: false,
      description: "ID snippet untuk membaca kode",
      example: ""
    },
    code: {
      type: "string",
      required: false,
      description: "Kode sumber untuk disimpan",
      example: "console.log('hello world');"
    },
    title: {
      type: "string",
      required: false,
      description: "Judul snippet",
      example: "hello.js"
    }
  },
  execute: async (req) => {
    const id = req.query?.id || req.body?.id;
    if (id) {
      return await getSnippet(id);
    }
    const code = req.query?.code || req.body?.code;
    if (!code) throw new Error("Parameter 'id' atau 'code' wajib disertakan");
    const title = req.query?.title || req.body?.title || "Snippet";
    return await createSnippet({ code, title });
  }
};
