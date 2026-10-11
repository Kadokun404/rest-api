"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Modal from "./Modal";
import { NOTIFICATIONS } from "@/lib/notifications";
import { storage } from "@/lib/storage";

const SEEN_KEY = "kaelyn_notif_seen";

/** Popup notifikasi terbaru di beranda; hanya muncul sekali per notifikasi. */
export default function NotifPopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const latest = NOTIFICATIONS[0];

  useEffect(() => {
    if (pathname === "/" && storage.get(SEEN_KEY) !== latest.id) setOpen(true);
  }, [pathname, latest.id]);

  if (!open) return null;
  const close = () => { storage.set(SEEN_KEY, latest.id); setOpen(false); };

  return (
    <Modal title="Notifikasi" onClose={close} labelId="np-title" footer={<button type="button" className="btn btn-block" onClick={close}>TUTUP</button>}>
      <span className="notif-date">{latest.date}</span>
      <h4 style={{ margin: "6px 0", fontSize: 16 }}>{latest.title}</h4>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>{latest.body}</p>
    </Modal>
  );
}
