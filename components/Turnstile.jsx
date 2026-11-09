"use client";
import { Turnstile as MarsiTurnstile } from "@marsidev/react-turnstile";

export default function Turnstile({
  siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAAF5bdLdTVW232IGD",
  onVerify,
  onExpire,
  onError,
  theme = "auto",
  className = ""
}) {
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
      <MarsiTurnstile
        siteKey={siteKey}
        onSuccess={(token) => {
          if (onVerify) onVerify(token);
        }}
        onExpire={() => {
          if (onExpire) onExpire();
        }}
        onError={(err) => {
          console.warn("[Turnstile] error:", err);
          if (onError) onError(err);
        }}
        options={{
          theme,
          size: "normal",
          action: "login"
        }}
      />
    </div>
  );
}
