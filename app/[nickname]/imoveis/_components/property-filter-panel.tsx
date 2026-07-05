"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleNotch, SlidersHorizontal } from "@phosphor-icons/react";

import { MaskedIntegerInput } from "./masked-integer-input";

type PropertyListFilters = {
  operacao: "venda" | "aluguel";
  tipos: string[];
  cidade: string;
  bairro: string;
  dormitorios: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas: number | null;
  precoMin: number | null;
  precoMax: number | null;
  condominioMax: number | null;
  iptuMax: number | null;
  areaMin: number | null;
  areaMax: number | null;
};

type FilterOptions = {
  tipos: string[];
  cidades: string[];
  bairros: string[];
};

type PropertyFilterPanelProps = {
  nickname: string;
  filters: PropertyListFilters;
  filterOptions: FilterOptions;
  clearHref: string;
  initialCount: number;
};

export function PropertyFilterPanel({ nickname, filters, filterOptions, clearHref, initialCount }: PropertyFilterPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const form = panelRef.current?.closest("form");
    if (!form) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    const updatePreview = (delay = 0) => {
      if (timer) clearTimeout(timer);
      setIsLoading(true);
      timer = setTimeout(async () => {
        controller?.abort();
        controller = new AbortController();

        try {
          const params = new URLSearchParams();
          const formData = new FormData(form);
          for (const [key, value] of formData.entries()) {
            const normalized = String(value).trim();
            if (normalized) params.append(key, normalized);
          }

          const response = await fetch(`/${nickname}/imoveis/contagem?${params.toString()}`, {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          });
          if (!response.ok) return;
          const data = (await response.json()) as { count?: number };
          setCount(typeof data.count === "number" ? data.count : 0);
        } catch (error) {
          if ((error as Error).name !== "AbortError") setCount(0);
        } finally {
          setIsLoading(false);
        }
      }, delay);
    };

    const handleChange = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;
      if (target instanceof HTMLInputElement && (target.type === "text" || target.type === "search")) return;
      updatePreview(120);
    };

    const handleFocusOut = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
      if (target instanceof HTMLInputElement && target.type !== "text" && target.type !== "search") return;
      updatePreview(0);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (event.key !== "Enter") return;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
      if (target instanceof HTMLInputElement && target.type !== "text" && target.type !== "search") return;
      event.preventDefault();
      target.blur();
      updatePreview(0);
    };

    form.addEventListener("change", handleChange);
    form.addEventListener("focusout", handleFocusOut);
    form.addEventListener("keydown", handleKeyDown);

    return () => {
      if (timer) clearTimeout(timer);
      controller?.abort();
      form.removeEventListener("change", handleChange);
      form.removeEventListener("focusout", handleFocusOut);
      form.removeEventListener("keydown", handleKeyDown);
    };
  }, [nickname]);

  const countLabel = count === 1 ? "imóvel" : "imóveis";

  return (
    <div ref={panelRef} className="flex max-h-[calc(100vh-112px)] flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-100 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--grey-olive)]">Filtros</p>
            <h2 className="mt-1 text-2xl font-light text-slate-950">Busca avançada</h2>
          </div>
          <span className="flex size-11 items-center justify-center rounded-lg bg-stone-50 text-[var(--grey-olive)]">
            <SlidersHorizontal size={22} />
          </span>
        </div>
        <p className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-slate-950 px-4 py-3 text-sm font-light text-white" aria-live="polite">
          <span>
            Prévia:{" "}
            <strong className="font-bold">
              {count}
            </strong>{" "}
            {count === 1 ? "imóvel nesta busca" : "imóveis nesta busca"}
          </span>
          {isLoading ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-white/70">
              <CircleNotch size={14} className="animate-spin" />
              Atualizando
            </span>
          ) : null}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-5">
        <FilterSection title="Operação">
          <select name="operacao" defaultValue={filters.operacao} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-[var(--grey-olive)]">
            <option value="venda">Comprar</option>
            <option value="aluguel">Alugar</option>
          </select>
        </FilterSection>

        {filterOptions.tipos.length > 0 ? (
          <FilterSection title="Tipologia">
            <div className="grid gap-2">
              {filterOptions.tipos.map((tipo) => (
                <label key={tipo} className="group cursor-pointer">
                  <input
                    type="checkbox"
                    name="tipo"
                    value={tipo}
                    defaultChecked={filters.tipos.includes(tipo)}
                    className="peer sr-only"
                  />
                  <span className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 transition peer-checked:border-slate-950 peer-checked:bg-slate-950 peer-checked:text-white group-hover:border-[var(--grey-olive)]">
                    {formatEnumLabel(tipo)}
                    <span className="size-3 rounded-full border border-current opacity-45 peer-checked:opacity-100" />
                  </span>
                </label>
              ))}
            </div>
          </FilterSection>
        ) : null}

        <FilterSection title="Localização">
          <div className="space-y-3">
            <label className="block">
              <span className="sr-only">Cidade</span>
              <select name="cidade" defaultValue={filters.cidade} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--grey-olive)]">
                <option value="">Todas as cidades</option>
                {filterOptions.cidades.map((cidade) => (
                  <option key={cidade} value={cidade}>{cidade}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="sr-only">Bairro</span>
              <select name="bairro" defaultValue={filters.bairro} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--grey-olive)]">
                <option value="">Todos os bairros</option>
                {filterOptions.bairros.map((bairro) => (
                  <option key={bairro} value={bairro}>{bairro}</option>
                ))}
              </select>
            </label>
          </div>
        </FilterSection>

        <FilterSection title="Perfil do imóvel">
          <div className="space-y-5">
            <MinimumOptionGroup label="Dormitórios" name="dormitorios" value={filters.dormitorios} />
            <MinimumOptionGroup label="Banheiros" name="banheiros" value={filters.banheiros} />
            <MinimumOptionGroup label="Vagas" name="vagas" value={filters.vagas} />
          </div>
        </FilterSection>

        <FilterSection title="Valores">
          <div className="grid grid-cols-2 gap-3">
            <MaskedIntegerInput name="preco_min" label="Valor mín." value={filters.precoMin} prefix="R$" placeholder="0" />
            <MaskedIntegerInput name="preco_max" label="Valor máx." value={filters.precoMax} prefix="R$" placeholder="0" />
            <MaskedIntegerInput name="condominio_max" label="Cond. máx." value={filters.condominioMax} prefix="R$" placeholder="0" />
            <MaskedIntegerInput name="iptu_max" label="IPTU máx." value={filters.iptuMax} prefix="R$" placeholder="0" />
          </div>
        </FilterSection>

        <FilterSection title="Metragem">
          <div className="grid grid-cols-2 gap-3">
            <MaskedIntegerInput name="area_min" label="Área mín." value={filters.areaMin} placeholder="0" />
            <MaskedIntegerInput name="area_max" label="Área máx." value={filters.areaMax} placeholder="0" />
          </div>
        </FilterSection>
      </div>

      <div className="flex items-center gap-3 border-t border-stone-100 bg-white p-4 shadow-[0_-12px_28px_rgba(15,23,42,0.07)]">
        <Link href={clearHref} className="shrink-0 px-2 text-sm font-bold text-slate-500 underline-offset-4 transition hover:text-slate-950 hover:underline">
          Limpar
        </Link>
        <button type="submit" className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--grey-olive)]">
          {isLoading ? <CircleNotch size={17} className="animate-spin" /> : null}
          Buscar {count > 99 ? "99+" : count} {countLabel}
          {!isLoading ? <ArrowRight size={17} weight="bold" /> : null}
        </button>
      </div>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

function MinimumOptionGroup({ label, name, value }: { label: string; name: string; value: number | null }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold text-slate-700">{label}</legend>
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((option) => (
          <label key={option} className="cursor-pointer">
            <input type="radio" name={name} value={option} defaultChecked={value === option} className="peer sr-only" />
            <span className="flex h-11 items-center justify-center rounded-full border border-stone-200 bg-white text-sm font-bold text-slate-700 transition peer-checked:border-slate-950 peer-checked:bg-slate-950 peer-checked:text-white hover:border-[var(--grey-olive)]">
              {option}+
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function formatEnumLabel(value: string | null | undefined) {
  if (!value) return "";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
