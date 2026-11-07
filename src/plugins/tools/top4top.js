import uploadTop4top from "../../services/top4top.js";

export default {
  name: "Top4Top File Uploader",
  category: "tools",
  description: "Upload file / image buffer dari URL ke hosting Top4Top",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    url: {
      type: "string",
      required: true,
      description: "URL file / gambar yang ingin di-rehost ke Top4Top",
      example: "https://example.com/image.png"
    }
  },
  execute: async (req) => {
    const url = req.query?.url || req.body?.url;
    if (!url) throw new Error("Parameter 'url' wajib disertakan");
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Gagal mengambil file dari URL sumber");
    const buffer = Buffer.from(await resp.arrayBuffer());
    return await uploadTop4top(buffer);
  }
};
