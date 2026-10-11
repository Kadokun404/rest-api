"use client";
import { useEffect, useState } from "react";
import { getJSON } from "@/lib/api";
import { AlertIcon } from "./Icons";

export default function MaintenanceBanner() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    getJSON("/api/maintenance").then(({ ok, data }) => {
      const m = ok && data?.result;
      if (alive && m?.enabled) setMessage(m.message || "Server sedang dalam perbaikan (maintenance).");
    });
    return () => { alive = false; };
  }, []);

  if (!message) return null;
  return (
    <div className="banner" role="status">
      <AlertIcon />
      <span>{message}</span>
    </div>
  );
}
