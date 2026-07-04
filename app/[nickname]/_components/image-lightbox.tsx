"use client";

import Image from "next/image";
import { useEffect } from "react";
import { CaretLeft, CaretRight, X } from "@phosphor-icons/react";

export type LightboxImage = {
  url: string;
};

type ImageLightboxProps = {
  title: string;
  images: LightboxImage[];
  activeIndex: number | null;
  onActiveIndexChange: (index: number) => void;
  onClose: () => void;
};

export function ImageLightbox({
  title,
  images,
  activeIndex,
  onActiveIndexChange,
  onClose,
}: ImageLightboxProps) {
  const safeActiveIndex =
    activeIndex === null || images.length === 0 ? 0 : Math.max(0, Math.min(activeIndex, images.length - 1));
  const activeImage = activeIndex === null ? null : images[safeActiveIndex] ?? null;

  useEffect(() => {
    if (!activeImage) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onActiveIndexChange((safeActiveIndex - 1 + images.length) % images.length);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        onActiveIndexChange((safeActiveIndex + 1) % images.length);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeImage, images.length, onActiveIndexChange, onClose, safeActiveIndex]);

  if (!activeImage) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/95 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="absolute right-4 top-4 rounded-lg border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20"
        aria-label="Fechar galeria"
      >
        <X size={20} />
      </button>

      {images.length > 1 ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onActiveIndexChange((safeActiveIndex - 1 + images.length) % images.length);
          }}
          className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-white/10 p-3 text-white transition hover:bg-white/20"
          aria-label="Imagem anterior"
        >
          <CaretLeft size={24} weight="bold" />
        </button>
      ) : null}

      <div className="w-full max-w-[1600px]" onClick={(event) => event.stopPropagation()}>
        <p className="mb-3 text-center text-sm font-light text-white/75">
          {safeActiveIndex + 1} de {images.length}
        </p>
        <div className="relative mx-auto flex max-h-[86vh] items-center justify-center overflow-hidden rounded-xl">
          <Image
            src={activeImage.url}
            alt={`${title} - foto ${safeActiveIndex + 1}`}
            width={1600}
            height={1067}
            className="max-h-[86vh] w-auto max-w-full object-contain"
            unoptimized
          />
        </div>
      </div>

      {images.length > 1 ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onActiveIndexChange((safeActiveIndex + 1) % images.length);
          }}
          className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-white/10 p-3 text-white transition hover:bg-white/20"
          aria-label="Próxima imagem"
        >
          <CaretRight size={24} weight="bold" />
        </button>
      ) : null}
    </div>
  );
}
