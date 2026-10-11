import { safeFetch } from "../../function.js";
import { buildProxiedUrl } from "../../mediaProxy.js";

const BASE_URL = "https://fancy-sea-5d3d.holy-breeze-fec5.workers.dev/?m=i";
const API_KEY = "ytmp3_2a9ecd4282415db205d29404cdc399580b3bf9eb7f55276649c669abe993ab23";

const HEADERS = {
  accept: "*/*",
  "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
  origin: "https://y2mate.gs",
  priority: "u=1, i",
  referer: "https://y2mate.gs/",
  "sec-ch-ua": '"Not=A?Brand";v="99", "Google Chrome";v="151", "Chromium";v="151"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "cross-site",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36"
};

const LABELS = ["checking", "extracting", "converting", "completed"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const getRequestValue = (req, key) => req.query?.[key] ?? req.body?.[key];

const extractVideoId = (value) => {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("URL YouTube tidak valid");
  }

  const hostname = parsed.hostname.toLowerCase();
  const allowedHosts = [
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtu.be",
    "www.youtu.be"
  ];

  if (!allowedHosts.includes(hostname)) {
    throw new Error("URL harus berasal dari YouTube");
  }

  let videoId = null;

  if (hostname.endsWith("youtu.be")) {
    videoId = parsed.pathname.split("/").filter(Boolean)[0];
  } else if (parsed.pathname === "/watch") {
    videoId = parsed.searchParams.get("v");
  } else {
    const match = parsed.pathname.match(/^\/(?:shorts|embed|live)\/([a-zA-Z0-9_-]{11})/);
    videoId = match?.[1] ?? null;
  }

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    throw new Error("Video ID YouTube tidak ditemukan");
  }

  return videoId;
};

const apiGet = async (url) => {
  const res = await safeFetch(url, { headers: HEADERS }, 30000);
  if (res.status === 429) throw new Error("Rate limit (429) dari server sumber");
  if (!res.ok) throw new Error(`HTTP ${res.status} dari server sumber`);

  const data = await res.json();
  if (Number(data?.error) > 0) throw new Error(`Error dari server sumber: ${data.error}`);
  return data;
};

const pollProgress = async (progressURL, downloadURL, videoID, timeout = 60000) => {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const data = await apiGet(`${progressURL}&_=${Date.now()}`);
    if (Number(data.progress) >= 3) {
      return { downloadURL: downloadURL || data.downloadURL, videoID, title: data.title };
    }
    await sleep(3000);
  }

  throw new Error("Polling timeout saat memproses audio");
};

const fetchConvert = async (videoID) => {
  const url = `${BASE_URL}&k=${API_KEY}&v=${videoID}&f=mp3&_=${Date.now()}`;
  const data = await apiGet(url);

  if (data.status === "download") {
    return { downloadURL: data.downloadURL, videoID, title: data.title };
  }
  if (data.status === "progress") {
    return pollProgress(data.progressURL, data.downloadURL, videoID);
  }

  throw new Error(`Status tidak dikenal dari server sumber: ${data.status}`);
};

export default {
  name: "YouTube MP3 Downloader",
  category: "downloader",
  description: "Mengunduh audio MP3 dari video YouTube. URL hasil diarahkan lewat domain api.kadokunn.com",
  method: ["GET", "POST"],
  timeout: 90000,
  params: {
    url: {
      type: "string",
      example: "https://youtu.be/ByiOOe6XuvM",
      required: true,
      description: "URL video YouTube atau Shorts"
    }
  },
  execute: async (req) => {
    const rawUrl = getRequestValue(req, "url");

    if (!rawUrl || typeof rawUrl !== "string") {
      throw new Error("Parameter 'url' wajib disertakan");
    }

    const videoId = extractVideoId(rawUrl);
    const startTime = Date.now();

    const result = await fetchConvert(videoId);
    if (!result.downloadURL) {
      throw new Error("Server sumber tidak mengembalikan tautan unduhan");
    }

    const downloadUrl = await buildProxiedUrl(req, result.downloadURL, "mp3");

    return {
      status: true,
      video_id: videoId,
      title: result.title || "YouTube Audio",
      format: "mp3",
      type: "audio",
      download_url: downloadUrl,
      original_url: rawUrl,
      process_time: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
    };
  }
};
