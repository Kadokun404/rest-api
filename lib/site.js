export const SITE = {
  name: "Arashi Api's",
  creator: "Kadokun",
  url: "https://kadokunn.com",
  supportEmail: "admin@kadokunn.com",
  description:
    "Arashi Api's adalah platform REST API publik dan premium berkecepatan tinggi untuk developer: AI, downloader, search, QRIS, tools, dan utilitas siap pakai dengan format JSON konsisten.",
  telegramBot: "kaelynapibot"
};

export const NAV_LINKS = [
  { href: "/docs", label: "Docs" },
  { href: "/endpoints", label: "Endpoints" },
  { href: "/premium", label: "Premium" },
  { href: "/status", label: "Status" }
];

export const MENU_LINKS = [
  ...NAV_LINKS,
  { href: "/uploader", label: "Uploader" },
  { href: "/payment", label: "Dukung Kami" },
  { href: "/account", label: "Akun" }
];

export const APIKEY_STORAGE = "kaelyn_apikey";
export const THEME_STORAGE = "kaelyn_theme";
