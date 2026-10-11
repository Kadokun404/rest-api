"use client";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ToastContext = createContext({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);

  const toast = useCallback((message, type) => {
    const id = ++idRef.current;
    setItems((list) => [...list, { id, message, type }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 3200);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-wrap" role="status" aria-live="polite">
        {items.map((t) => (<div key={t.id} className={`toast${t.type ? " " + t.type : ""}`}>{t.message}</div>))}
      </div>
    </ToastContext.Provider>
  );
}
