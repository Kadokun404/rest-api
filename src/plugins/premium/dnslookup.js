import dns from "node:dns/promises";

const DOMAIN_REGEX = /^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))*$/i;

const settle = async (promise, mapper = (v) => v) => {
  try {
    return mapper(await promise);
  } catch {
    return [];
  }
};

// Endpoint premium: category "premium" otomatis butuh API key plan premium
export default {
  name: "DNS Lookup",
  category: "premium",
  description: "Mengambil record DNS (A, AAAA, MX, NS, TXT, CNAME) dari sebuah domain",
  method: ["GET"],
  cache: 120,
  params: {
    domain: {
      type: "string",
      example: "kadokunn.com",
      required: true,
      description: "Nama domain, contoh: kadokunn.com"
    }
  },
  execute: async (req, res, { input }) => {
    const domain = String(input.domain).trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];

    if (!DOMAIN_REGEX.test(domain)) {
      throw new Error("Format domain tidak valid");
    }

    const [a, aaaa, mx, ns, txt, cname] = await Promise.all([
      settle(dns.lookup(domain, { family: 4, all: true }), (r) => r.map((x) => x.address)),
      settle(dns.lookup(domain, { family: 6, all: true }), (r) => r.map((x) => x.address)),
      settle(dns.resolveMx(domain), (r) => r.sort((x, y) => x.priority - y.priority)),
      settle(dns.resolveNs(domain)),
      settle(dns.resolveTxt(domain), (r) => r.map((chunks) => chunks.join(""))),
      settle(dns.resolveCname(domain))
    ]);

    if (![a, aaaa, mx, ns, txt, cname].some((list) => list.length > 0)) {
      throw new Error(`Tidak ada record DNS yang ditemukan untuk '${domain}'`);
    }

    return { domain, records: { A: a, AAAA: aaaa, CNAME: cname, MX: mx, NS: ns, TXT: txt } };
  }
};
