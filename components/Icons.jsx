const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true
};

export const BellIcon = (p) => (<svg {...base} {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>);
export const SunIcon = (p) => (<svg {...base} {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>);
export const MoonIcon = (p) => (<svg {...base} {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>);
export const MenuIcon = (p) => (<svg {...base} {...p}><path d="M3 6h18M3 12h18M3 18h18" /></svg>);
export const CloseIcon = (p) => (<svg {...base} {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>);
export const SearchIcon = (p) => (<svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>);
export const ChevronIcon = (p) => (<svg {...base} strokeWidth={2} {...p}><path d="M9 6l6 6-6 6" /></svg>);
export const UploadIcon = (p) => (<svg {...base} strokeWidth={1.5} {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M17 8l-5-5-5 5M12 3v13" /></svg>);
export const AlertIcon = (p) => (<svg {...base} {...p}><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></svg>);
export const TelegramIcon = (p) => (<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}><path d="M9.8 15.3l-.4 4.1c.5 0 .8-.2 1.1-.5l2.6-2.5 5.4 4c1 .5 1.7.3 2-1l3.6-16.9c.3-1.4-.5-2-1.5-1.6L1.5 9.4C.1 10 0 10.8 1.2 11.1l4.7 1.5L16.7 5c.5-.3 1-.2.6.2z" /></svg>);
export const GithubIcon = (p) => (<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}><path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.9 10.9c.6.1.8-.2.8-.5v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.4-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.7 2.6 1.2 3.3.9.1-.7.4-1.2.7-1.5-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.4-2.3 1.1-3.1-.1-.3-.5-1.5.1-3 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.5.2 2.7.1 3 .7.8 1.1 1.8 1.1 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.5A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5z" /></svg>);

export const LogoMark = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <rect x="18" y="17" width="7" height="30" rx="2" fill="#fff" />
    <path d="M28 32 L44 17 M28 32 L44 47" stroke="#fff" strokeWidth="7" strokeLinecap="round" fill="none" />
  </svg>
);
