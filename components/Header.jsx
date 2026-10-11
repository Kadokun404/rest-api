"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BellIcon, SunIcon, MoonIcon, MenuIcon, CloseIcon, LogoMark } from "./Icons";
import { NAV_LINKS, MENU_LINKS, THEME_STORAGE } from "@/lib/site";
import { NOTIFICATIONS } from "@/lib/notifications";
import { getJSON } from "@/lib/api";
import { storage } from "@/lib/storage";
import { cx } from "@/lib/format";

const isActive = (pathname, href) => pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const notifRef = useRef(null);

  // Tutup menu & panel saat pindah halaman.
  useEffect(() => { setMenuOpen(false); setNotifOpen(false); }, [pathname]);

  // Label tombol akun: Login / Akun.
  useEffect(() => {
    let alive = true;
    getJSON("/api/auth/session").then(({ ok, data }) => {
      if (alive) setLoggedIn(Boolean(ok && data?.result?.account));
    });
    return () => { alive = false; };
  }, [pathname]);

  // Ctrl/Cmd+K -> cari endpoint, Esc -> tutup panel.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (pathname === "/endpoints") window.dispatchEvent(new Event("kaelyn:focus-search"));
        else router.push("/endpoints?focus=1");
      }
      if (e.key === "Escape") { setMenuOpen(false); setNotifOpen(false); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pathname, router]);

  // Klik di luar panel notifikasi menutupnya.
  useEffect(() => {
    if (!notifOpen) return;
    const onDown = (e) => { if (!notifRef.current?.contains(e.target)) setNotifOpen(false); };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [notifOpen]);

  function toggleTheme() {
    const dark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    storage.set(THEME_STORAGE, dark ? "dark" : "light");
    document.querySelector('meta[name="theme-color"]:not([media])')?.setAttribute("content", dark ? "#0b0b0c" : "#faf8f3");
  }

  return (
    <header className="site-header">
      <div className="container nav-inner">
        <Link href="/" className="brand" aria-label="Kaelyn Api's - Beranda">
          <span className="brand-logo"><LogoMark /></span>
          <span className="brand-name">Kaelyn Api&apos;s</span>
        </Link>

        <nav className="nav-links" aria-label="Navigasi utama">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={cx("nav-link", isActive(pathname, l.href) && "active")}>{l.label}</Link>
          ))}
        </nav>

        <span className="nav-spacer" />

        <div className="nav-actions">
          <div className="notif-wrap" ref={notifRef}>
            <button type="button" className="icon-btn" aria-label="Notifikasi" aria-expanded={notifOpen} onClick={() => setNotifOpen((v) => !v)}>
              <BellIcon />
            </button>
            {notifOpen && (
              <div className="notif-panel" role="region" aria-label="Notifikasi">
                {NOTIFICATIONS.map((n) => (
                  <div className="notif-item" key={n.id}>
                    <span className="notif-date">{n.date}</span>
                    <h4>{n.title}</h4>
                    <p>{n.body}</p>
                    {n.href && <Link href={n.href} className="btn btn-sm">{n.cta || "Buka"}</Link>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="button" className="icon-btn" aria-label="Ganti tema" onClick={toggleTheme}>
            <SunIcon className="ic-sun" />
            <MoonIcon className="ic-moon" />
          </button>

          <Link href="/account" className="btn btn-sm nav-account">{loggedIn ? "Akun" : "Login"}</Link>

          <button type="button" className="icon-btn hamburger" aria-label={menuOpen ? "Tutup menu" : "Buka menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="mobile-menu" aria-label="Menu">
          {MENU_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={isActive(pathname, l.href) ? "active" : undefined}>
              {l.href === "/account" ? (loggedIn ? "Akun" : "Login") : l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
