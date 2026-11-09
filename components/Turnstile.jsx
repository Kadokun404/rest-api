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
  const [scriptLoaded, setScriptLoaded] = useState(false);

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
      if (onError) onError("Failed to load Cloudflare Turnstile script.");
    };
    document.head.appendChild(script);
  }, [onError]);

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.turnstile) return;

    // Remove previous widget instance if any
    if (widgetIdRef.current !== null) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {}
      widgetIdRef.current = null;
    }

    try {
      const id = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: theme,
        size: "flexible",
        callback: (token) => {
          if (onVerify) onVerify(token);
        },
        "expired-callback": () => {
          if (onExpire) onExpire();
        },
        "error-callback": (err) => {
          if (onError) onError(err);
        }
      });
      widgetIdRef.current = id;
    } catch (err) {
      console.error("[Turnstile] Render error:", err);
    }

    return () => {
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [scriptLoaded, siteKey, theme, onVerify, onExpire, onError]);

  return (
    <div
      className={`turnstile-wrapper ${className}`}
      style={{
        minHeight: 65,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        margin: "12px 0"
      }}
    >
      <div ref={containerRef} style={{ width: "100%", maxWidth: 320 }} />
    </div>
  );
}
