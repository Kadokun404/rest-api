import net from "node:net";
import { safeFetch, getClientIp } from "../../function.js";

const isPrivateIp = (ip) => {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  const lower = ip.toLowerCase();
  return lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
};

export default {
  name: "IP Info",
  category: "premium",
  description: "Informasi lokasi, zona waktu, dan ISP dari sebuah alamat IP (kosongkan untuk IP kamu sendiri)",
  method: ["GET"],
  cache: 300,
  params: {
    ip: {
      type: "string",
      example: "8.8.8.8",
      required: false,
      description: "Alamat IPv4 / IPv6, kosongkan untuk memakai IP pemanggil"
    }
  },
  execute: async (req, res, { input, signal }) => {
    const ip = String(input.ip || getClientIp(req)).trim().replace(/^::ffff:/, "");

    if (!net.isIP(ip)) {
      throw new Error("Alamat IP tidak valid");
    }

    if (isPrivateIp(ip)) {
      throw new Error("Alamat IP privat / lokal tidak dapat dicari");
    }

    const response = await safeFetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { signal }, 12000);
    if (!response.ok) {
      throw new Error(`Gagal mengambil data IP (${response.status})`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || "Data IP tidak ditemukan");
    }

    return {
      ip: data.ip,
      type: data.type,
      continent: data.continent,
      country: data.country,
      country_code: data.country_code,
      region: data.region,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone?.id,
      utc_offset: data.timezone?.utc,
      isp: data.connection?.isp,
      org: data.connection?.org,
      asn: data.connection?.asn
    };
  }
};
