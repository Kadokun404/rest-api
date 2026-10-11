/**
 * Lyrics lib: Spotify for track metadata, Genius for the lyrics text.
 * Genius is scraped straight from its web pages (no API key): the search
 * page's embedded JSON resolves the lyrics URL, then the page's
 * `data-lyrics-container` divs hold the text.
 * @module plugins/search/genius
 */

import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } from "../../config.js";
import { buildProxiedUrl } from "../../mediaProxy.js";

export const CLIENT_ID = SPOTIFY_CLIENT_ID;
export const CLIENT_SECRET = SPOTIFY_CLIENT_SECRET;

const GENIUS_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/**
 * Strip common noise words ("lirik", "lyrics", "official video", etc.)
 * off a raw search query so upstream APIs get a cleaner title/artist match.
 * @param {string} raw
 * @returns {string}
 */
export function cleanQuery(raw) {
  return raw
    .replace(/^(lirik|lyrics|lagu|song|download|unduh|cari|search|teks|text)\s+/gi, "")
    .replace(/\s+(lirik|lyrics|lagu|song|full|official|video|mv|audio|hd)$/gi, "")
    .trim();
}

/**
 * Race a promise against a timeout, resolving with `fallback` instead of
 * rejecting/hanging if the timeout wins. Used so one slow upstream
 * (Spotify, Genius) never stalls the whole lookup.
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {T} fallback
 * @returns {Promise<T>}
 */
export function withTimeout(promise, ms, fallback) {
  let timer;
  const timeoutPromise = new Promise((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

/**
 * Look up the top Spotify search match for a query, to get clean
 * track/artist names, album thumbnail and duration. Returns null on any
 * failure (missing credentials, no match, network error).
 * @param {string} q
 * @returns {Promise<{name: string, artist: string, thumbnail: string, spotify_url: string, album: string, duration: number} | null>}
 */
export async function spotifyTopTrack(q) {
  if (!CLIENT_ID || !CLIENT_SECRET) return null;

  const auth = Buffer.from(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64");
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + auth
    },
    body: "grant_type=client_credentials"
  });
  if (!tokenRes.ok) return null;
  const tok = await tokenRes.json();
  if (!tok.access_token) return null;

  const searchRes = await fetch(
    "https://api.spotify.com/v1/search?q=" + encodeURIComponent(q) + "&type=track&limit=1",
    { headers: { Authorization: "Bearer " + tok.access_token } }
  );
  if (!searchRes.ok) return null;
  const data = await searchRes.json();
  const t = data && data.tracks && data.tracks.items && data.tracks.items[0];
  if (!t) return null;

  return {
    name: t.name || "",
    artist: (t.artists && t.artists[0] && t.artists[0].name) || "",
    thumbnail: (t.album && t.album.images && t.album.images[0] && t.album.images[0].url) || "-",
    spotify_url: (t.external_urls && t.external_urls.spotify) || "-",
    album: (t.album && t.album.name) || "-",
    duration: t.duration_ms ? Math.round(t.duration_ms / 1000) : 0
  };
}

/**
 * Fold an artist name to a comparison key: lowercase, alphanumerics only,
 * so "Sekar Agny", "Sekar  Agny!" and "SEKAR AGNY" all fold alike.
 * @param {string} s
 * @returns {string}
 */
function normalizeArtist(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Decode the HTML entities Genius uses inside lyric containers.
 * @param {string} s
 * @returns {string}
 */
function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#039;|&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

/**
 * Return the full `<div>…</div>` block (nested divs included) starting at
 * `start`, by walking div open/close tags with a depth counter.
 * @param {string} html
 * @param {number} start index of the opening `<div`
 * @returns {string | null}
 */
function balancedDiv(html, start) {
  const re = /<div\b[^>]*>|<\/div>/g;
  re.lastIndex = start;
  let depth = 0;
  let m;
  while ((m = re.exec(html))) {
    depth += m[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return html.slice(start, re.lastIndex);
  }
  return null;
}

/**
 * Remove every balanced `<div data-exclude-from-selection="true">` block —
 * the contributors header and translation widget nested inside lyric
 * containers.
 * @param {string} block
 * @returns {string}
 */
function stripExcluded(block) {
  const marker = 'data-exclude-from-selection="true"';
  let out = block;
  let from = 0;
  while (true) {
    const idx = out.indexOf(marker, from);
    if (idx < 0) break;
    const divStart = out.lastIndexOf("<div", idx);
    const end = divStart >= 0 ? balancedDiv(out, divStart) : null;
    if (!end) {
      from = idx + marker.length;
      continue;
    }
    out = out.slice(0, divStart) + out.slice(divStart + end.length);
    from = divStart;
  }
  return out;
}

/**
 * Pull the lyrics text out of a Genius lyrics page: all
 * `data-lyrics-container` divs, nested headers stripped, `<br/>` turned
 * into newlines, tags and entities removed. Returns '' when the page has
 * no container (wrong URL, layout change, block page).
 * @param {string} html
 * @returns {string}
 */
export function extractGeniusLyrics(html) {
  const marker = 'data-lyrics-container="true"';
  const parts = [];
  let from = 0;
  while (true) {
    const idx = html.indexOf(marker, from);
    if (idx < 0) break;
    from = idx + marker.length;
    const divStart = html.lastIndexOf("<div", idx);
    if (divStart < 0) continue;
    const block = balancedDiv(html, divStart);
    if (!block) continue;
    parts.push(stripExcluded(block));
  }
  if (!parts.length) return "";
  return decodeEntities(
    parts
      .join("\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Resolve the lyrics-page path for a query through Genius's web search
 * (embedded JSON, no key). Without `artistHint` the top hit wins; with one,
 * only a hit whose primary artist matches it (case/punctuation-insensitive,
 * containment allowed for "feat." variants) is accepted — otherwise null, so
 * an unrelated song never passes off as the requested one.
 * @param {string} query
 * @param {string} [artistHint]
 * @returns {Promise<string | null>}
 */
async function geniusSearchHits(query) {
  try {
    const res = await fetch("https://genius.com/api/search/song?q=" + encodeURIComponent(query), {
      headers: { "user-agent": GENIUS_UA, accept: "application/json" },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) return [];
    const data = await res.json();
    const hits = data?.response?.sections?.[0]?.hits;
    if (!Array.isArray(hits) || !hits.length) return [];
    return hits.map((h) => h?.result).filter((r) => r && typeof r.path === "string");
  } catch {
    return [];
  }
}

/**
 * Resolve the lyrics-page path for a query through Genius's web search
 * (embedded JSON, no key). Without `artistHint` the top hit wins; with one,
 * only a hit whose primary artist matches it (case/punctuation-insensitive,
 * containment allowed for "feat." variants) is accepted — otherwise null, so
 * an unrelated song never passes off as the requested one.
 * @param {string} query
 * @param {string} [artistHint]
 * @returns {Promise<string | null>}
 */
export async function geniusSearch(query, artistHint) {
  const results = await geniusSearchHits(query);
  if (!results.length) return null;
  const hint = normalizeArtist(artistHint);
  if (!hint) return results[0].path;
  const match = results.find((r) => {
    const name = normalizeArtist(r?.primary_artist?.name);
    if (!name) return false;
    if (name === hint) return true;
    const shorter = name.length <= hint.length ? name : hint;
    return shorter.length >= 4 && (name.includes(hint) || hint.includes(name));
  });
  return match ? match.path : null;
}

/**
 * Fetch a Genius lyrics page and return its raw HTML, or null on failure.
 * @param {string} path e.g. `/Said-the-sky-show-and-tell-lyrics`
 * @returns {Promise<string | null>}
 */
export async function geniusPage(path) {
  try {
    const res = await fetch("https://genius.com" + path, {
      headers: { "user-agent": GENIUS_UA, accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(7000)
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Resolve track metadata + lyrics for a raw search query.
 *
 * Two steps, no fallbacks:
 * 1. Spotify search for clean title/artist/thumbnail/album/duration.
 * 2. Genius search (web JSON) → lyrics page → scraped lyric text.
 *
 * Throws a 404-flavored error when either step comes up empty.
 * @param {string} rawQuery
 */
export async function fetchLyrics(rawQuery) {
  const q = cleanQuery(rawQuery);
  const notFound = () => {
    const err = new Error("Lyrics not found for the given query");
    err.status = 404;
    err.code = "not_found";
    return err;
  };

  const spotify = await withTimeout(spotifyTopTrack(q).catch(() => null), 3000, null);

  let meta;
  let path;

  if (spotify) {
    meta = {
      title: spotify.name,
      artist: spotify.artist,
      thumbnail: spotify.thumbnail,
      spotify_url: spotify.spotify_url,
      album: spotify.album,
      duration: spotify.duration
    };
    path = await withTimeout(geniusSearch(`${spotify.name} ${spotify.artist}`, spotify.artist), 6000, null);
  } else {
    // Fallback tanpa kredensial Spotify: pakai hasil pencarian Genius langsung.
    const results = await withTimeout(geniusSearchHits(q), 6000, []);
    const hit = Array.isArray(results) ? results[0] : null;
    if (hit) {
      meta = {
        title: hit.title || q,
        artist: hit.primary_artist?.name || "",
        thumbnail:
          hit.song_art_image_thumbnail_url ||
          hit.header_image_thumbnail_url ||
          hit.song_art_image_url ||
          "-",
        spotify_url: "-",
        album: "-",
        duration: 0
      };
      path = hit.path;
    }
  }

  if (!meta || !path) throw notFound();

  const html = await withTimeout(geniusPage(path), 7000, null);
  let plain = html ? extractGeniusLyrics(html) : "";
  if (!plain) throw notFound();

  /** Genius sometimes prints a bold song-title line above the lyrics. */
  const firstLine = plain.split("\n", 1)[0];
  const baseTitle = meta.title.replace(/\s*[([][^)\]]*[)\]]\s*/g, " ").trim();
  if (firstLine && baseTitle && firstLine.toLowerCase() === baseTitle.toLowerCase()) {
    plain = plain.slice(firstLine.length).replace(/^\n+/, "");
  }

  return {
    title: meta.title,
    artist: meta.artist,
    thumbnail: meta.thumbnail,
    spotify_url: meta.spotify_url,
    lyrics: {
      id: null,
      track_name: meta.title,
      artist_name: meta.artist,
      album_name: meta.album,
      duration: meta.duration,
      instrumental: /^instrumental$/i.test(plain),
      plain_lyrics: plain,
      synced_lyrics: null
    }
  };
}

/**
 * Format a duration in seconds as "m:ss". Returns "-" for falsy/zero
 * durations (e.g. when the lyrics source didn't report one).
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatDuration(totalSeconds) {
  const s = Math.floor(totalSeconds);
  if (!s) return "-";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default {
  name: "Genius Lyrics Search",
  category: "search",
  description: "Mencari metadata lagu (Spotify) dan lirik lengkap dari Genius",
  method: ["GET", "POST"],
  params: {
    query: {
      type: "string",
      example: "Bohemian Rhapsody Queen",
      required: true,
      description: "Judul lagu atau kata kunci"
    }
  },
  execute: async (req) => {
    const query = req.query?.query ?? req.body?.query;

    if (!query) {
      throw new Error("Parameter 'query' wajib disertakan");
    }

    const data = await fetchLyrics(query);
    const thumbnail = await buildProxiedUrl(req, data.thumbnail, "jpg");

    return {
      ...data,
      duration: formatDuration(data.lyrics.duration),
      thumbnail
    };
  }
};
