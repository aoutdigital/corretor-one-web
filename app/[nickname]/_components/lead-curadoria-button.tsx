"use client";

import Image from "next/image";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Check, MapPin, SpinnerGap, X } from "@phosphor-icons/react";

import {
  getBriefingCategoriaOptions,
  getBriefingSubcategoriaOptions,
  inferBriefingCategoriaToken,
  inferBriefingSubcategoriaToken,
} from "@/lib/imoveis/briefing-tipologia";

type Objective = "COMPRAR" | "ALUGAR" | "VENDER";
type TipoUso = "RESIDENCIAL" | "COMERCIAL";
type SubmitState = "idle" | "submitting" | "success" | "error";
type PlaceOption = { place_id: string; description: string };
type PlaceDetails = {
  place_id: string;
  name: string;
  formatted_address: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  lat: number | null;
  lng: number | null;
  address_components: unknown[];
};

type LeadCuradoriaButtonProps = {
  nickname: string;
  brokerName: string;
  className?: string;
  children?: ReactNode;
  avatarUrl?: string | null;
  creci?: string | null;
  imovelId?: string | null;
  imovelTitulo?: string | null;
  imovelTipo?: string | null;
  imovelSubtipo?: string | null;
  initialObjective?: Objective;
};

const OBJECTIVES: Array<{ value: Objective; label: string; description: string }> = [
  { value: "COMPRAR", label: "Comprar", description: "Encontrar um imóvel para compra." },
  { value: "ALUGAR", label: "Alugar", description: "Encontrar uma opção para locação." },
  { value: "VENDER", label: "Vender", description: "Receber orientação para vender um imóvel." },
];

const MIN_OPTIONS = [1, 2, 3, 4];
const RADIUS_OPTIONS = [1, 3, 5, 10, 20];

const COMMERCIAL_TYPES = new Set([
  "CASA_COMERCIAL",
  "ESCRITORIO",
  "GALPAO_DEPOSITO_ARMAZEM",
  "HOTEL_MOTEL_POUSADA",
  "PONTO_COMERCIAL_LOJA_BOX",
  "PREDIO_EDIFICIO_INTEIRO",
  "SELF_STORAGE",
  "SHOPPING",
]);

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Não foi possível enviar sua curadoria agora.";
  const error = (payload as { error?: { message?: unknown } }).error;
  return typeof error?.message === "string" ? error.message : "Não foi possível enviar sua curadoria agora.";
}

function getUtmParams() {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};

  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const value = params.get(key);
    if (value) utm[key] = value;
  }

  return utm;
}

function formatBrPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  const ddd = digits.slice(0, 2);
  const prefix = digits.length > 10 ? digits.slice(2, 7) : digits.slice(2, 6);
  const suffix = digits.length > 10 ? digits.slice(7, 11) : digits.slice(6, 10);

  if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : "";
  if (!prefix) return `(${ddd})`;
  if (!suffix) return `(${ddd}) ${prefix}`;
  return `(${ddd}) ${prefix}-${suffix}`;
}

function formatMoney(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 12);
  if (!digits) return "";
  return new Intl.NumberFormat("pt-BR").format(Number(digits));
}

function parseMaskedNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

function inferTipoUso(tipo: string | null | undefined): TipoUso {
  return tipo && COMMERCIAL_TYPES.has(tipo) ? "COMERCIAL" : "RESIDENCIAL";
}

function stepTitle(step: number) {
  if (step === 0) return "Qual é o seu objetivo agora?";
  if (step === 1) return "Que tipo de imóvel faz sentido?";
  if (step === 2) return "Quais pontos são importantes?";
  if (step === 3) return "Qual faixa de valor devo considerar?";
  if (step === 4) return "Onde devo procurar?";
  return "Como posso falar com você?";
}

export function LeadCuradoriaButton({
  nickname,
  brokerName,
  className,
  children,
  avatarUrl,
  creci,
  imovelId,
  imovelTitulo,
  imovelTipo,
  imovelSubtipo,
  initialObjective = "COMPRAR",
}: LeadCuradoriaButtonProps) {
  const initialTipoUso = inferTipoUso(imovelTipo);
  const initialCategory =
    inferBriefingCategoriaToken({ uso: initialTipoUso, tipoImovel: imovelTipo }) ??
    getBriefingCategoriaOptions(initialTipoUso)[0]?.value ??
    "";
  const initialSubcategory =
    inferBriefingSubcategoriaToken({
      uso: initialTipoUso,
      categoria: initialCategory,
      tipoImovel: imovelSubtipo || imovelTipo,
    }) ??
    getBriefingSubcategoriaOptions(initialTipoUso, initialCategory)[0]?.value ??
    "";

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [objective, setObjective] = useState<Objective>(initialObjective);
  const [tipoUso, setTipoUso] = useState<TipoUso>(initialTipoUso);
  const [category, setCategory] = useState(initialCategory);
  const [subcategory, setSubcategory] = useState(initialSubcategory);
  const [intention, setIntention] = useState<"MORADIA" | "INVESTIMENTO" | "">("");
  const [bedrooms, setBedrooms] = useState<number | null>(null);
  const [suites, setSuites] = useState<number | null>(null);
  const [parking, setParking] = useState<number | null>(null);
  const [areaMin, setAreaMin] = useState("");
  const [areaMax, setAreaMax] = useState("");
  const [valueMin, setValueMin] = useState("");
  const [valueMax, setValueMax] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [locationOptions, setLocationOptions] = useState<PlaceOption[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const categories = useMemo(() => getBriefingCategoriaOptions(tipoUso), [tipoUso]);
  const subcategories = useMemo(() => getBriefingSubcategoriaOptions(tipoUso, category), [category, tipoUso]);
  const selectedSubcategory = subcategories.find((item) => item.value === subcategory) ?? subcategories[0] ?? null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open || locationQuery.trim().length < 3 || selectedPlace?.formatted_address === locationQuery) {
      setLocationOptions([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLocationLoading(true);
      try {
        const response = await fetch(
          `/api/public/google/places/autocomplete?input=${encodeURIComponent(locationQuery)}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as { data?: PlaceOption[] };
        setLocationOptions(Array.isArray(payload.data) ? payload.data : []);
      } catch {
        if (!controller.signal.aborted) setLocationOptions([]);
      } finally {
        if (!controller.signal.aborted) setLocationLoading(false);
      }
    }, 280);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [locationQuery, open, selectedPlace?.formatted_address]);

  function handleTipoUsoChange(value: TipoUso) {
    const nextCategory = getBriefingCategoriaOptions(value)[0]?.value ?? "";
    const nextSubcategory = getBriefingSubcategoriaOptions(value, nextCategory)[0]?.value ?? "";
    setTipoUso(value);
    setCategory(nextCategory);
    setSubcategory(nextSubcategory);
  }

  function canContinue() {
    if (step === 0) return !!objective;
    if (step === 1) return !!selectedSubcategory;
    if (step === 4) return !!selectedPlace;
    if (step === 5) return firstName.trim().length > 1 && phone.replace(/\D/g, "").length >= 10 && email.includes("@");
    return true;
  }

  async function selectPlace(option: PlaceOption) {
    setLocationLoading(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/public/google/places/details?placeId=${encodeURIComponent(option.place_id)}`);
      const payload = (await response.json()) as { data?: PlaceDetails };
      if (!response.ok || !payload.data) {
        setFeedback("Não consegui carregar essa localização. Tente outra opção.");
        return;
      }
      setSelectedPlace(payload.data);
      setLocationQuery(payload.data.formatted_address || option.description);
      setLocationOptions([]);
    } catch {
      setFeedback("Não consegui carregar essa localização. Tente outra opção.");
    } finally {
      setLocationLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSubcategory || !selectedPlace) return;
    setSubmitState("submitting");
    setFeedback(null);

    try {
      const response = await fetch("/api/public/lead-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_key: "curadoria",
          nickname,
          nome: firstName,
          sobrenome: lastName,
          telefone: phone,
          email,
          mensagem: message,
          website,
          page_url: window.location.href,
          referrer: document.referrer,
          utm: getUtmParams(),
          context: {
            imovel_id: imovelId ?? null,
            imovel_titulo: imovelTitulo ?? null,
          },
          briefing: {
            objetivolead: [objective],
            tipouso: tipoUso,
            categoriaimovel: category ? [category] : [],
            subcategoriaimovel: subcategory ? [subcategory] : [],
            tipoimovel: [selectedSubcategory.tipo_imovel],
            intencao_compra: intention || null,
            quartos_min: bedrooms,
            suites_min: suites,
            vagas_min: parking,
            area_util_min: parseMaskedNumber(areaMin),
            area_util_max: parseMaskedNumber(areaMax),
            valor_min: parseMaskedNumber(valueMin),
            valor_max: parseMaskedNumber(valueMax),
            texto_livre: message,
            localizacao: {
              place: selectedPlace,
              localizacao_texto: selectedPlace.formatted_address,
              raio_km: radiusKm,
            },
          },
        }),
      });

      const payload: unknown = await response.json();
      if (!response.ok) {
        setSubmitState("error");
        setFeedback(getErrorMessage(payload));
        return;
      }

      setSubmitState("success");
      setFeedback("Pedido recebido. Vou preparar uma curadoria mais alinhada para você.");
    } catch {
      setSubmitState("error");
      setFeedback("Não foi possível enviar sua curadoria agora. Verifique sua conexão e tente novamente.");
    }
  }

  const modal =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
            <div className="relative max-h-[calc(100vh-4rem)] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl shadow-slate-950/25">
              <button
                type="button"
                className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                aria-label="Fechar"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>

              <div className="border-b border-slate-200 px-6 py-6 pr-16">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--grey-olive)]">Curadoria</p>
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white text-slate-600 shadow-sm">
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt={brokerName} fill sizes="56px" className="object-cover" unoptimized />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg font-bold">
                        {brokerName.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-light text-slate-500">Curadoria com</p>
                    <p className="truncate text-base font-bold text-slate-950">{brokerName}</p>
                    {creci ? (
                      <p className="mt-0.5 text-xs font-medium uppercase tracking-[0.12em] text-[var(--grey-olive)]">
                        {creci}
                      </p>
                    ) : null}
                  </div>
                </div>
                <h2 className="mt-5 text-3xl font-light leading-tight text-slate-950 md:text-4xl">
                  {submitState === "success" ? "Recebi seu pedido de curadoria." : stepTitle(step)}
                </h2>
                <p className="mt-3 text-sm font-light leading-6 text-slate-600">
                  {submitState === "success"
                    ? "Vou analisar o seu momento e separar opções que façam sentido."
                    : "Responda em poucos passos para eu entender o que procurar."}
                </p>
              </div>

              {submitState === "success" ? (
                <div className="px-6 py-8">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
                        <Check size={20} weight="bold" />
                      </span>
                      <p className="text-lg font-bold">{feedback}</p>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="px-6 py-6">
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                    className="hidden"
                    aria-hidden="true"
                  />

                  {step === 0 ? (
                    <div className="grid gap-3 md:grid-cols-3">
                      {OBJECTIVES.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setObjective(item.value)}
                          className={`rounded-xl border p-4 text-left transition ${
                            objective === item.value
                              ? "border-[var(--grey-olive)] bg-[color:rgba(145,139,118,0.10)]"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <span className="block text-lg font-bold text-slate-950">{item.label}</span>
                          <span className="mt-2 block text-sm font-light leading-5 text-slate-600">{item.description}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {step === 1 ? (
                    <div className="space-y-5">
                      <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                        {(["RESIDENCIAL", "COMERCIAL"] as TipoUso[]).map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => handleTipoUsoChange(item)}
                            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                              tipoUso === item ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
                            }`}
                          >
                            {item === "RESIDENCIAL" ? "Residencial" : "Comercial"}
                          </button>
                        ))}
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Categoria</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {categories.map((item) => (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => {
                                const first = getBriefingSubcategoriaOptions(tipoUso, item.value)[0]?.value ?? "";
                                setCategory(item.value);
                                setSubcategory(first);
                              }}
                              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                                category === item.value
                                  ? "border-[var(--grey-olive)] text-[var(--grey-olive)]"
                                  : "border-slate-200 text-slate-600 hover:border-slate-300"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Tipo</p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {subcategories.map((item) => (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => setSubcategory(item.value)}
                              className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
                                subcategory === item.value
                                  ? "border-[var(--grey-olive)] bg-[color:rgba(145,139,118,0.10)] text-slate-950"
                                  : "border-slate-200 text-slate-600 hover:border-slate-300"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {step === 2 ? (
                    <div className="space-y-5">
                      <div className="grid gap-4 sm:grid-cols-3">
                        <NumberChoice label="Dormitórios" value={bedrooms} onChange={setBedrooms} />
                        <NumberChoice label="Suítes" value={suites} onChange={setSuites} />
                        <NumberChoice label="Vagas" value={parking} onChange={setParking} />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Área mínima">
                          <input
                            value={areaMin}
                            onChange={(event) => setAreaMin(formatMoney(event.target.value))}
                            placeholder="Ex.: 80"
                            inputMode="numeric"
                            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[var(--grey-olive)]"
                          />
                        </Field>
                        <Field label="Área máxima">
                          <input
                            value={areaMax}
                            onChange={(event) => setAreaMax(formatMoney(event.target.value))}
                            placeholder="Ex.: 160"
                            inputMode="numeric"
                            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[var(--grey-olive)]"
                          />
                        </Field>
                      </div>
                      {objective === "COMPRAR" ? (
                        <div className="flex flex-wrap gap-2">
                          {[
                            ["MORADIA", "Moradia"],
                            ["INVESTIMENTO", "Investimento"],
                          ].map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setIntention(intention === value ? "" : value as "MORADIA" | "INVESTIMENTO")}
                              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                                intention === value
                                  ? "border-[var(--grey-olive)] text-[var(--grey-olive)]"
                                  : "border-slate-200 text-slate-600"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {step === 3 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Valor mínimo">
                        <input
                          value={valueMin}
                          onChange={(event) => setValueMin(formatMoney(event.target.value))}
                          placeholder="R$"
                          inputMode="numeric"
                          className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[var(--grey-olive)]"
                        />
                      </Field>
                      <Field label="Valor máximo">
                        <input
                          value={valueMax}
                          onChange={(event) => setValueMax(formatMoney(event.target.value))}
                          placeholder="R$"
                          inputMode="numeric"
                          className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[var(--grey-olive)]"
                        />
                      </Field>
                    </div>
                  ) : null}

                  {step === 4 ? (
                    <div className="space-y-5">
                      <div className="relative">
                        <Field label="Bairro, cidade, rua ou CEP">
                          <div className="relative">
                            <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--grey-olive)]" />
                            <input
                              value={locationQuery}
                              onChange={(event) => {
                                setLocationQuery(event.target.value);
                                setSelectedPlace(null);
                              }}
                              placeholder="Ex.: Santana, São Paulo"
                              className="w-full rounded-lg border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-[var(--grey-olive)]"
                            />
                          </div>
                        </Field>
                        {locationOptions.length > 0 ? (
                          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                            {locationOptions.map((item) => (
                              <button
                                key={item.place_id}
                                type="button"
                                onClick={() => void selectPlace(item)}
                                className="block w-full px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                              >
                                {item.description}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Raio de busca</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {RADIUS_OPTIONS.map((item) => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => setRadiusKm(item)}
                              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                                radiusKm === item
                                  ? "border-[var(--grey-olive)] bg-[color:rgba(145,139,118,0.10)] text-[var(--grey-olive)]"
                                  : "border-slate-200 text-slate-600"
                              }`}
                            >
                              {item} km
                            </button>
                          ))}
                        </div>
                      </div>
                      {selectedPlace ? (
                        <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                          Região selecionada: <strong className="text-slate-900">{selectedPlace.formatted_address}</strong>
                        </p>
                      ) : null}
                      {locationLoading ? <p className="text-sm text-slate-500">Buscando localização...</p> : null}
                    </div>
                  ) : null}

                  {step === 5 ? (
                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          value={firstName}
                          onChange={(event) => setFirstName(event.target.value)}
                          placeholder="Nome"
                          className="rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[var(--grey-olive)]"
                          required
                        />
                        <input
                          value={lastName}
                          onChange={(event) => setLastName(event.target.value)}
                          placeholder="Sobrenome"
                          className="rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[var(--grey-olive)]"
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          value={phone}
                          onChange={(event) => setPhone(formatBrPhone(event.target.value))}
                          placeholder="(11) 99999-9999"
                          inputMode="tel"
                          className="rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[var(--grey-olive)]"
                          required
                        />
                        <input
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="E-mail"
                          type="email"
                          className="rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[var(--grey-olive)]"
                          required
                        />
                      </div>
                      <textarea
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder="Se quiser, me conte mais sobre o que seria ideal."
                        rows={4}
                        className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[var(--grey-olive)]"
                      />
                    </div>
                  ) : null}

                  {feedback && submitState === "error" ? (
                    <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {feedback}
                    </p>
                  ) : null}

                  <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
                    <p className="text-sm font-light text-slate-500">Etapa {step + 1} de 6</p>
                    <div className="flex gap-3">
                      {step > 0 ? (
                        <button
                          type="button"
                          onClick={() => setStep((current) => Math.max(current - 1, 0))}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          <ArrowLeft size={16} />
                          Voltar
                        </button>
                      ) : null}
                      {step < 5 ? (
                        <button
                          type="button"
                          disabled={!canContinue()}
                          onClick={() => setStep((current) => Math.min(current + 1, 5))}
                          className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          Continuar
                          <ArrowRight size={16} />
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={!canContinue() || submitState === "submitting"}
                          className="inline-flex items-center gap-2 rounded-lg bg-[var(--grey-olive)] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-950/10 transition hover:bg-[color:rgba(145,139,118,0.88)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {submitState === "submitting" ? <SpinnerGap size={18} className="animate-spin" /> : null}
                          Enviar curadoria
                          <ArrowRight size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children ?? "Pedir curadoria"}
      </button>
      {modal}
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function NumberChoice({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {MIN_OPTIONS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(value === item ? null : item)}
            className={`h-11 min-w-11 rounded-full border px-3 text-sm font-bold transition ${
              value === item
                ? "border-[var(--grey-olive)] bg-[color:rgba(145,139,118,0.10)] text-[var(--grey-olive)]"
                : "border-slate-200 text-slate-600"
            }`}
          >
            {item}+
          </button>
        ))}
      </div>
    </div>
  );
}
