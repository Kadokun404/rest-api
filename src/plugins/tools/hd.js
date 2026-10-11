import multer from "multer";
import { safeFetch } from "../../function.js";
import { buildProxiedUrl } from "../../mediaProxy.js";

const MAX_PIXELS = 33177600;
const MAX_FILE = 35 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE, files: 1 }
}).single("file");

const runMulter = (req, res) =>
  new Promise((resolve, reject) => {
    upload(req, res, (err) => (err ? reject(err) : resolve()));
  });

const uploadToCdn = async (buffer, filename, mime = "image/jpeg") => {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mime }), filename || "image.jpg");

  const res = await safeFetch("https://cloud.yardansh.com/upload", { method: "POST", body: form }, 30000);
  const data = await res.json();

  if (!res.ok || !data || !data.url) {
    throw new Error("upload gagal: " + JSON.stringify(data || { status: res.status }));
  }

  return data.url;
};

const resizeIfHuge = async (buffer) => {
  try {
    const { default: sharp } = await import("sharp");
    try {
      const meta = await sharp(buffer).metadata();
      if (meta.width * meta.height > MAX_PIXELS) {
        const k = Math.sqrt(MAX_PIXELS / (meta.width * meta.height));
        return await sharp(buffer).resize(Math.floor(meta.width * k)).toBuffer();
      }
    } catch {}
  } catch {}
  return buffer;
};

export default {
  name: "HD Upscale",
  category: "tools",
  description: "Menaikkan resolusi gambar dengan AI (iloveimg). Kirim file via POST (otomatis di-upload ke cloud.yardansh.com) atau sertakan parameter 'url'. Mendukung upscale 2x dan 4x",
  method: ["POST"],
  timeout: 60000,
  params: {
    url: {
      type: "string",
      example: "https://cos.kiracloud.me/image.92f45553.jpg",
      required: false,
      description: "URL gambar (opsional). Untuk POST multipart, gunakan field 'file' untuk upload langsung"
    },
    file: {
      type: "file",
      required: false,
      description: "Upload file gambar (multipart/form-data). Dikirim ke cloud.yardansh.com dulu lalu di-HD-kan"
    },
    scale: {
      type: "number",
      example: 4,
      required: false,
      description: "Faktor pembesaran: 2 atau 4 (default 2)"
    }
  },
  execute: async (req, res, { input, signal }) => {
    await runMulter(req, res);

    const body = req.body || {};
    const scale = Number(input.scale !== undefined ? input.scale : body.scale || 2);
    if (scale !== 2 && scale !== 4) {
      throw new Error("Parameter 'scale' hanya mendukung nilai 2 atau 4");
    }

    const scaleSrc = String(input.url || body.url || "").trim();
    let src = scaleSrc;
    let fileUploaded = false;

    if (req.file) {
      if (!req.file.mimetype || !req.file.mimetype.startsWith("image/")) {
        throw new Error("File yang dikirim harus berupa gambar (image/*)");
      }
      src = await uploadToCdn(req.file.buffer, req.file.originalname);
      fileUploaded = true;
    }

    if (!src) {
      throw new Error("Kirim parameter 'url' atau upload file gambar (field 'file')");
    }
    if (!/^https?:\/\//i.test(src)) {
      throw new Error("URL gambar harus berawalan http(s)://");
    }

    const r = await fetch(src);
    if (!r.ok) {
      throw new Error(`fetch ${r.status}`);
    }

    let buffer = Buffer.from(await r.arrayBuffer());
    buffer = await resizeIfHuge(buffer);

    const page = await fetch("https://www.iloveimg.com/upscale-image").then((res) => res.text());

    const cfg = JSON.parse(page.match(/var ilovepdfConfig\s*=\s*(\{[\s\S]*?\});/)[1]);
    const task = page.match(/ilovepdfConfig\.taskId = '([^']+)'/)[1];
    const worker = "https://" + cfg.servers[0] + ".iloveimg.com";
    const auth = { Authorization: "Bearer " + cfg.token };

    const f1 = new FormData();
    f1.append("task", task);
    f1.append("preview", "1");
    f1.append("file", new Blob([buffer], { type: "image/jpeg" }), "in.jpg");

    const up = await fetch(worker + "/v1/upload", { method: "POST", headers: auth, body: f1 }).then((res) => res.json());
    if (!up.server_filename) {
      throw new Error("upload gagal: " + JSON.stringify(up));
    }

    const f2 = new FormData();
    f2.append("task", task);
    f2.append("server_filename", up.server_filename);
    f2.append("scale", String(scale));

    const upRes = await fetch(worker + "/v1/upscale", { method: "POST", headers: auth, body: f2 });
    if (!upRes.ok) {
      throw new Error(`upscale ${upRes.status}: ${(await upRes.text()).slice(0, 200)}`);
    }

    const out = Buffer.from(await upRes.arrayBuffer());
    const contentType = upRes.headers.get("content-type") || "image/jpeg";

    const hdUrl = await uploadToCdn(out, `hd-${scale}x.jpg`, contentType);
    const proxiedUrl = await buildProxiedUrl(req, hdUrl, "jpg");

    return {
      scale,
      source_url: src,
      url: proxiedUrl,
      mimetype: contentType,
      uploaded_source: fileUploaded,
      bytes_in: buffer.length,
      bytes_out: out.length
    };
  }
};