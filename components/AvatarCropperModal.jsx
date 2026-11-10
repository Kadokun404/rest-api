"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { postJSON } from "@/lib/api";
import { useToast } from "./Toast";

const VIEWPORT_SIZE = 280; // ukuran kotak 1:1 di layar (px)
const OUTPUT_SIZE = 400;   // resolusi ekspor 1:1 (px)

export default function AvatarCropperModal({ file, onClose, onSuccess }) {
  const { toast } = useToast();
  const [imageSrc, setImageSrc] = useState(null);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [submitting, setSubmitting] = useState(false);

  const containerRef = useRef(null);

  // Load image file to object URL
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImageSrc(url);
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      setZoom(1);
      setPan({ x: 0, y: 0 });
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Hitung base scale agar foto selalu menutupi area 1:1
  const baseScale = naturalSize.w && naturalSize.h
    ? Math.max(VIEWPORT_SIZE / naturalSize.w, VIEWPORT_SIZE / naturalSize.h)
    : 1;

  const currentScale = baseScale * zoom;
  const currentW = naturalSize.w * currentScale;
  const currentH = naturalSize.h * currentScale;

  // Max pan batas agar foto tidak lepas dari bingkai
  const maxPanX = Math.max(0, (currentW - VIEWPORT_SIZE) / 2);
  const maxPanY = Math.max(0, (currentH - VIEWPORT_SIZE) / 2);

  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

  // Mouse drag handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const nextX = clamp(e.clientX - dragStart.x, -maxPanX, maxPanX);
    const nextY = clamp(e.clientY - dragStart.y, -maxPanY, maxPanY);
    setPan({ x: nextX, y: nextY });
  }, [isDragging, dragStart, maxPanX, maxPanY]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch drag handlers untuk mobile/HP
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const nextX = clamp(touch.clientX - dragStart.x, -maxPanX, maxPanX);
    const nextY = clamp(touch.clientY - dragStart.y, -maxPanY, maxPanY);
    setPan({ x: nextX, y: nextY });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Zoom changes
  const handleZoomChange = (newZoom) => {
    const nextZoom = clamp(newZoom, 1, 3);
    setZoom(nextZoom);
    // Re-clamp pan with new zoom
    const nextScale = baseScale * nextZoom;
    const nextMaxX = Math.max(0, (naturalSize.w * nextScale - VIEWPORT_SIZE) / 2);
    const nextMaxY = Math.max(0, (naturalSize.h * nextScale - VIEWPORT_SIZE) / 2);
    setPan((p) => ({
      x: clamp(p.x, -nextMaxX, nextMaxX),
      y: clamp(p.y, -nextMaxY, nextMaxY)
    }));
  };

  // Export 1:1 cropped canvas
  const handleSaveCrop = async () => {
    if (!imageSrc || submitting) return;
    setSubmitting(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");

      // Gambar foto dengan skala dan offset
      const ratio = OUTPUT_SIZE / VIEWPORT_SIZE;
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageSrc;
      });

      // Koordinat penempatan di canvas 400x400
      const imgLeftInViewport = (VIEWPORT_SIZE - currentW) / 2 + pan.x;
      const imgTopInViewport = (VIEWPORT_SIZE - currentH) / 2 + pan.y;

      ctx.fillStyle = "#08060b";
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      ctx.drawImage(
        img,
        imgLeftInViewport * ratio,
        imgTopInViewport * ratio,
        currentW * ratio,
        currentH * ratio
      );

      const croppedBase64 = canvas.toDataURL("image/jpeg", 0.88);

      // Kirim update ke /api/auth/profile
      const { ok, data } = await postJSON("/api/auth/profile", {
        photo: croppedBase64
      });

      if (ok && data?.status === true) {
        toast("Foto profil 1:1 berhasil diperbarui! ✨", "ok");
        if (onSuccess) onSuccess(data.result?.account || croppedBase64);
        onClose();
      } else {
        toast(data?.message || "Gagal menyimpan foto profil", "err");
      }
    } catch (err) {
      toast("Terjadi kesalahan: " + (err.message || "Gagal memproses foto"), "err");
    } finally {
      setSubmitting(false);
    }
  };

  if (!file) return null;

  const imgLeft = (VIEWPORT_SIZE - currentW) / 2 + pan.x;
  const imgTop = (VIEWPORT_SIZE - currentH) / 2 + pan.y;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(8, 6, 11, 0.85)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="card card-pad"
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--surface, #120a17)",
          border: "1px solid rgba(255, 24, 93, 0.35)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(255, 24, 93, 0.15)",
          borderRadius: 16,
          padding: 24,
          textAlign: "center"
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 18, color: "var(--text)" }}>Sesuaikan Foto Profil (1:1)</h3>
          <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
            Geser dan atur perbesaran foto agar pas di lingkaran 1:1.
          </p>
        </div>

        {/* 1:1 Crop Viewport Box */}
        <div
          ref={containerRef}
          style={{
            position: "relative",
            width: VIEWPORT_SIZE,
            height: VIEWPORT_SIZE,
            margin: "0 auto",
            borderRadius: 14,
            overflow: "hidden",
            background: "#050308",
            border: "2px solid rgba(255, 24, 93, 0.4)",
            cursor: isDragging ? "grabbing" : "grab",
            userSelect: "none",
            touchAction: "none"
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Render foto yang dapat digeser */}
          {imageSrc && (
            <img
              src={imageSrc}
              alt="Crop preview"
              draggable={false}
              style={{
                position: "absolute",
                left: `${imgLeft}px`,
                top: `${imgTop}px`,
                width: `${currentW}px`,
                height: `${currentH}px`,
                pointerEvents: "none",
                willChange: "transform"
              }}
            />
          )}

          {/* Circular 1:1 Avatar guide overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.55)",
              borderRadius: "50%",
              border: "2px dashed #ff185d"
            }}
          />

          {/* Badge 1:1 ratio tag */}
          <span
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              background: "rgba(18, 10, 23, 0.8)",
              border: "1px solid rgba(255, 24, 93, 0.4)",
              color: "#ff4d8d",
              padding: "2px 8px",
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "monospace",
              pointerEvents: "none"
            }}
          >
            1:1 RATIO
          </span>
        </div>

        {/* Zoom controls */}
        <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            className="btn btn-xs"
            onClick={() => handleZoomChange(zoom - 0.2)}
            disabled={zoom <= 1}
            style={{ width: 32, height: 32, fontSize: 16, fontWeight: 700 }}
          >
            -
          </button>

          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
            style={{
              flex: 1,
              accentColor: "var(--accent, #ff185d)",
              cursor: "pointer"
            }}
          />

          <button
            type="button"
            className="btn btn-xs"
            onClick={() => handleZoomChange(zoom + 0.2)}
            disabled={zoom >= 3}
            style={{ width: 32, height: 32, fontSize: 16, fontWeight: 700 }}
          >
            +
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span className="muted" style={{ fontSize: 11 }}>Zoom: {Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="btn btn-xs"
            style={{ fontSize: 11, padding: "2px 6px" }}
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            Reset Posisi
          </button>
        </div>

        {/* Footer actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button
            type="button"
            className="btn btn-block"
            onClick={onClose}
            disabled={submitting}
            style={{ flex: 1 }}
          >
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={handleSaveCrop}
            disabled={submitting}
            style={{ flex: 1.4 }}
          >
            {submitting ? "Mengunggah..." : "Terapkan & Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
