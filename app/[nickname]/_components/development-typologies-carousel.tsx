"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Bathtub, Bed, Buildings, Car, MagnifyingGlassPlus, Ruler } from "@phosphor-icons/react";
import { ImageLightbox } from "./image-lightbox";

export type PublicDevelopmentTypology = {
  id: string;
  name: string;
  tower: string | null;
  typology: string | null;
  area: string | null;
  bedrooms: number | null;
  suites: number | null;
  bathrooms: number | null;
  parkingSpaces: number | null;
  units: number | null;
  plants: Array<{ id: string; url: string; alt: string; caption: string | null }>;
};

export function DevelopmentTypologiesCarousel({ items }: { items: PublicDevelopmentTypology[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [plantIndex, setPlantIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const active = items[activeIndex];
  if (!active) return null;

  function goTo(index: number) {
    setActiveIndex((index + items.length) % items.length);
    setPlantIndex(0);
    setLightboxIndex(null);
  }

  const facts = [
    active.area ? { icon: Ruler, value: `${active.area} m²`, label: "Área privativa" } : null,
    active.bedrooms != null ? { icon: Bed, value: String(active.bedrooms), label: "Dormitórios" } : null,
    active.suites != null ? { icon: Buildings, value: String(active.suites), label: "Suítes" } : null,
    active.bathrooms != null ? { icon: Bathtub, value: String(active.bathrooms), label: "Banheiros" } : null,
    active.parkingSpaces != null ? { icon: Car, value: String(active.parkingSpaces), label: "Vagas" } : null,
    active.units != null ? { icon: Buildings, value: String(active.units), label: "Unidades" } : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
  const selectedPlant = active.plants[plantIndex] ?? active.plants[0] ?? null;

  return (
    <section aria-roledescription="carrossel" aria-label="Tipologias do empreendimento">
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50/70">
        <article className="grid min-h-[440px] lg:grid-cols-[1.12fr_0.88fr]">
          <div className="relative min-h-[320px] overflow-hidden bg-stone-100 lg:min-h-[520px]">
            {selectedPlant ? (
              <button
                type="button"
                onClick={() => setLightboxIndex(plantIndex)}
                className="group absolute inset-0 cursor-zoom-in"
                aria-label={`Ampliar planta ${plantIndex + 1} da tipologia ${active.name}`}
              >
                <Image
                  src={selectedPlant.url}
                  alt={selectedPlant.alt || `Planta da tipologia ${active.name}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  className="object-contain p-6 transition duration-300 group-hover:scale-[1.015] md:p-10"
                  unoptimized
                />
                <span className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-3 py-2 text-xs font-medium text-slate-800 opacity-90 shadow-sm backdrop-blur transition group-hover:opacity-100">
                  <MagnifyingGlassPlus size={16} />
                  Ampliar
                </span>
              </button>
            ) : (
              <div className="flex h-full min-h-[320px] items-center justify-center px-8 text-center text-sm font-light text-slate-500">
                Planta não adicionada para esta tipologia.
              </div>
            )}
            {active.plants.length > 1 ? (
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-white/90 p-2 shadow-sm backdrop-blur">
                {active.plants.map((plant, index) => (
                  <button
                    key={plant.id}
                    type="button"
                    aria-label={`Ver planta ${index + 1}`}
                    aria-current={index === plantIndex}
                    onClick={() => setPlantIndex(index)}
                    className={`h-2.5 rounded-full transition ${index === plantIndex ? "w-7 bg-slate-950" : "w-2.5 bg-slate-300"}`}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col justify-between p-6 md:p-9">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--grey-olive)]">
                    Tipologia {String(activeIndex + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-3 text-4xl font-light leading-tight text-slate-950">{active.name}</h3>
                  {[active.typology, active.tower].filter(Boolean).length > 0 ? (
                    <p className="mt-2 font-light text-slate-500">{[active.typology, active.tower].filter(Boolean).join(" · ")}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-sm font-medium text-slate-400">{activeIndex + 1}/{items.length}</span>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-stone-200 bg-stone-200">
                {facts.map((fact) => {
                  const Icon = fact.icon;
                  return (
                    <div key={fact.label} className="flex items-center gap-3 bg-white p-4">
                      <Icon size={20} className="shrink-0 text-[var(--grey-olive)]" />
                      <div>
                        <p className="text-lg font-bold leading-none text-slate-950">{fact.value}</p>
                        <p className="mt-1 text-xs font-light text-slate-500">{fact.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {selectedPlant?.caption ? <p className="mt-5 text-sm font-light leading-6 text-slate-500">{selectedPlant.caption}</p> : null}
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-stone-200 pt-5">
              <button type="button" onClick={() => goTo(activeIndex - 1)} disabled={items.length < 2} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-300 bg-white text-slate-900 transition hover:bg-stone-100 disabled:opacity-30" aria-label="Tipologia anterior">
                <ArrowLeft size={18} />
              </button>
              <div className="flex max-w-[55%] gap-2 overflow-hidden" aria-label="Selecionar tipologia">
                {items.map((item, index) => (
                  <button key={item.id} type="button" onClick={() => goTo(index)} aria-label={`Ver ${item.name}`} aria-current={index === activeIndex} className={`h-2.5 rounded-full transition ${index === activeIndex ? "w-8 bg-[var(--grey-olive)]" : "w-2.5 bg-stone-300"}`} />
                ))}
              </div>
              <button type="button" onClick={() => goTo(activeIndex + 1)} disabled={items.length < 2} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-300 bg-white text-slate-900 transition hover:bg-stone-100 disabled:opacity-30" aria-label="Próxima tipologia">
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </article>
      </div>
      <ImageLightbox
        title={`Plantas de ${active.name}`}
        images={active.plants}
        activeIndex={lightboxIndex}
        onActiveIndexChange={(index) => {
          setLightboxIndex(index);
          setPlantIndex(index);
        }}
        onClose={() => setLightboxIndex(null)}
      />
    </section>
  );
}
