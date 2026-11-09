"use client";
import { useEffect, useRef, useState } from "react";

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export default function Turnstile({
  siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAAF5bdLdTVW232IGD",
  onVerify,
  onExpire,
  onError,
  theme = "auto",
  className = ""
}) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const renderedRef = useRef(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Keep callback references stable to prevent re-render tearing
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);
  onVerifyRef.current = onVerify;
  onExpireRef.current = onExpire;
  onErrorRef.current = onError;

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.turnstile) {
      setScriptLoaded(true);
      return;
    }

    const existingScript = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (existingScript) {
      const handleLoad = () => setScriptLoaded(true);
      existingScript.addEventListener("load", handleLoad);
      return () => existingScript.removeEventListener("load", handleLoad);
    }

    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => {
      if (onErrorRef.current) onErrorRef.current("Failed to load Cloudflare Turnstile script.");
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.turnstile) return;
    if (renderedRef.current) return;

    const renderWidget = () => {
      if (!containerRef.current || !window.turnstile || renderedRef.current) return;

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: theme,
          size: "normal",
          action: "login",
          callback: (token) => {
            if (onVerifyRef.current) onVerifyRef.current(token);
          },
          "expired-callback": () => {
            if (onExpireRef.current) onExpireRef.current();
          },
          "error-callback": (err) => {
            console.warn("[Turnstile] verification challenge error:", err);
            if (onErrorRef.current) onErrorRef.current(err);
          }
        });
        widgetIdRef.current = id;
        renderedRef.current = true;
      } catch (err) {
        console.error("[Turnstile] Render error:", err);
      }
    };

    if (typeof window.turnstile.ready === "function") {
      window.turnstile.ready(renderWidget);
    } else {
      renderWidget();
    }

    return () => {
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
        renderedRef.current = false;
      }
    };
  }, [scriptLoaded, siteKey, theme]);

  return (
    <div
      className={`turnstile-wrapper ${className}`}
      style={{
        minHeight: 65,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        margin: "14px 0"
      }}
    >
      <div ref={containerRef} style={{ width: 300, minHeight: 65 }} />
    </div>
  );
}
