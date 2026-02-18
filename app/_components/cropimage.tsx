"use client";

import Image from "next/image";
import { Check, MagnifyingGlassMinus, MagnifyingGlassPlus, X } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type Point = { x: number; y: number };
type NaturalSize = { width: number; height: number };

type CropArea = {
  zoom: number;
  offset: Point;
};

type DragState = {
  mode: "square" | "vertical" | null;
  startX: number;
  startY: number;
  startOffsetX: number;
  startOffsetY: number;
};

interface DualImageCropperProps {
  imageSrc: string;
  onComplete: (squareBlob: Blob, verticalBlob: Blob) => void;
  onCancel: () => void;
}

const SQUARE_FRAME = { width: 300, height: 300, aspect: 1 as const };
const VERTICAL_FRAME = { width: 280, height: 350, aspect: 4 / 5 };
const SQUARE_OUTPUT = { width: 800, height: 800 };
const VERTICAL_OUTPUT = { width: 800, height: 1000 };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getScale(natural: NaturalSize, frameWidth: number, frameHeight: number, zoom: number) {
  const base = Math.max(frameWidth / natural.width, frameHeight / natural.height);
  return base * zoom;
}

function getLimits(
  natural: NaturalSize,
  frameWidth: number,
  frameHeight: number,
  zoom: number,
): Point {
  const scale = getScale(natural, frameWidth, frameHeight, zoom);
  const renderedWidth = natural.width * scale;
  const renderedHeight = natural.height * scale;
  return {
    x: Math.max(0, (renderedWidth - frameWidth) / 2),
    y: Math.max(0, (renderedHeight - frameHeight) / 2),
  };
}

async function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.src = url;
  });
}

async function buildCroppedBlob(params: {
  imageSrc: string;
  natural: NaturalSize;
  frameWidth: number;
  frameHeight: number;
  outputWidth: number;
  outputHeight: number;
  zoom: number;
  offset: Point;
}): Promise<Blob> {
  const {
    imageSrc,
    natural,
    frameWidth,
    frameHeight,
    outputWidth,
    outputHeight,
    zoom,
    offset,
  } = params;
  const image = await createImage(imageSrc);
  const scale = getScale(natural, frameWidth, frameHeight, zoom);
  const renderedWidth = natural.width * scale;
  const renderedHeight = natural.height * scale;
  const left = (frameWidth - renderedWidth) / 2 + offset.x;
  const top = (frameHeight - renderedHeight) / 2 + offset.y;

  const sx = Math.max(0, (0 - left) / scale);
  const sy = Math.max(0, (0 - top) / scale);
  const sw = Math.min(natural.width - sx, frameWidth / scale);
  const sh = Math.min(natural.height - sy, frameHeight / scale);

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Falha ao preparar canvas.");

  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((value) => resolve(value), "image/jpeg", 0.95),
  );
  if (!blob) throw new Error("Falha ao gerar recorte.");
  return blob;
}

export default function DualImageCropper({ imageSrc, onComplete, onCancel }: DualImageCropperProps) {
  const [naturalSize, setNaturalSize] = useState<NaturalSize | null>(null);
  const [loadingImage, setLoadingImage] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [squareCrop, setSquareCrop] = useState<CropArea>({ zoom: 1, offset: { x: 0, y: 0 } });
  const [verticalCrop, setVerticalCrop] = useState<CropArea>({ zoom: 1, offset: { x: 0, y: 0 } });

  const dragRef = useRef<DragState>({
    mode: null,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  });

  useEffect(() => {
    let active = true;

    createImage(imageSrc)
      .then((image) => {
        if (!active) return;
        setNaturalSize({ width: image.width, height: image.height });
      })
      .catch(() => {
        if (!active) return;
        setError("Não foi possível carregar a imagem.");
      })
      .finally(() => {
        if (!active) return;
        setLoadingImage(false);
      });

    return () => {
      active = false;
    };
  }, [imageSrc]);

  const squareLimits = useMemo(() => {
    if (!naturalSize) return { x: 0, y: 0 };
    return getLimits(naturalSize, SQUARE_FRAME.width, SQUARE_FRAME.height, squareCrop.zoom);
  }, [naturalSize, squareCrop.zoom]);

  const verticalLimits = useMemo(() => {
    if (!naturalSize) return { x: 0, y: 0 };
    return getLimits(naturalSize, VERTICAL_FRAME.width, VERTICAL_FRAME.height, verticalCrop.zoom);
  }, [naturalSize, verticalCrop.zoom]);

  function getStyle(frame: { width: number; height: number }, crop: CropArea) {
    if (!naturalSize) return undefined;
    const scale = getScale(naturalSize, frame.width, frame.height, crop.zoom);
    const width = naturalSize.width * scale;
    const height = naturalSize.height * scale;
    return {
      width,
      height,
      left: (frame.width - width) / 2 + crop.offset.x,
      top: (frame.height - height) / 2 + crop.offset.y,
    };
  }

  function updateZoom(mode: "square" | "vertical", zoom: number) {
    if (!naturalSize) return;
    if (mode === "square") {
      const limits = getLimits(naturalSize, SQUARE_FRAME.width, SQUARE_FRAME.height, zoom);
      setSquareCrop((prev) => ({
        zoom,
        offset: {
          x: clamp(prev.offset.x, -limits.x, limits.x),
          y: clamp(prev.offset.y, -limits.y, limits.y),
        },
      }));
      return;
    }
    const limits = getLimits(naturalSize, VERTICAL_FRAME.width, VERTICAL_FRAME.height, zoom);
    setVerticalCrop((prev) => ({
      zoom,
      offset: {
        x: clamp(prev.offset.x, -limits.x, limits.x),
        y: clamp(prev.offset.y, -limits.y, limits.y),
      },
    }));
  }

  function handlePointerDown(mode: "square" | "vertical", event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const targetCrop = mode === "square" ? squareCrop : verticalCrop;
    dragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: targetCrop.offset.x,
      startOffsetY: targetCrop.offset.y,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag.mode) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (drag.mode === "square") {
      const nextX = clamp(drag.startOffsetX + deltaX, -squareLimits.x, squareLimits.x);
      const nextY = clamp(drag.startOffsetY + deltaY, -squareLimits.y, squareLimits.y);
      setSquareCrop((prev) => ({ ...prev, offset: { x: nextX, y: nextY } }));
      return;
    }

    const nextX = clamp(drag.startOffsetX + deltaX, -verticalLimits.x, verticalLimits.x);
    const nextY = clamp(drag.startOffsetY + deltaY, -verticalLimits.y, verticalLimits.y);
    setVerticalCrop((prev) => ({ ...prev, offset: { x: nextX, y: nextY } }));
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current.mode) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current.mode = null;
  }

  async function handleComplete() {
    if (!naturalSize) return;
    try {
      setError(null);
      const [squareBlob, verticalBlob] = await Promise.all([
        buildCroppedBlob({
          imageSrc,
          natural: naturalSize,
          frameWidth: SQUARE_FRAME.width,
          frameHeight: SQUARE_FRAME.height,
          outputWidth: SQUARE_OUTPUT.width,
          outputHeight: SQUARE_OUTPUT.height,
          zoom: squareCrop.zoom,
          offset: squareCrop.offset,
        }),
        buildCroppedBlob({
          imageSrc,
          natural: naturalSize,
          frameWidth: VERTICAL_FRAME.width,
          frameHeight: VERTICAL_FRAME.height,
          outputWidth: VERTICAL_OUTPUT.width,
          outputHeight: VERTICAL_OUTPUT.height,
          zoom: verticalCrop.zoom,
          offset: verticalCrop.offset,
        }),
      ]);
      onComplete(squareBlob, verticalBlob);
    } catch {
      setError("Não foi possível finalizar os recortes.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center p-4">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl md:p-6">
          <div className="mb-5">
            <h2 className="text-2xl">Ajuste suas fotos de perfil</h2>
            <p className="text-sm font-light text-[var(--blue-slate)]">
              Arraste a imagem e use o zoom para definir os cortes 1:1 e 4:5.
            </p>
          </div>

          {loadingImage ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Carregando editor...
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {!loadingImage && naturalSize ? (
            <div className="grid gap-5 md:grid-cols-2">
              <section>
                <div className="mb-2">
                  <h3 className="text-sm font-semibold text-[var(--black)]">Avatar 1:1</h3>
                  <p className="text-xs font-light text-[var(--blue-slate)]">
                    Usado em listagens e miniaturas.
                  </p>
                </div>
                <div
                  className="relative mx-auto overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                  style={{ width: SQUARE_FRAME.width, height: SQUARE_FRAME.height }}
                  onPointerDown={(event) => handlePointerDown("square", event)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                >
                  <Image
                    src={imageSrc}
                    alt="Recorte quadrado"
                    width={naturalSize.width}
                    height={naturalSize.height}
                    className="pointer-events-none absolute max-w-none select-none"
                    style={getStyle(SQUARE_FRAME, squareCrop)}
                    unoptimized
                  />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <MagnifyingGlassMinus size={16} className="text-[var(--blue-slate)]" />
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={squareCrop.zoom}
                    onChange={(event) => updateZoom("square", Number(event.target.value))}
                    className="w-full cursor-pointer accent-[var(--primary-scarlet)]"
                  />
                  <MagnifyingGlassPlus size={16} className="text-[var(--blue-slate)]" />
                </div>
              </section>

              <section>
                <div className="mb-2">
                  <h3 className="text-sm font-semibold text-[var(--black)]">Foto vertical 4:5</h3>
                  <p className="text-xs font-light text-[var(--blue-slate)]">
                    Usada em perfil expandido e materiais visuais.
                  </p>
                </div>
                <div
                  className="relative mx-auto overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                  style={{ width: VERTICAL_FRAME.width, height: VERTICAL_FRAME.height }}
                  onPointerDown={(event) => handlePointerDown("vertical", event)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                >
                  <Image
                    src={imageSrc}
                    alt="Recorte vertical"
                    width={naturalSize.width}
                    height={naturalSize.height}
                    className="pointer-events-none absolute max-w-none select-none"
                    style={getStyle(VERTICAL_FRAME, verticalCrop)}
                    unoptimized
                  />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <MagnifyingGlassMinus size={16} className="text-[var(--blue-slate)]" />
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={verticalCrop.zoom}
                    onChange={(event) => updateZoom("vertical", Number(event.target.value))}
                    className="w-full cursor-pointer accent-[var(--primary-scarlet)]"
                  />
                  <MagnifyingGlassPlus size={16} className="text-[var(--blue-slate)]" />
                </div>
              </section>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <X size={16} />
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleComplete}
              disabled={loadingImage || !naturalSize}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check size={16} />
              Confirmar recortes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
