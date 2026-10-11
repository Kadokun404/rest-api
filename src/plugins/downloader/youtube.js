import axios from "axios";
import { buildProxiedUrl } from "../../mediaProxy.js";

const API_BASE = "https://api.theresav.eu/api/download";

const API_KEY = process.env.THERESAV_API_KEY || "ReiRiee";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "x-apikey": API_KEY,
};

function formatSize(bytes) {
  const value = Number(bytes);

  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index++;
  }

  return `${size.toFixed(2)} ${units[index]}`;
}

function formatDuration(seconds) {
  const value = Number(seconds);

  if (!Number.isFinite(value) || value < 0) {
    return "00:00";
  }

  const total = Math.floor(value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n) => String(n).padStart(2, "0");

  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(secs)}`
    : `${pad(minutes)}:${pad(secs)}`;
}

function getRequestValue(req, key) {
  return req.query?.[key] ?? req.body?.[key];
}

function validateYouTubeUrl(value) {
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
    "www.youtu.be",
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
    const match = parsed.pathname.match(
      /^\/(?:shorts|embed|live)\/([a-zA-Z0-9_-]{11})/
    );

    videoId = match?.[1] ?? null;
  }

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    throw new Error("Video ID YouTube tidak ditemukan");
  }

  return { parsed, videoId };
}

async function fetchTheresav(mediaUrl, format) {
  const endpoint = format === "mp4" ? "ytmp4" : "ytmp3";
  const requestUrl = `${API_BASE}/${endpoint}`;

  let response;

  try {
    response = await axios.get(requestUrl, {
      params: { url: mediaUrl },
      headers: HEADERS,
      timeout: 30000,
    });
  } catch (error) {
    const httpStatus = error.response?.status;

    throw new Error(
      `request gagal${httpStatus ? ` (HTTP ${httpStatus})` : ""}: ${error.message}`
    );
  }

  const data = response.data;

  if (!data || data.status !== true || !data.download_url) {
    throw new Error(
      `analyze failed | message=${data?.message || data?.error_msg || "unknown"}`
    );
  }

  return data;
}

export default {
  name: "YouTube Downloader",
  category: "downloader",
  description: "Download YouTube video as MP3 or MP4",
  method: ["GET", "POST"],

  params: {
    url: {
      type: "string",
      example:
        "https://youtu.be/ByiOOe6XuvM?si=U1euRrIVfEGKXiZU",
      required: true,
      description: "YouTube video or Shorts URL",
    },
    format: {
      type: "string",
      example: "mp3",
      required: false,
      description: "mp3 atau mp4, default mp3",
    },
  },

  execute: async (req) => {
    const rawUrl = getRequestValue(req, "url");

    const rawFormat = String(
      getRequestValue(req, "format") || "mp3"
    ).toLowerCase();

    const format = ["mp3", "mp4"].includes(rawFormat)
      ? rawFormat
      : "mp3";

    if (!rawUrl || typeof rawUrl !== "string") {
      throw new Error("Parameter url wajib disertakan");
    }

    const { videoId } = validateYouTubeUrl(rawUrl);
    const startTime = Date.now();

    const result = await fetchTheresav(rawUrl, format);

    const quality =
      format === "mp4"
        ? `${result.resolution || "360"}p`
        : result.bitrate || "128k";

    const proxiedDownload = await buildProxiedUrl(req, result.download_url, format);
    const proxiedThumbnail = await buildProxiedUrl(req, result.thumbnail, "jpg");

    const resource = {
      quality,
      format,
      type: format === "mp4" ? "video" : "audio",
      mimetype: result.mimetype,
      size: Number(result.filesize) || 0,
      size_formatted: formatSize(result.filesize),
      download_url: proxiedDownload,
    };

    return {
      status: true,
      video_id: videoId,
      title: result.title || "YouTube Media",
      author: "Kadokun",
      thumbnail: proxiedThumbnail,
      duration: formatDuration(result.duration_sec),
      format,
      download_url: proxiedDownload,
      resources: [resource],
      process_time: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
    };
  },
};
