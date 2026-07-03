"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  CaretLeft,
  CaretRight,
  HouseLine,
  Images,
  MagnifyingGlassPlus,
  Play,
  X,
} from "@phosphor-icons/react";

type PropertyGalleryImage = {
  url: string;
};

type PropertyGalleryProps = {
  title: string;
  images: PropertyGalleryImage[];
  video?: {
    url: string;
    title: string | null;
  } | null;
};

export function PropertyGallery({ title, images, video }: PropertyGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [videoLightboxOpen, setVideoLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const visibleImages = useMemo(() => images.slice(0, 5), [images]);
  const extraImagesCount = Math.max(0, images.length - 1);
  const activeImage = images[activeIndex] ?? null;
  const videoEmbedUrl = video ? buildYouTubeEmbedUrl(video.url) : null;

  function openLightbox(index: number) {
    if (images.length === 0) return;
    setActiveIndex(Math.max(0, Math.min(index, images.length - 1)));
    setLightboxOpen(true);
  }

  function closeLightbox() {
    setLightboxOpen(false);
  }

  function closeVideoLightbox() {
    setVideoLightboxOpen(false);
  }

  function goToPreviousImage() {
    if (images.length === 0) return;
    setActiveIndex((current) => (current - 1 + images.length) % images.length);
  }

  function goToNextImage() {
    if (images.length === 0) return;
    setActiveIndex((current) => (current + 1) % images.length);
  }

  useEffect(() => {
    if (!lightboxOpen && !videoLightboxOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setLightboxOpen(false);
        setVideoLightboxOpen(false);
        return;
      }

      if (videoLightboxOpen) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveIndex((current) => (current - 1 + images.length) % images.length);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % images.length);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [images.length, lightboxOpen, videoLightboxOpen]);

  if (images.length === 0) {
    return (
      <>
        <div className="relative flex min-h-[360px] h-full items-center justify-center rounded-[1.6rem] bg-stone-100 text-[var(--grey-olive)] shadow-xl shadow-stone-900/10 lg:min-h-0">
          <HouseLine size={46} />
          {videoEmbedUrl ? (
            <VideoOverlayButton title={video?.title} onClick={() => setVideoLightboxOpen(true)} />
          ) : null}
        </div>
        {videoLightboxOpen && videoEmbedUrl ? (
          <VideoLightbox
            title={video?.title ?? `Vídeo de ${title}`}
            embedUrl={videoEmbedUrl}
            onClose={closeVideoLightbox}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <div className="relative grid h-full min-h-[420px] gap-3 lg:min-h-0 lg:grid-cols-[1fr_1fr_0.95fr] lg:grid-rows-[7fr_3fr]">
        {visibleImages.map((image, index) => {
          const isMainImage = index === 0;
          const shouldShowOverlay = index === 1 && extraImagesCount > 0;

          return (
            <button
              key={`${image.url}-${index}`}
              type="button"
              onClick={() => openLightbox(index)}
              className={[
                "group relative min-h-[210px] cursor-zoom-in overflow-hidden rounded-[1.35rem] bg-stone-200 text-left shadow-lg shadow-stone-900/10 outline-none transition focus-visible:ring-4 focus-visible:ring-[color:rgba(145,139,118,0.28)] lg:min-h-0",
                isMainImage ? "lg:col-span-2" : "",
              ].join(" ")}
              aria-label={`Ampliar imagem ${index + 1} de ${title}`}
            >
              <Image
                src={image.url}
                alt={`${title} - foto ${index + 1}`}
                fill
                sizes={
                  isMainImage
                    ? "(min-width: 1024px) 38vw, 100vw"
                    : "(min-width: 1024px) 19vw, 100vw"
                }
                className="object-cover transition duration-500 group-hover:scale-[1.035]"
                priority={isMainImage}
                unoptimized
              />

              <span className="pointer-events-none absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
                <MagnifyingGlassPlus size={18} weight="bold" />
              </span>

              {shouldShowOverlay ? (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/46 px-4 text-center text-white">
                  <Images size={30} weight="regular" />
                  <span className="text-base font-light leading-none md:text-lg">+{extraImagesCount} imagens</span>
                </span>
              ) : null}
            </button>
          );
        })}

        {videoEmbedUrl ? (
          <VideoOverlayButton title={video?.title} onClick={() => setVideoLightboxOpen(true)} />
        ) : null}
      </div>

      {lightboxOpen && activeImage ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/95 p-4"
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              closeLightbox();
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
                goToPreviousImage();
              }}
              className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-white/10 p-3 text-white transition hover:bg-white/20"
              aria-label="Imagem anterior"
            >
              <CaretLeft size={24} weight="bold" />
            </button>
          ) : null}

          <div className="w-full max-w-[1600px]" onClick={(event) => event.stopPropagation()}>
            <p className="mb-3 text-center text-sm font-light text-white/75">
              {activeIndex + 1} de {images.length}
            </p>
            <div className="relative mx-auto flex max-h-[86vh] items-center justify-center overflow-hidden rounded-xl">
              <Image
                src={activeImage.url}
                alt={`${title} - foto ${activeIndex + 1}`}
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
                goToNextImage();
              }}
              className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-white/10 p-3 text-white transition hover:bg-white/20"
              aria-label="Próxima imagem"
            >
              <CaretRight size={24} weight="bold" />
            </button>
          ) : null}
        </div>
      ) : null}

      {videoLightboxOpen && videoEmbedUrl ? (
        <VideoLightbox
          title={video?.title ?? `Vídeo de ${title}`}
          embedUrl={videoEmbedUrl}
          onClose={closeVideoLightbox}
        />
      ) : null}
    </>
  );
}

function VideoOverlayButton({ title, onClick }: { title: string | null | undefined; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="absolute left-1/2 top-1/2 z-20 flex h-12 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[1.1rem] border border-white/35 bg-gradient-to-br from-red-500/72 via-red-600/68 to-red-900/62 text-white shadow-2xl shadow-red-950/25 backdrop-blur-[1px] transition hover:scale-[1.05] hover:brightness-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/35 lg:left-0 lg:top-[70%]"
      aria-label={title ? `Assistir vídeo: ${title}` : "Assistir vídeo do imóvel"}
    >
      <Play size={24} weight="fill" />
    </button>
  );
}

function buildYouTubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const videoId = parsed.searchParams.get("v");
    if (!videoId) return null;
    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1`;
  } catch {
    return null;
  }
}

function VideoLightbox({
  title,
  embedUrl,
  onClose,
}: {
  title: string;
  embedUrl: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/95 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="absolute right-4 top-4 rounded-lg border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20"
        aria-label="Fechar vídeo"
      >
        <X size={20} />
      </button>

      <div
        className="w-full max-w-5xl overflow-hidden rounded-2xl bg-black shadow-2xl shadow-black/40"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative aspect-video">
          <iframe
            src={embedUrl}
            title={title}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
