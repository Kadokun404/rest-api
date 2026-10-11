export const SITE = {
  name: "Kaelyn Api's",
  creator: "Kadokun",
  url: "https://api.kadokunn.com",
  description:
    "Kaelyn Api's adalah REST API publik yang cepat dan rapi untuk developer: downloader, search, QRIS, tools, dan lainnya. Response JSON konsisten, langsung pakai.",
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
