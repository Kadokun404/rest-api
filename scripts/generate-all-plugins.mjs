import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginsDir = path.join(root, "src", "plugins");

const plugins = [
  // DOWNLOADER
  {
    category: "downloader",
    file: "tiktok.js",
    content: `import { ttdl } from "../../services/tiktok.js";

export default {
  name: "TikTok Downloader",
  category: "downloader",
  description: "Download TikTok video, slide foto, atau audio tanpa watermark",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    url: {
      type: "string",
      required: true,
      description: "URL video/foto TikTok (vt.tiktok.com atau tiktok.com/@user/video/...)",
      example: "https://vt.tiktok.com/ZS67L8K9/"
    }
  },
  execute: async (req) => {
    const url = req.query?.url || req.body?.url;
    if (!url) throw new Error("Parameter 'url' wajib disertakan");
    return await ttdl(url);
  }
};
`
  },
  {
    category: "downloader",
    file: "spotify.js",
    content: `import { scrape, spotifySearch, spotifyDownload } from "../../services/spotify.js";

export default {
  name: "Spotify Downloader & Search",
  category: "downloader",
  description: "Cari dan download audio lagu dari Spotify",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: false,
      description: "Judul lagu untuk pencarian atau URL track Spotify",
      example: "Blue - Yung Kai"
    },
    url: {
      type: "string",
      required: false,
      description: "URL track Spotify langsung",
      example: "https://open.spotify.com/track/..."
    }
  },
  execute: async (req) => {
    const target = req.query?.url || req.body?.url || req.query?.query || req.body?.query;
    if (!target) throw new Error("Parameter 'query' atau 'url' wajib disertakan");
    if (String(target).includes("open.spotify.com")) {
      return await spotifyDownload(target);
    }
    return await scrape(target);
  }
};
`
  },
  {
    category: "downloader",
    file: "aio.js",
    content: `import { download } from "../../services/aio.js";

export default {
  name: "All-in-One Downloader",
  category: "downloader",
  description: "Download media dari berbagai platform sosial (Instagram, Facebook, Twitter/X, Pinterest, TikTok, dll)",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    url: {
      type: "string",
      required: true,
      description: "URL video atau media dari platform yang didukung",
      example: "https://www.instagram.com/p/..."
    }
  },
  execute: async (req) => {
    const url = req.query?.url || req.body?.url;
    if (!url) throw new Error("Parameter 'url' wajib disertakan");
    return await download(url);
  }
};
`
  },
  {
    category: "downloader",
    file: "vdrop.js",
    content: `import { vdrop } from "../../services/vdrop.js";

export default {
  name: "Vdrop Video Downloader",
  category: "downloader",
  description: "Download video serbaguna via server Vdrop",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    url: {
      type: "string",
      required: true,
      description: "URL video yang ingin di-download",
      example: "https://www.tiktok.com/..."
    }
  },
  execute: async (req) => {
    const url = req.query?.url || req.body?.url;
    if (!url) throw new Error("Parameter 'url' wajib disertakan");
    return await vdrop(url);
  }
};
`
  },
  {
    category: "downloader",
    file: "omdown.js",
    content: `import { resolve } from "../../services/omdown.js";

export default {
  name: "OmDown Media Downloader",
  category: "downloader",
  description: "Download media lintas platform dengan resolusi tinggi",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    url: {
      type: "string",
      required: true,
      description: "URL media yang ingin diproses",
      example: "https://youtube.com/watch?v=..."
    }
  },
  execute: async (req) => {
    const url = req.query?.url || req.body?.url;
    if (!url) throw new Error("Parameter 'url' wajib disertakan");
    return await resolve(url);
  }
};
`
  },
  {
    category: "downloader",
    file: "owensaio.js",
    content: `import { downloadAio } from "../../services/owensaio.js";

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
`
  },

  // SEARCH
  {
    category: "search",
    file: "google-image.js",
    content: `import { searchImages } from "../../services/google-image.js";

export default {
  name: "Google Image Search",
  category: "search",
  description: "Pencarian gambar Google Images dengan resolusi tinggi",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: true,
      description: "Kata kunci gambar yang ingin dicari",
      example: "cyberpunk anime girl"
    },
    limit: {
      type: "number",
      required: false,
      description: "Jumlah hasil (default 15)",
      example: 10
    }
  },
  execute: async (req) => {
    const query = req.query?.query || req.body?.query;
    if (!query) throw new Error("Parameter 'query' wajib disertakan");
    const limit = Number(req.query?.limit || req.body?.limit || 15);
    return await searchImages(query, limit);
  }
};
`
  },
  {
    category: "search",
    file: "lyrics.js",
    content: `import { searchLyrics } from "../../services/lyrics.js";

export default {
  name: "Song Lyrics Search",
  category: "search",
  description: "Cari lirik lagu lengkap dari Spotify & database musik global",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: true,
      description: "Judul lagu atau nama artis",
      example: "Rewrite the Stars"
    }
  },
  execute: async (req) => {
    const query = req.query?.query || req.body?.query;
    if (!query) throw new Error("Parameter 'query' wajib disertakan");
    return await searchLyrics(query);
  }
};
`
  },
  {
    category: "search",
    file: "stickerly.js",
    content: `import { searchStickerly, getStickerPackDetails } from "../../services/stickerly.js";

export default {
  name: "Sticker.ly Search & Pack",
  category: "search",
  description: "Cari paket stiker WhatsApp dari Sticker.ly dan dapatkan link pack lengkap",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: false,
      description: "Kata kunci stiker yang ingin dicari",
      example: "lucu gemes"
    },
    pack_id: {
      type: "string",
      required: false,
      description: "Pack ID untuk melihat detail stiker",
      example: "abc123xyz"
    }
  },
  execute: async (req) => {
    const packId = req.query?.pack_id || req.body?.pack_id;
    if (packId) {
      return await getStickerPackDetails(packId);
    }
    const query = req.query?.query || req.body?.query;
    if (!query) throw new Error("Parameter 'query' atau 'pack_id' wajib disertakan");
    return await searchStickerly(query);
  }
};
`
  },
  {
    category: "search",
    file: "telegram-sticker.js",
    content: `import { fetchTelegramStickers } from "../../services/telegram-sticker.js";

export default {
  name: "Telegram Sticker Fetcher",
  category: "search",
  description: "Ambil stiker pack Telegram langsung dari link atau nama pack",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: true,
      description: "Nama pack atau link stiker Telegram (t.me/addstickers/...)",
      example: "https://t.me/addstickers/CatMemes"
    }
  },
  execute: async (req) => {
    const query = req.query?.query || req.body?.query || req.query?.url || req.body?.url;
    if (!query) throw new Error("Parameter 'query' (nama atau URL sticker pack) wajib disertakan");
    return await fetchTelegramStickers(query);
  }
};
`
  },

  // ANIME
  {
    category: "anime",
    file: "anichin.js",
    content: `import { AnichinScraper } from "../../services/anichin.js";

const scraper = new AnichinScraper();

export default {
  name: "Anichin Donghua Anime",
  category: "anime",
  description: "Pencarian dan streaming rilisan anime/donghua terbaru dari Anichin",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: false,
      description: "Kata kunci donghua (kosongkan untuk episode terbaru)",
      example: "Soul Land"
    },
    url: {
      type: "string",
      required: false,
      description: "URL episode/series untuk melihat stream & mirror",
      example: ""
    }
  },
  execute: async (req) => {
    const url = req.query?.url || req.body?.url;
    if (url) {
      return await scraper.getEpisode(url);
    }
    const query = req.query?.query || req.body?.query;
    if (query) {
      return await scraper.search(query);
    }
    return await scraper.getLatest();
  }
};
`
  },
  {
    category: "anime",
    file: "nekopoi.js",
    content: `import { search, getLatest, getDetail } from "../../services/nekopoi.js";

export default {
  name: "NekoPoi Anime & Hentai",
  category: "anime",
  description: "Search, rilisan terbaru, dan detail mirror video dari NekoPoi",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: false,
      description: "Judul anime/hentai untuk dicari",
      example: "isekai"
    },
    slug: {
      type: "string",
      required: false,
      description: "Slug postingan untuk detail mirror download",
      example: ""
    },
    page: {
      type: "number",
      required: false,
      description: "Halaman rilisan terbaru (default 1)",
      example: 1
    }
  },
  execute: async (req) => {
    const slug = req.query?.slug || req.body?.slug || req.query?.url || req.body?.url;
    if (slug) {
      return await getDetail(slug);
    }
    const query = req.query?.query || req.body?.query;
    if (query) {
      return await search(query);
    }
    const page = Number(req.query?.page || req.body?.page || 1);
    return await getLatest(page);
  }
};
`
  },
  {
    category: "anime",
    file: "hanime1.js",
    content: `import { searchHanime, getLatestHanime, getHanimeDetail } from "../../services/hanime1.js";

export default {
  name: "Hanime1 Anime Stream",
  category: "anime",
  description: "Search dan stream anime dari Hanime1",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: false,
      description: "Kata kunci judul anime",
      example: "overflow"
    },
    id: {
      type: "string",
      required: false,
      description: "ID atau URL video untuk detail stream",
      example: ""
    }
  },
  execute: async (req) => {
    const id = req.query?.id || req.body?.id || req.query?.url || req.body?.url;
    if (id) {
      return await getHanimeDetail(id);
    }
    const query = req.query?.query || req.body?.query;
    if (query) {
      return await searchHanime(query);
    }
    return await getLatestHanime();
  }
};
`
  },
  {
    category: "anime",
    file: "rule34.js",
    content: `import { searchRule34 } from "../../services/rule34.js";

export default {
  name: "Rule34 Image Search",
  category: "anime",
  description: "Cari ilustrasi dan gambar anime dari database Rule34",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    tags: {
      type: "string",
      required: true,
      description: "Tags pencarian (pisahkan dengan spasi)",
      example: "hatsune_miku 1girl"
    },
    limit: {
      type: "number",
      required: false,
      description: "Jumlah gambar (default 10)",
      example: 10
    }
  },
  execute: async (req) => {
    const tags = req.query?.tags || req.body?.tags || req.query?.query || req.body?.query;
    if (!tags) throw new Error("Parameter 'tags' atau 'query' wajib disertakan");
    const limit = Number(req.query?.limit || req.body?.limit || 10);
    return await searchRule34(tags, { limit });
  }
};
`
  },
  {
    category: "anime",
    file: "imhentai.js",
    content: `import { searchManga, getMangaDetail } from "../../services/imhentai.js";

export default {
  name: "ImHentai Manga Reader",
  category: "anime",
  description: "Pencarian manga doujin dan pembaca online dari ImHentai",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: false,
      description: "Kata kunci judul manga",
      example: "naruto"
    },
    id: {
      type: "string",
      required: false,
      description: "ID atau URL manga untuk detail chapter/gambar",
      example: ""
    }
  },
  execute: async (req) => {
    const id = req.query?.id || req.body?.id || req.query?.url || req.body?.url;
    if (id) {
      return await getMangaDetail(id);
    }
    const query = req.query?.query || req.body?.query;
    if (!query) throw new Error("Parameter 'query' atau 'id' wajib disertakan");
    const page = Number(req.query?.page || req.body?.page || 1);
    return await searchManga(query, page);
  }
};
`
  },
  {
    category: "anime",
    file: "miohentai.js",
    content: `import { searchMiohentai, getLatestMiohentai, getMiohentaiDetail } from "../../services/miohentai.js";

export default {
  name: "MioHentai Search & Detail",
  category: "anime",
  description: "Search dan baca manga hentai dari MioHentai",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: false,
      description: "Kata kunci manga (kosongkan untuk rilisan terbaru)",
      example: "genshin"
    },
    slug: {
      type: "string",
      required: false,
      description: "Slug manga untuk membaca",
      example: ""
    }
  },
  execute: async (req) => {
    const slug = req.query?.slug || req.body?.slug || req.query?.url || req.body?.url;
    if (slug) {
      return await getMiohentaiDetail(slug);
    }
    const query = req.query?.query || req.body?.query;
    if (query) {
      return await searchMiohentai(query);
    }
    return await getLatestMiohentai();
  }
};
`
  },
  {
    category: "anime",
    file: "hentaicity.js",
    content: `import { searchVideos, getVideoDetail } from "../../services/hentaicity.js";

export default {
  name: "HentaiCity Search",
  category: "anime",
  description: "Search video anime dari HentaiCity",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: true,
      description: "Kata kunci video",
      example: "maid"
    },
    slug: {
      type: "string",
      required: false,
      description: "Slug video untuk detail stream",
      example: ""
    }
  },
  execute: async (req) => {
    const slug = req.query?.slug || req.body?.slug || req.query?.url || req.body?.url;
    if (slug) {
      return await getVideoDetail(slug);
    }
    const query = req.query?.query || req.body?.query;
    if (!query) throw new Error("Parameter 'query' atau 'slug' wajib disertakan");
    return await searchVideos(query);
  }
};
`
  },
  {
    category: "anime",
    file: "hentaimama.js",
    content: `import { searchHentaimama, getSeriesDetail } from "../../services/hentaimama.js";

export default {
  name: "HentaiMama Search & Series",
  category: "anime",
  description: "Database anime & series HentaiMama",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: true,
      description: "Kata kunci judul series",
      example: "school"
    },
    slug: {
      type: "string",
      required: false,
      description: "Slug series untuk detail episode",
      example: ""
    }
  },
  execute: async (req) => {
    const slug = req.query?.slug || req.body?.slug || req.query?.url || req.body?.url;
    if (slug) {
      return await getSeriesDetail(slug);
    }
    const query = req.query?.query || req.body?.query;
    if (!query) throw new Error("Parameter 'query' atau 'slug' wajib disertakan");
    return await searchHentaimama(query);
  }
};
`
  },
  {
    category: "anime",
    file: "hentaitv.js",
    content: `import { search, getDetail } from "../../services/hentaitv.js";

export default {
  name: "HentaiTV Search",
  category: "anime",
  description: "Pencarian anime dari HentaiTV",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: true,
      description: "Kata kunci anime",
      example: "magic"
    },
    slug: {
      type: "string",
      required: false,
      description: "Slug video",
      example: ""
    }
  },
  execute: async (req) => {
    const slug = req.query?.slug || req.body?.slug || req.query?.url || req.body?.url;
    if (slug) {
      return await getDetail(slug);
    }
    const query = req.query?.query || req.body?.query;
    if (!query) throw new Error("Parameter 'query' atau 'slug' wajib disertakan");
    return await search(query);
  }
};
`
  },
  {
    category: "anime",
    file: "pixhentai.js",
    content: `import { searchPixhentai, getPixhentaiDetail } from "../../services/pixhentai.js";

export default {
  name: "PixHentai Manga Search",
  category: "anime",
  description: "Search galeri dan ilustrasi PixHentai",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: true,
      description: "Kata kunci galeri",
      example: "cosplay"
    },
    slug: {
      type: "string",
      required: false,
      description: "Slug galeri untuk melihat foto",
      example: ""
    }
  },
  execute: async (req) => {
    const slug = req.query?.slug || req.body?.slug || req.query?.url || req.body?.url;
    if (slug) {
      return await getPixhentaiDetail(slug);
    }
    const query = req.query?.query || req.body?.query;
    if (!query) throw new Error("Parameter 'query' atau 'slug' wajib disertakan");
    return await searchPixhentai(query);
  }
};
`
  },

  // NSFW
  {
    category: "nsfw",
    file: "pornhub.js",
    content: `import { search, getTrending, getDetail } from "../../services/pornhub.js";

export default {
  name: "PornHub Search & Video",
  category: "nsfw",
  description: "Cari video trending dan detail dari PornHub",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: false,
      description: "Kata kunci video (kosongkan untuk trending)",
      example: "japanese"
    },
    id: {
      type: "string",
      required: false,
      description: "Viewkey atau URL video PornHub",
      example: ""
    }
  },
  execute: async (req) => {
    const id = req.query?.id || req.body?.id || req.query?.url || req.body?.url;
    if (id) {
      return await getDetail(id);
    }
    const query = req.query?.query || req.body?.query;
    if (query) {
      return await search(query);
    }
    return await getTrending();
  }
};
`
  },
  {
    category: "nsfw",
    file: "xhamster.js",
    content: `import { search, getLatest, getDetail } from "../../services/xhamster.js";

export default {
  name: "XHamster Search & Video",
  category: "nsfw",
  description: "Search dan video stream dari XHamster",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: false,
      description: "Kata kunci video (kosongkan untuk terbaru)",
      example: "asian"
    },
    id: {
      type: "string",
      required: false,
      description: "ID atau URL video XHamster",
      example: ""
    }
  },
  execute: async (req) => {
    const id = req.query?.id || req.body?.id || req.query?.url || req.body?.url;
    if (id) {
      return await getDetail(id);
    }
    const query = req.query?.query || req.body?.query;
    if (query) {
      return await search(query);
    }
    return await getLatest();
  }
};
`
  },
  {
    category: "nsfw",
    file: "xnxx.js",
    content: `import { search, getBest, getHits, getDetail } from "../../services/xnxx.js";

export default {
  name: "XNXX Video Search",
  category: "nsfw",
  description: "Search video dan best hits dari XNXX",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: false,
      description: "Kata kunci video",
      example: "teen"
    },
    id: {
      type: "string",
      required: false,
      description: "URL atau ID video XNXX",
      example: ""
    }
  },
  execute: async (req) => {
    const id = req.query?.id || req.body?.id || req.query?.url || req.body?.url;
    if (id) {
      return await getDetail(id);
    }
    const query = req.query?.query || req.body?.query;
    if (query) {
      return await search(query);
    }
    return await getHits();
  }
};
`
  },
  {
    category: "nsfw",
    file: "xvideos.js",
    content: `import { search, getBest, getHome, getDetail } from "../../services/xvideos.js";

export default {
  name: "XVideos Search & Video",
  category: "nsfw",
  description: "Search video dan best video dari XVideos",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    query: {
      type: "string",
      required: false,
      description: "Kata kunci video",
      example: "korean"
    },
    id: {
      type: "string",
      required: false,
      description: "URL atau ID video XVideos",
      example: ""
    }
  },
  execute: async (req) => {
    const id = req.query?.id || req.body?.id || req.query?.url || req.body?.url;
    if (id) {
      return await getDetail(id);
    }
    const query = req.query?.query || req.body?.query;
    if (query) {
      return await search(query);
    }
    return await getBest();
  }
};
`
  },

  // TOOLS
  {
    category: "tools",
    file: "ruangemail.js",
    content: `import { getMessages, checkAuth } from "../../services/ruangemail.js";

export default {
  name: "RuangEmail Webmail & Inbox",
  category: "tools",
  description: "Cek inbox dan validasi email domain kustom RuangEmail",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    email: {
      type: "string",
      required: true,
      description: "Alamat email RuangEmail",
      example: "user@domain.com"
    },
    password: {
      type: "string",
      required: true,
      description: "Password email",
      example: "password123"
    }
  },
  execute: async (req) => {
    const email = req.query?.email || req.body?.email;
    const password = req.query?.password || req.body?.password;
    if (!email || !password) throw new Error("Parameter 'email' dan 'password' wajib disertakan");
    return await getMessages({ email, password, limit: 15 });
  }
};
`
  },
  {
    category: "tools",
    file: "emailnator.js",
    content: `import { generateEmail, getInbox, getMessage } from "../../services/emailnator.js";

export default {
  name: "Emailnator Disposable Mail",
  category: "tools",
  description: "Generate alamat email sementara (Gmail/Custom) dan baca pesan masuk",
  method: ["GET", "POST"],
  tokenCost: 10,
  params: {
    action: {
      type: "string",
      required: false,
      description: "'generate' untuk buat email baru, atau 'inbox' untuk baca kotak masuk",
      example: "generate"
    },
    email: {
      type: "string",
      required: false,
      description: "Alamat email sementara (wajib jika action=inbox)",
      example: ""
    }
  },
  execute: async (req) => {
    const action = String(req.query?.action || req.body?.action || "generate").toLowerCase();
    if (action === "inbox") {
      const email = req.query?.email || req.body?.email;
      if (!email) throw new Error("Parameter 'email' wajib disertakan untuk cek inbox");
      return await getInbox(email);
    }
    return await generateEmail();
  }
};
`
  },
  {
    category: "tools",
    file: "image-enlarger.js",
    content: `import { enhance, enlarge } from "../../services/image-enlarger.js";

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
`
  },
  {
    category: "tools",
    file: "transcribe-tube.js",
    content: `import { transcript } from "../../services/transcribe-tube.js";

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
`
  },
  {
    category: "tools",
    file: "tsundere-tts.js",
    content: `import { generateAnimeVoice } from "../../services/tsundere-tts.js";

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
`
  },
  {
    category: "tools",
    file: "top4top.js",
    content: `import uploadTop4top from "../../services/top4top.js";

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
`
  },
  {
    category: "tools",
    file: "codeku.js",
    content: `import { getSnippet, createSnippet } from "../../services/codeku.js";

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
`
  },

  // AI
  {
    category: "ai",
    file: "gemini.js",
    content: `import { askGemini } from "../../services/gemini.js";

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
`
  },
  {
    category: "ai",
    file: "feelbetter.js",
    content: `import { callFeelbetter } from "../../services/feelbetter.js";

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
`
  }
];

let created = 0;
for (const p of plugins) {
  const dir = path.join(pluginsDir, p.category);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const targetPath = path.join(dir, p.file);
  fs.writeFileSync(targetPath, p.content);
  created++;
  console.log(`[Plugin] Created: ${p.category}/${p.file}`);
}
console.log(`Total ${created} plugins created successfully!`);
