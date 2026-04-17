"use client";

import { CheckCircle, Info, WarningCircle, X } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";

export type FloatingToastKind = "error" | "success" | "info" | "warning";

export type FloatingToastItem = {
  id: string;
  kind: FloatingToastKind;
  message: string;
  onClose: () => void;
  durationMs?: number;
};

type FloatingToastViewportProps = {
  items: FloatingToastItem[];
};

function getToastStyles(kind: FloatingToastKind) {
  switch (kind) {
    case "success":
      return {
        icon: CheckCircle,
        containerClassName: "border-emerald-200 bg-white",
        iconClassName: "bg-emerald-50 text-emerald-700",
        textClassName: "text-emerald-900",
        closeClassName: "text-emerald-700 hover:bg-emerald-50",
        defaultDurationMs: 3200,
      };
    case "warning":
      return {
        icon: WarningCircle,
        containerClassName: "border-amber-200 bg-white",
        iconClassName: "bg-amber-50 text-amber-700",
        textClassName: "text-amber-900",
        closeClassName: "text-amber-700 hover:bg-amber-50",
        defaultDurationMs: 5000,
      };
    case "info":
      return {
        icon: Info,
        containerClassName: "border-sky-200 bg-white",
        iconClassName: "bg-sky-50 text-sky-700",
        textClassName: "text-sky-900",
        closeClassName: "text-sky-700 hover:bg-sky-50",
        defaultDurationMs: 4000,
      };
    case "error":
    default:
      return {
        icon: WarningCircle,
        containerClassName: "border-rose-200 bg-white",
        iconClassName: "bg-rose-50 text-rose-700",
        textClassName: "text-rose-900",
        closeClassName: "text-rose-700 hover:bg-rose-50",
        defaultDurationMs: 6500,
      };
  }
}

function FloatingToast({ item }: { item: FloatingToastItem }) {
  const styles = getToastStyles(item.kind);
  const Icon = styles.icon;
  const onCloseRef = useRef(item.onClose);

  useEffect(() => {
    onCloseRef.current = item.onClose;
  }, [item.onClose]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => onCloseRef.current(), item.durationMs ?? styles.defaultDurationMs);
    return () => window.clearTimeout(timeoutId);
  }, [item.durationMs, item.id, item.message, styles.defaultDurationMs]);

  return (
    <div
      role={item.kind === "error" ? "alert" : "status"}
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border p-3 shadow-[0_18px_45px_rgba(15,23,42,0.16)] backdrop-blur ${styles.containerClassName}`}
    >
      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${styles.iconClassName}`}>
        <Icon size={18} weight="fill" />
      </div>
      <div className={`min-w-0 flex-1 text-sm font-medium leading-6 ${styles.textClassName}`}>
        {item.message}
      </div>
      <button
        type="button"
        onClick={item.onClose}
        className={`shrink-0 rounded-full p-1 transition ${styles.closeClassName}`}
        aria-label="Fechar aviso"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function FloatingToastViewport({ items }: FloatingToastViewportProps) {
  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-6 top-6 z-[90] flex w-[min(100vw-2rem,24rem)] flex-col gap-3">
      {items.map((item) => (
        <FloatingToast key={item.id} item={item} />
      ))}
    </div>
  );
}
