"use client";
import { useEffect, useRef } from "react";
import { CloseIcon } from "./Icons";

export default function Modal({ title, onClose, children, footer, labelId = "modal-title" }) {
  const ref = useRef(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={labelId} tabIndex={-1} ref={ref}>
        <div className="modal-head">
          <h3 id={labelId}>{title}</h3>
          <button type="button" className="icon-btn icon-btn-sm" aria-label="Tutup" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}
