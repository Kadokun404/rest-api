import { enhance, enlarge } from "../../services/image-enlarger.js";

export default {
  name: "AI Image Upscaler & Enlarger",
  category: "tools",
  description: "Perjelas dan perbesar resolusi foto buram menjadi HD menggunakan AI",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    url: {
      type: "string",
      required: true,
      description: "URL gambar yang ingin diperjelas (HD)",
      example: "https://example.com/photo.jpg"
    }
  },
  execute: async (req) => {
    const url = req.query?.url || req.body?.url;
    if (!url) throw new Error("Parameter 'url' gambar wajib disertakan");
    return await enhance(url);
  }
};
