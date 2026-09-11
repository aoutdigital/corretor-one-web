"use client";

import Image from "next/image";
import {
  ArrowClockwise,
  ArrowLeft,
  Bed,
  BookmarkSimple,
  Car,
  ChatCircle,
  Check,
  DownloadSimple,
  Heart,
  House,
  ImageSquare,
  MagnifyingGlass,
  PaperPlaneTilt,
  Ruler,
  Sparkle,
  FloppyDisk,
  UserCircle,
  X,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/app/_components/app-shell";
import { apiFetchWithAuth } from "@/lib/client/auth-api";
import {
  buildPropertyEssentialHtml,
  buildPropertyDualHtml,
  buildPropertyEditorialHtml,
  buildPropertyJourneyHtml,
  CREATIVE_DARK_THEMES,
  CREATIVE_DIMENSIONS,
  PROPERTY_JOURNEY_SLIDES,
  PROPERTY_JOURNEY_DEFAULTS,
  type CreativeFormat,
  type CreativeColorTheme,
  type CreativeTemplateConfig,
  type PropertyCreativePayload,
} from "@/lib/creatives/static-template";

type Template = {
  id: string;
  nome: string;
  renderer_key: string;
  formatos: CreativeFormat[];
  mode: "FIXED" | "HYBRID";
  config: CreativeTemplateConfig | null;
  preview_url: string | null;
  preview_vertical_url: string | null;
  tipo?: "STATIC" | "CAROUSEL";
};
type Property = {
  id: string;
  titulo: string;
  display_title: string;
  short_title: string;
  codigo: string | null;
  finalidade: string;
  tipo: string;
  bairro_comercial: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  preco_venda: number | null;
  preco_locacao: number | null;
  area_util: number | null;
  dormitorios: number | null;
  suites: number | null;
  vagas: number | null;
  caracteristicas: string[] | null;
  images: string[];
  development_images: string[];
  empreendimento: { nome: string } | null;
  environments: Array<{
    id: string;
    title: string;
    subtitle: string | null;
    area: string | null;
    tags: string[];
  }>;
  creative_label?: string;
};
type Profile = {
  nickname: string;
  primeiro_nome: string;
  sobrenome: string;
  avatar_url: string | null;
  logo_nickname_url: string | null;
  logo_nickname_white_url: string | null;
  creci_uf: string;
  creci_numero: string;
  frase_impacto: string | null;
  authority_numbers: Array<{ valor: string; rotulo: string; ordem: number }>;
};
type Post = {
  id: string;
  formato: CreativeFormat;
  status: "GERANDO" | "PRONTO" | "ERRO";
  resultado_url: string | null;
  resultado_urls: string[] | null;
  payload: { property?: { title?: string } };
};
type Bootstrap = {
  templates: Template[];
  properties: Property[];
  profile: Profile | null;
  posts: Post[];
};
type CreativeDraft = {
  id: string;
  template_id: string;
  subject_id: string;
  formato: CreativeFormat;
  payload: {
    image_url?: string;
    secondary_image_url?: string;
    carousel_image_urls?: string[];
    carousel_slides?: CarouselSlideConfig[];
    price_mode?: "PRICE" | "CONSULT";
    highlight?: string;
    image_label_mode?: ImageLabelMode;
    cta?: string;
    color_theme?: CreativeColorTheme;
  };
};
type PreviewMode = "INSTAGRAM_FEED" | "STORY_STATUS";
type TitleMode = "FULL" | "SHORT";
type ImageLabelMode = "DEVELOPMENT" | "LOCATION";
type CreativeStep = "OBJECTIVE" | "TEMPLATE" | "EDITOR";
type CarouselSlideConfig = {
  kind: "COVER" | "NUMBERS" | "ENVIRONMENT" | "FEATURES" | "LOCATION" | "CONTACT";
  environmentId?: string;
  imageUrl: string;
  eyebrow: string;
  title: string;
  text: string;
  attributes?: string[];
};

function withFixedPropertySlide(slides: CarouselSlideConfig[]) {
  return slides.map((slide, index) =>
    index === 1
      ? {
          ...slide,
          kind: "NUMBERS" as const,
          imageUrl: "",
          eyebrow: "Visão geral",
          title: "",
          text: "",
        }
      : slide,
  );
}

function createCarouselSlides(
  images: string[],
  environments: Property["environments"] = [],
  features: string[] = [],
): CarouselSlideConfig[] {
  const available = images.length ? images : [""];
  let environmentIndex = 0;
  return PROPERTY_JOURNEY_DEFAULTS.map((item, index) => {
    const environment = item.kind === "ENVIRONMENT" ? environments[environmentIndex++] : null;
    if (index === 1)
      return {
        ...item,
        imageUrl: "",
        eyebrow: "Visão geral",
        title: "",
        text: "",
        attributes: [],
      };
    return {
      ...item,
      environmentId: environment?.id,
      title: environment?.title || item.title,
      text: environment ? [environment.area, environment.subtitle, ...environment.tags].filter(Boolean).slice(0, 4).join(" · ") : item.text,
      imageUrl: available[Math.min(Math.max(0, index - 1), available.length - 1)],
      attributes: item.kind === "FEATURES" ? features.slice(0, 6) : undefined,
    };
  });
}

const money = (value: number | null) =>
  value
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(value)
    : "Consulte o valor";

export default function CreativesPage() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [step, setStep] = useState<CreativeStep>("OBJECTIVE");
  const [draftId, setDraftId] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [propertyId, setPropertyId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [secondaryImageUrl, setSecondaryImageUrl] = useState("");
  const [carouselImageUrls, setCarouselImageUrls] = useState<string[]>([]);
  const [carouselSlide, setCarouselSlide] = useState(0);
  const [editorSlide, setEditorSlide] = useState(0);
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlideConfig[]>(
    () => createCarouselSlides([]),
  );
  const [activeImageSlot, setActiveImageSlot] = useState<
    "PRIMARY" | "SECONDARY"
  >("PRIMARY");
  const [priceMode, setPriceMode] = useState<"PRICE" | "CONSULT">("PRICE");
  const [highlight, setHighlight] = useState("Oportunidade");
  const [colorTheme, setColorTheme] = useState<CreativeColorTheme>("PETROL");
  const [format, setFormat] = useState<CreativeFormat>("PORTRAIT");
  const [cta, setCta] = useState("Conheça todos os detalhes");
  const [imageLabelMode, setImageLabelMode] =
    useState<ImageLabelMode>("DEVELOPMENT");
  const [generating, setGenerating] = useState(false);
  const [propertyPickerOpen, setPropertyPickerOpen] = useState(false);
  function apply(result: Bootstrap) {
    setData(result);
  }
  function refresh() {
    apiFetchWithAuth<Bootstrap>("/api/criativos").then((result) =>
      result.ok ? apply(result.data) : setError(result.error),
    );
  }
  useEffect(() => {
    let active = true;
    apiFetchWithAuth<Bootstrap>("/api/criativos").then((result) => {
      if (!active) return;
      if (result.ok) apply(result.data);
      else setError(result.error);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!data || propertyId) return;
    const requestedId = new URLSearchParams(window.location.search).get(
      "imovel",
    );
    if (
      requestedId &&
      data.properties.some((item) => item.id === requestedId)
    ) {
      chooseProperty(requestedId);
      setStep("TEMPLATE");
    }
  }, [data, propertyId]);
  useEffect(() => {
    if (!data || draftLoaded) return;
    const requestedDraft = new URLSearchParams(window.location.search).get(
      "rascunho",
    );
    if (!requestedDraft) {
      setDraftLoaded(true);
      return;
    }
    apiFetchWithAuth<CreativeDraft>(
      `/api/criativos/drafts?id=${encodeURIComponent(requestedDraft)}`,
    ).then((result) => {
      setDraftLoaded(true);
      if (!result.ok || !result.data)
        return setError(result.ok ? "Rascunho não encontrado." : result.error);
      const draft = result.data;
      const payload = draft.payload ?? {};
      setDraftId(draft.id);
      setTemplateId(draft.template_id);
      setPropertyId(draft.subject_id);
      setFormat(draft.formato);
      setImageUrl(payload.image_url ?? "");
      setSecondaryImageUrl(payload.secondary_image_url ?? "");
      setCarouselImageUrls(payload.carousel_image_urls ?? []);
      setCarouselSlides(
        payload.carousel_slides?.length === PROPERTY_JOURNEY_SLIDES
          ? withFixedPropertySlide(payload.carousel_slides)
          : createCarouselSlides(
              payload.carousel_image_urls ?? [],
              data.properties.find((item) => item.id === draft.subject_id)?.environments ?? [],
              data.properties.find((item) => item.id === draft.subject_id)?.caracteristicas ?? [],
            ),
      );
      setPriceMode(payload.price_mode ?? "PRICE");
      setHighlight(payload.highlight ?? "Oportunidade");
      setImageLabelMode(payload.image_label_mode ?? "DEVELOPMENT");
      setCta(payload.cta ?? "Conheça todos os detalhes");
      setColorTheme(payload.color_theme ?? "PETROL");
      setStep("EDITOR");
    });
  }, [data, draftLoaded]);
  const property = useMemo(
    () => data?.properties.find((item) => item.id === propertyId) ?? null,
    [data, propertyId],
  );
  const template =
    data?.templates.find((item) => item.id === templateId) ?? null;
  const isDual = template?.renderer_key === "property-dual-02";
  const isEditorial = template?.renderer_key === "property-editorial-03";
  const isCarousel = template?.renderer_key === "property-journey-carousel-01";
  const carouselRenderImages = [
    ...new Set(carouselSlides.map((slide) => slide.imageUrl).filter(Boolean)),
  ];
  const previewMode: PreviewMode =
    format === "VERTICAL" ? "STORY_STATUS" : "INSTAGRAM_FEED";
  function chooseProperty(id: string) {
    setPropertyId(id);
    const selected = data?.properties.find((item) => item.id === id);
    setImageUrl(selected?.images[0] ?? "");
    setSecondaryImageUrl(
      selected?.development_images[0] ??
        selected?.images[1] ??
        selected?.images[0] ??
        "",
    );
    setCarouselImageUrls(
      [
        ...new Set([
          ...(selected?.images ?? []),
          ...(selected?.development_images ?? []),
        ]),
      ].slice(0, 6),
    );
    setCarouselSlides(
      createCarouselSlides(
        [
          ...new Set([
            ...(selected?.images ?? []),
            ...(selected?.development_images ?? []),
          ]),
        ].slice(0, 6),
        selected?.environments ?? [],
        selected?.caracteristicas ?? [],
      ),
    );
  }
  function navigate(next: CreativeStep) {
    setStep(next);
    const params = new URLSearchParams(window.location.search);
    params.set("etapa", next.toLowerCase());
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${params}`,
    );
  }
  function chooseTemplate(item: Template) {
    setTemplateId(item.id);
    if (item.renderer_key === "property-dual-02" && property)
      setSecondaryImageUrl(
        property.development_images[0] ??
          property.images[1] ??
          property.images[0] ??
          "",
      );
    if (item.renderer_key === "property-journey-carousel-01") {
      setFormat("PORTRAIT");
      setCarouselSlide(0);
      setEditorSlide(0);
    }
    navigate("EDITOR");
  }
  async function saveDraft() {
    if (!template || !property) return;
    setSavingDraft(true);
    const result = await apiFetchWithAuth<{ id: string }>(
      "/api/criativos/drafts",
      {
        method: "POST",
        body: JSON.stringify({
          id: draftId || undefined,
          template_id: template.id,
          property_id: property.id,
          format,
          payload: {
            image_url: imageUrl,
            secondary_image_url: secondaryImageUrl,
            carousel_image_urls: isCarousel ? carouselRenderImages : carouselImageUrls,
            carousel_slides: carouselSlides,
            price_mode: priceMode,
            highlight,
            image_label_mode: imageLabelMode,
            cta,
            color_theme: colorTheme,
          },
        }),
      },
    );
    setSavingDraft(false);
    if (!result.ok) return setError(result.error);
    setDraftId(result.data.id);
    const params = new URLSearchParams(window.location.search);
    params.set("rascunho", result.data.id);
    params.set("etapa", "editor");
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${params}`,
    );
    setNotice("Rascunho salvo.");
    window.setTimeout(() => setNotice(null), 2800);
  }
  async function generate() {
    if (
      !template ||
      !property ||
      !imageUrl ||
      (isDual && !secondaryImageUrl) ||
      (isCarousel && carouselRenderImages.length < 1)
    )
      return;
    setGenerating(true);
    setError(null);
    const result = await apiFetchWithAuth<{ url: string }>("/api/criativos", {
      method: "POST",
      body: JSON.stringify({
        template_id: template.id,
        property_id: property.id,
        image_url: imageUrl,
        secondary_image_url: isDual ? secondaryImageUrl : undefined,
        carousel_image_urls: isCarousel ? carouselRenderImages : undefined,
        carousel_slides: isCarousel ? carouselSlides : undefined,
        price_mode: priceMode,
        highlight: isDual || isEditorial || isCarousel ? highlight : undefined,
        color_theme: isEditorial ? colorTheme : undefined,
        format,
        image_label_mode: imageLabelMode,
        cta,
      }),
    });
    setGenerating(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    refresh();
  }

  return (
    <AppShell
      title="Central de Criativos"
      subtitle="Crie materiais profissionais com a sua identidade."
      mainClassName="min-w-0"
    >
      <div className="space-y-5">
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {loading && !data ? <Loading /> : null}
        {data ? (
          <>
            <CreativeHeader
              step={step}
              onNavigate={navigate}
              onSave={() => void saveDraft()}
              canSave={Boolean(template && property)}
              saving={savingDraft}
            />
            {notice ? (
              <div className="fixed right-6 top-6 z-[100] rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white shadow-xl">
                {notice}
              </div>
            ) : null}
            {!data.profile ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Complete o seu perfil de corretor antes de gerar criativos. A
                assinatura precisa do nome, CRECI e nickname.
              </p>
            ) : null}
            {step === "OBJECTIVE" ? (
              <ObjectiveSelection onSelect={() => navigate("TEMPLATE")} />
            ) : step === "TEMPLATE" ? (
              <TemplateSelection
                templates={data.templates}
                selectedId={templateId}
                profile={data.profile}
                property={property ?? data.properties[0] ?? null}
                onBack={() => navigate("OBJECTIVE")}
                onSelect={chooseTemplate}
              />
            ) : (
              <>
                <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(390px,.78fr)]">
                  <div className="space-y-5">
                    <Panel number="1" title="Imóvel e imagens">
                      <button
                        type="button"
                        onClick={() => setPropertyPickerOpen(true)}
                        className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-stone-400"
                      >
                        {property ? (
                          <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                            <Image
                              src={property.images[0]}
                              alt=""
                              fill
                              sizes="96px"
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                            <MagnifyingGlass size={22} />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          {property ? (
                            <>
                              <span className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                                {property.codigo || "Sem código"}
                              </span>
                              <span className="mt-1 block truncate font-bold text-slate-950">
                                {property.display_title || property.titulo}
                              </span>
                              <span className="mt-1 block truncate text-xs text-slate-500">
                                {property.bairro_comercial || property.bairro} |{" "}
                                {property.cidade}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="block font-bold">
                                Selecionar imóvel publicado
                              </span>
                              <span className="mt-1 block text-sm text-slate-500">
                                Busque por título, código ou bairro
                              </span>
                            </>
                          )}
                        </span>
                        <span className="shrink-0 rounded-xl border px-4 py-2 text-sm font-bold">
                          {property ? "Trocar" : "Selecionar"}
                        </span>
                      </button>
                      {property ? (
                        <div className="mt-4 space-y-4">
                          {isCarousel ? (
                            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                              Banco de imagens do carrossel. A imagem usada em cada card é definida logo abaixo, na sequência.
                            </div>
                          ) : null}
                          {isDual ? (
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => setActiveImageSlot("PRIMARY")}
                                className={`rounded-xl border p-3 text-sm font-bold ${activeImageSlot === "PRIMARY" ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200"}`}
                              >
                                Imagem superior
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveImageSlot("SECONDARY")}
                                className={`rounded-xl border p-3 text-sm font-bold ${activeImageSlot === "SECONDARY" ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200"}`}
                              >
                                Imagem inferior
                              </button>
                            </div>
                          ) : null}
                          {!isCarousel ? [
                            {
                              label: "Imagens do imóvel",
                              images: property.images,
                            },
                            ...(isDual || isCarousel
                              ? [
                                  {
                                    label: "Imagens do empreendimento",
                                    images: property.development_images,
                                  },
                                ]
                              : []),
                          ].map((group) =>
                            group.images.length ? (
                              <div key={group.label}>
                                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">
                                  {group.label}
                                </p>
                                <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                                  {group.images.map((url, index) => {
                                    const selected = isCarousel
                                      ? carouselImageUrls.includes(url)
                                      : isDual
                                        ? activeImageSlot === "PRIMARY"
                                          ? imageUrl === url
                                          : secondaryImageUrl === url
                                        : imageUrl === url;
                                    return (
                                      <button
                                        key={`${group.label}-${url}`}
                                        type="button"
                                        onClick={() => {
                                          if (isCarousel) {
                                            setCarouselImageUrls((current) =>
                                              current.includes(url)
                                                ? current.filter(
                                                    (item) => item !== url,
                                                  )
                                                : current.length < 6
                                                  ? [...current, url]
                                                  : current,
                                            );
                                            return;
                                          }
                                          if (
                                            isDual &&
                                            activeImageSlot === "SECONDARY"
                                          )
                                            setSecondaryImageUrl(url);
                                          else setImageUrl(url);
                                        }}
                                        className={`relative aspect-square overflow-hidden rounded-xl border-2 ${selected ? "border-slate-950" : "border-transparent"}`}
                                      >
                                        <Image
                                          src={url}
                                          alt={`Imagem ${index + 1}`}
                                          fill
                                          sizes="130px"
                                          className="object-cover"
                                          unoptimized
                                        />
                                        {selected ? (
                                          <span className="absolute right-1.5 top-1.5 rounded-full bg-slate-950 p-1 text-white">
                                            {isCarousel ? (
                                              carouselImageUrls.indexOf(url) + 1
                                            ) : (
                                              <Check size={12} />
                                            )}
                                          </span>
                                        ) : null}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : null,
                          ) : null}
                          {isCarousel ? (
                            <CarouselSlideEditor
                              slides={carouselSlides}
                              activeSlide={editorSlide}
                              images={[
                                ...new Set([
                                  ...property.images,
                                  ...property.development_images,
                                ]),
                              ]}
                              environments={property.environments}
                              onActiveSlide={(index) => {
                                setEditorSlide(index);
                                setCarouselSlide(index);
                              }}
                              onChange={setCarouselSlides}
                            />
                          ) : null}
                        </div>
                      ) : null}
                    </Panel>
                    {propertyPickerOpen ? (
                      <PropertyPickerModal
                        properties={data.properties}
                        selectedId={propertyId}
                        onClose={() => setPropertyPickerOpen(false)}
                        onSelect={(selected) => {
                          chooseProperty(selected.id);
                          setPropertyPickerOpen(false);
                        }}
                      />
                    ) : null}
                    <Panel number="2" title="Formato e conteúdo">
                      <div className="grid gap-3 sm:grid-cols-3">
                        {(template?.formatos ?? ["PORTRAIT"]).map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setFormat(item)}
                            className={`rounded-xl border p-3 text-xs font-semibold ${format === item ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200"}`}
                          >
                            {CREATIVE_DIMENSIONS[item].label}
                          </button>
                        ))}
                      </div>
                      <div className="mt-5 grid gap-4">
                        <p className="text-sm text-slate-500">
                          Este template utiliza sempre o título completo do
                          imóvel.
                        </p>
                        <label className="grid gap-1.5 text-sm font-semibold">
                          Informação sobre a imagem
                          <select
                            value={imageLabelMode}
                            onChange={(event) =>
                              setImageLabelMode(
                                event.target.value as ImageLabelMode,
                              )
                            }
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal"
                          >
                            <option value="DEVELOPMENT">
                              Nome do empreendimento
                            </option>
                            <option value="LOCATION">
                              Bairro | Cidade / UF
                            </option>
                          </select>
                          <span className="text-xs font-normal text-slate-400">
                            Sem empreendimento vinculado, será usada
                            automaticamente a localização.
                          </span>
                        </label>
                        {isDual ? (
                          <>
                            <label className="grid gap-1.5 text-sm font-semibold">
                              Exibição do preço
                              <select
                                value={priceMode}
                                onChange={(event) =>
                                  setPriceMode(
                                    event.target.value as "PRICE" | "CONSULT",
                                  )
                                }
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal"
                              >
                                <option value="PRICE">Mostrar preço</option>
                                <option value="CONSULT">
                                  Consulte o valor
                                </option>
                              </select>
                            </label>
                            <label className="grid gap-1.5 text-sm font-semibold">
                              <span className="flex justify-between">
                                <span>Tag de destaque</span>
                                <span className="text-xs font-normal text-slate-400">
                                  {highlight.length}/28
                                </span>
                              </span>
                              <input
                                list="creative-highlights"
                                value={highlight}
                                maxLength={28}
                                onChange={(event) =>
                                  setHighlight(event.target.value)
                                }
                                className="rounded-xl border border-slate-200 px-3 py-2.5 font-normal"
                              />
                              <datalist id="creative-highlights">
                                <option value="Oportunidade" />
                                <option value="Imóvel em exposição" />
                                <option value="Exclusividade" />
                                <option value="Minha Casa Minha Vida" />
                              </datalist>
                            </label>
                          </>
                        ) : null}
                        {isEditorial ? (
                          <>
                            <HighlightSearchbox
                              value={highlight}
                              onChange={setHighlight}
                            />
                            <fieldset>
                              <legend className="text-sm font-semibold">
                                Tema de cores
                              </legend>
                              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {(
                                  Object.entries(CREATIVE_DARK_THEMES) as Array<
                                    [
                                      CreativeColorTheme,
                                      (typeof CREATIVE_DARK_THEMES)[CreativeColorTheme],
                                    ]
                                  >
                                ).map(([key, theme]) => (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => setColorTheme(key)}
                                    className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-semibold ${colorTheme === key ? "border-slate-950 ring-1 ring-slate-950" : "border-slate-200"}`}
                                  >
                                    <span
                                      className="h-6 w-6 shrink-0 rounded-full border border-white shadow"
                                      style={{ backgroundColor: theme.color }}
                                    />
                                    {theme.label}
                                  </button>
                                ))}
                              </div>
                            </fieldset>
                          </>
                        ) : null}
                        {isCarousel ? (
                          <>
                            <HighlightSearchbox
                              value={highlight}
                              onChange={setHighlight}
                            />
                            <fieldset>
                              <legend className="text-sm font-semibold">
                                Tema de cores
                              </legend>
                              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {(
                                  Object.entries(CREATIVE_DARK_THEMES) as Array<
                                    [
                                      CreativeColorTheme,
                                      (typeof CREATIVE_DARK_THEMES)[CreativeColorTheme],
                                    ]
                                  >
                                ).map(([key, theme]) => (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => setColorTheme(key)}
                                    className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-semibold ${colorTheme === key ? "border-slate-950 ring-1 ring-slate-950" : "border-slate-200"}`}
                                  >
                                    <span
                                      className="h-6 w-6 shrink-0 rounded-full border border-white shadow"
                                      style={{ backgroundColor: theme.color }}
                                    />
                                    {theme.label}
                                  </button>
                                ))}
                              </div>
                            </fieldset>
                          </>
                        ) : null}
                        {!isEditorial ? (
                          <label className="grid gap-1.5 text-sm font-semibold">
                            Chamada para ação
                            <select
                              value={cta}
                              onChange={(event) => setCta(event.target.value)}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal"
                            >
                              <option>Conheça todos os detalhes</option>
                              <option>Agende uma visita</option>
                              <option>Fale comigo</option>
                              <option>Veja este imóvel</option>
                              <option>Solicite mais informações</option>
                            </select>
                          </label>
                        ) : null}
                      </div>
                    </Panel>
                  </div>
                  <aside className="xl:sticky xl:top-5 xl:self-start">
                    <Panel number="3" title="Preview">
                      {data.profile ? (
                        isCarousel ? (
                          <InstagramCarouselPreview
                            activeSlide={carouselSlide}
                            onActiveSlide={setCarouselSlide}
                          >
                            {carouselSlides.map((_, index) => (
                              <CreativeArtwork
                                key={index}
                                property={property ? { ...property, creative_label: imageLabel(property, imageLabelMode) } : null}
                                profile={data.profile!}
                                imageUrl={imageUrl}
                                secondaryImageUrl={secondaryImageUrl}
                                carouselImageUrls={carouselRenderImages}
                                carouselSlides={carouselSlides}
                                carouselSlide={index}
                                rendererKey={template?.renderer_key}
                                priceMode={priceMode}
                                highlight={highlight}
                                colorTheme={colorTheme}
                                format={format}
                                titleMode="FULL"
                                headline=""
                                supportingText=""
                                cta={cta}
                                templateConfig={template?.config}
                              />
                            ))}
                          </InstagramCarouselPreview>
                        ) : (
                        <PreviewFrame mode={previewMode}>
                          <CreativeArtwork
                            property={
                              property
                                ? {
                                    ...property,
                                    creative_label: imageLabel(
                                      property,
                                      imageLabelMode,
                                    ),
                                  }
                                : null
                            }
                            profile={data.profile}
                            imageUrl={imageUrl}
                            secondaryImageUrl={secondaryImageUrl}
                            carouselImageUrls={carouselRenderImages}
                            carouselSlide={carouselSlide}
                            rendererKey={template?.renderer_key}
                            priceMode={priceMode}
                            highlight={highlight}
                            colorTheme={colorTheme}
                            format={format}
                            titleMode="FULL"
                            headline=""
                            supportingText=""
                            cta={cta}
                            templateConfig={template?.config}
                          />
                        </PreviewFrame>
                        )
                      ) : (
                        <div className="flex min-h-72 items-center justify-center rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">
                          O preview ficará disponível após a conclusão do
                          perfil.
                        </div>
                      )}
                      <button
                        type="button"
                        disabled={
                          !data.profile ||
                          !template ||
                          !property ||
                          !imageUrl ||
                          (isDual && !secondaryImageUrl) ||
                          (isCarousel && carouselRenderImages.length < 1) ||
                          ((isDual || isEditorial) && !highlight.trim()) ||
                          !cta ||
                          generating
                        }
                        onClick={() => void generate()}
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary-scarlet)] px-5 py-3.5 font-bold text-white disabled:opacity-40"
                      >
                        {generating ? (
                          <>
                            <ArrowClockwise className="animate-spin" />
                            Gerando...
                          </>
                        ) : (
                          <>
                            <Sparkle />
                            Gerar criativo
                          </>
                        )}
                      </button>
                      <p className="mt-3 text-center text-xs text-slate-400">
                        A moldura e os controles sociais não entram no PNG.
                      </p>
                    </Panel>
                  </aside>
                </div>
                <History posts={data.posts} />
              </>
            )}
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function CreativeHeader({
  step,
  onNavigate,
  onSave,
  canSave,
  saving,
}: {
  step: CreativeStep;
  onNavigate: (step: CreativeStep) => void;
  onSave: () => void;
  canSave: boolean;
  saving: boolean;
}) {
  const entries: Array<[CreativeStep, string]> = [
    ["OBJECTIVE", "Objetivo"],
    ["TEMPLATE", "Modelo"],
    ["EDITOR", "Criativo"],
  ];
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() =>
            onNavigate(step === "EDITOR" ? "TEMPLATE" : "OBJECTIVE")
          }
          disabled={step === "OBJECTIVE"}
          aria-label="Voltar"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 disabled:opacity-30"
        >
          <ArrowLeft size={21} />
        </button>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-stone-500">
            Central de Criativos
          </p>
          <nav aria-label="Etapas" className="mt-1 flex items-center gap-2">
            {entries.map(([key, label], index) => (
              <span key={key} className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={
                    (key === "TEMPLATE" && step === "OBJECTIVE") ||
                    (key === "EDITOR" && step !== "EDITOR")
                  }
                  onClick={() => onNavigate(key)}
                  className={`${step === key ? "font-bold text-slate-950" : "text-slate-400"}`}
                >
                  {label}
                </button>
                {index < entries.length - 1 ? (
                  <span className="text-slate-300">›</span>
                ) : null}
              </span>
            ))}
          </nav>
        </div>
      </div>
      {step === "EDITOR" ? (
        <button
          type="button"
          disabled={!canSave || saving}
          onClick={onSave}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 font-bold disabled:opacity-40"
        >
          <FloppyDisk size={19} />
          {saving ? "Salvando..." : "Salvar rascunho"}
        </button>
      ) : null}
    </header>
  );
}

function ObjectiveSelection({ onSelect }: { onSelect: () => void }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-stone-500">
        Passo 1 de 3
      </p>
      <h2 className="mt-3 text-3xl font-normal text-slate-950">
        O que você quer promover?
      </h2>
      <p className="mt-2 text-slate-500">
        Escolha o objetivo para ver os modelos disponíveis.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <button
          type="button"
          onClick={onSelect}
          className="group flex min-h-52 flex-col justify-between rounded-3xl border-2 border-slate-950 bg-slate-950 p-6 text-left text-white transition hover:-translate-y-1 hover:shadow-xl"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <House size={28} />
          </span>
          <span>
            <strong className="block text-2xl">Promover um imóvel</strong>
            <span className="mt-2 block text-sm text-white/65">
              Crie peças para feed, stories e status.
            </span>
          </span>
        </button>
        {[
          "Promover empreendimento",
          "Promover artigo",
          "Promover página de captura",
          "Promover perfil",
        ].map((label) => (
          <div
            key={label}
            className="flex min-h-52 flex-col justify-between rounded-3xl border border-dashed border-slate-200 p-6 text-slate-400"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
              <Sparkle size={26} />
            </span>
            <span>
              <strong className="block text-xl">{label}</strong>
              <span className="mt-2 block text-sm">Em breve</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function TemplateSelection({
  templates,
  selectedId,
  profile,
  property,
  onBack,
  onSelect,
}: {
  templates: Template[];
  selectedId: string;
  profile: Profile | null;
  property: Property | null;
  onBack: () => void;
  onSelect: (template: Template) => void;
}) {
  const [focusedId, setFocusedId] = useState(
    selectedId || templates[0]?.id || "",
  );
  const focused =
    templates.find((item) => item.id === focusedId) ?? templates[0];
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-stone-500">
            Passo 2 de 3
          </p>
          <h2 className="mt-3 text-3xl font-normal">Escolha o modelo</h2>
          <p className="mt-2 text-slate-500">
            Selecione um modelo para visualizar sua composição real.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border px-4 py-2 text-sm font-bold"
        >
          Trocar objetivo
        </button>
      </div>
      <div className="mt-8 grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-wrap items-start gap-5">
          {templates.map((item) => (
            <article
              key={item.id}
              onMouseEnter={() => setFocusedId(item.id)}
              className={`group min-w-[230px] flex-1 basis-[250px] self-start rounded-2xl bg-white p-2 text-left shadow-[0_5px_22px_rgba(15,23,42,0.07)] ring-1 transition hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(15,23,42,0.12)] sm:max-w-[310px] ${focused?.id === item.id ? "ring-2 ring-slate-950" : "ring-slate-200"}`}
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-stone-100">
                <TemplateArtwork
                  template={item}
                  profile={profile}
                  property={property}
                  format="PORTRAIT"
                  savedUrl={item.preview_url}
                />
                {focused?.id === item.id ? (
                  <span className="absolute right-3 top-3 rounded-full bg-slate-950 p-2 text-white shadow">
                    <Check size={16} />
                  </span>
                ) : null}
              </div>
              <div className="px-2 pb-2 pt-4">
                <p className="font-bold">{item.nome}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">
                    {item.renderer_key === "property-journey-carousel-01"
                      ? "8 slides"
                      : item.renderer_key === "property-dual-02"
                        ? "2 imagens"
                        : "1 imagem"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">
                    Personalizável
                  </span>
                </div>
                <p className="mt-4 text-[10px] font-bold uppercase tracking-[.16em] text-stone-500">
                  Formatos disponíveis
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.formatos.map((format) => (
                    <span
                      key={format}
                      className="rounded-full border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600"
                    >
                      {format === "SQUARE"
                        ? "1:1"
                        : format === "PORTRAIT"
                          ? "4:5"
                          : format === "VERTICAL"
                            ? "9:16"
                            : "16:9"}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onFocus={() => setFocusedId(item.id)}
                  onClick={() => onSelect(item)}
                  className="mt-4 w-full rounded-xl bg-slate-950 px-4 py-2.5 text-center text-sm font-bold text-white"
                >
                  Usar modelo
                </button>
              </div>
            </article>
          ))}
        </div>
        <aside className="hidden xl:block xl:border-l xl:border-slate-200 xl:pl-8">
          <div className="sticky top-5">
            {focused ? (
              <PreviewFrame
                mode={
                  focused.formatos.includes("VERTICAL")
                    ? "STORY_STATUS"
                    : "INSTAGRAM_FEED"
                }
              >
                <TemplateArtwork
                  template={focused}
                  profile={profile}
                  property={property}
                  format={
                    focused.formatos.includes("VERTICAL")
                      ? "VERTICAL"
                      : "PORTRAIT"
                  }
                  savedUrl={
                    focused.formatos.includes("VERTICAL")
                      ? focused.preview_vertical_url
                      : focused.preview_url
                  }
                />
              </PreviewFrame>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
}

const DEMO_PROFILE: Profile = {
  nickname: "seuperfil",
  primeiro_nome: "Marina",
  sobrenome: "Oliveira",
  avatar_url: null,
  logo_nickname_url: null,
  logo_nickname_white_url: null,
  creci_uf: "SP",
  creci_numero: "123456",
  frase_impacto: "Conecto pessoas a imóveis que fazem sentido para suas histórias.",
  authority_numbers: [
    { valor: "12 anos", rotulo: "de mercado", ordem: 0 },
    { valor: "+180", rotulo: "negócios realizados", ordem: 1 },
    { valor: "4,9", rotulo: "avaliação dos clientes", ordem: 2 },
  ],
};

function CarouselSlideEditor({
  slides,
  activeSlide,
  images,
  environments,
  onActiveSlide,
  onChange,
}: {
  slides: CarouselSlideConfig[];
  activeSlide: number;
  images: string[];
  environments: Property["environments"];
  onActiveSlide: (index: number) => void;
  onChange: (slides: CarouselSlideConfig[]) => void;
}) {
  const update = (index: number, patch: Partial<CarouselSlideConfig>) =>
    onChange(slides.map((slide, position) => position === index ? { ...slide, ...patch } : slide));
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (index === 1 || target === 1 || target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    onActiveSlide(target);
  };
  return (
    <div className="space-y-2 border-t border-slate-200 pt-5">
      <div>
        <p className="font-bold">Sequência do carrossel</p>
        <p className="text-xs text-slate-500">Abra cada card para controlar sua imagem e seus textos.</p>
      </div>
      {slides.map((slide, index) => {
        const open = activeSlide === index;
        const fixedPropertySlide = index === 1;
        return (
          <section key={index} className={`overflow-hidden rounded-xl border ${open ? "border-slate-950 ring-1 ring-slate-950" : "border-slate-200"}`}>
            <button type="button" onClick={() => onActiveSlide(index)} className="flex w-full items-center gap-3 p-3 text-left">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-xs font-bold text-white">{index + 1}</span>
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {fixedPropertySlide && images[0] ? <Image src={images[0]} alt="" fill sizes="48px" className="object-cover" unoptimized /> : slide.imageUrl ? <Image src={slide.imageUrl} alt="" fill sizes="48px" className="object-cover" unoptimized /> : null}
              </span>
              <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{slide.eyebrow || `Slide ${index + 1}`}</strong><small className="block truncate text-slate-500">{slide.title || "Conteúdo automático do imóvel"}</small></span>
              <span className="text-slate-400">{open ? "−" : "+"}</span>
            </button>
            {open ? (
              <div className="space-y-4 border-t border-slate-100 bg-slate-50/60 p-4">
                {fixedPropertySlide ? (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
                    <p className="font-bold">Slide automático do imóvel</p>
                    <p className="mt-1 leading-relaxed text-blue-900/75">
                      Usa a mesma imagem da capa e apresenta automaticamente o título, a área útil, os dormitórios, as suítes e as vagas cadastradas no imóvel.
                    </p>
                  </div>
                ) : null}
                {!fixedPropertySlide ? (
                  <>
                <div className="flex justify-end gap-2">
                  <button type="button" disabled={index === 0 || index - 1 === 1} onClick={() => move(index, -1)} className="rounded-lg border bg-white px-3 py-1.5 text-xs font-bold disabled:opacity-30">↑ Mover</button>
                  <button type="button" disabled={index === slides.length - 1 || index + 1 === 1} onClick={() => move(index, 1)} className="rounded-lg border bg-white px-3 py-1.5 text-xs font-bold disabled:opacity-30">↓ Mover</button>
                </div>
                {slide.kind !== "CONTACT" ? <div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">Imagem deste slide</p><div className="grid grid-cols-5 gap-2">{images.map((url) => <button key={url} type="button" onClick={() => update(index, { imageUrl: url })} className={`relative aspect-square overflow-hidden rounded-lg border-2 ${slide.imageUrl === url ? "border-slate-950" : "border-transparent"}`}><Image src={url} alt="" fill sizes="80px" className="object-cover" unoptimized />{slide.imageUrl === url ? <span className="absolute right-1 top-1 rounded-full bg-slate-950 p-1 text-white"><Check size={10} /></span> : null}</button>)}</div></div> : null}
                {slide.kind === "ENVIRONMENT" && environments.length ? (
                  <label className="grid gap-1 text-xs font-bold">Ambiente do imóvel<select value={slide.environmentId ?? ""} onChange={(event) => {
                    const environment = environments.find((item) => item.id === event.target.value);
                    update(index, environment ? { environmentId: environment.id, title: environment.title, text: [environment.area, environment.subtitle, ...environment.tags].filter(Boolean).slice(0, 4).join(" · ") } : { environmentId: undefined });
                  }} className="rounded-lg border bg-white px-3 py-2 text-sm font-normal"><option value="">Personalizado</option>{environments.map((environment) => <option key={environment.id} value={environment.id}>{environment.title}</option>)}</select></label>
                ) : null}
                {slide.kind === "FEATURES" ? (
                  <fieldset className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <legend className="text-xs font-bold">Atributos em destaque</legend>
                      <span className="text-xs text-slate-400">{(slide.attributes ?? []).length}/6</span>
                    </div>
                    {(slide.attributes ?? []).map((attribute, attributeIndex) => (
                      <div key={attributeIndex} className="flex gap-2">
                        <input
                          value={attribute}
                          maxLength={40}
                          aria-label={`Atributo ${attributeIndex + 1}`}
                          onChange={(event) =>
                            update(index, {
                              attributes: (slide.attributes ?? []).map((item, position) =>
                                position === attributeIndex ? event.target.value : item,
                              ),
                            })
                          }
                          className="min-w-0 flex-1 rounded-lg border bg-white px-3 py-2 text-sm font-normal"
                        />
                        <button
                          type="button"
                          aria-label={`Remover atributo ${attributeIndex + 1}`}
                          onClick={() =>
                            update(index, {
                              attributes: (slide.attributes ?? []).filter((_, position) => position !== attributeIndex),
                            })
                          }
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-white text-slate-500 hover:text-red-600"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    {(slide.attributes ?? []).length < 6 ? (
                      <button
                        type="button"
                        onClick={() => update(index, { attributes: [...(slide.attributes ?? []), ""] })}
                        className="rounded-lg border border-dashed bg-white px-3 py-2 text-xs font-bold"
                      >
                        + Adicionar atributo
                      </button>
                    ) : null}
                    <p className="text-xs font-normal text-slate-500">
                      Até seis atributos, com 40 caracteres cada.
                    </p>
                  </fieldset>
                ) : null}
                <label className="grid gap-1 text-xs font-bold">Identificação do slide<input value={slide.eyebrow} maxLength={40} onChange={(event) => update(index, { eyebrow: event.target.value })} className="rounded-lg border bg-white px-3 py-2 text-sm font-normal" /></label>
                <label className="grid gap-1 text-xs font-bold">Título<input value={slide.title} maxLength={120} placeholder="Usar conteúdo automático" onChange={(event) => update(index, { title: event.target.value })} className="rounded-lg border bg-white px-3 py-2 text-sm font-normal" /></label>
                <label className="grid gap-1 text-xs font-bold">Texto de apoio<textarea value={slide.text} maxLength={180} rows={3} onChange={(event) => update(index, { text: event.target.value })} className="resize-none rounded-lg border bg-white px-3 py-2 text-sm font-normal" /></label>
                  </>
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
function TemplateArtwork({
  template,
  profile,
  property,
  format,
  savedUrl,
}: {
  template: Template;
  profile: Profile | null;
  property: Property | null;
  format: CreativeFormat;
  savedUrl: string | null;
}) {
  if (savedUrl)
    return (
      <div className="relative h-full w-full">
        <Image
          src={savedUrl}
          alt={`Preview de ${template.nome}`}
          fill
          sizes="430px"
          className="object-cover"
          unoptimized
        />
      </div>
    );
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const first =
    property?.images[0] ?? `${origin}/images/corretor-one-criar-conta-1x1.jpeg`;
  const second =
    property?.development_images[0] ??
    property?.images[1] ??
    "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=1800&q=88";
  return (
    <CreativeArtwork
      property={property}
      profile={profile ?? DEMO_PROFILE}
      imageUrl={first}
      secondaryImageUrl={second}
      carouselImageUrls={[
        first,
        second,
        ...(property?.images.slice(1, 5) ?? []),
      ]
        .filter((url, index, values) => values.indexOf(url) === index)
        .slice(0, 6)}
      carouselSlides={createCarouselSlides(
        [first, second],
        property?.environments ?? [],
        property?.caracteristicas ?? [],
      )}
      carouselSlide={0}
      rendererKey={template.renderer_key}
      priceMode="PRICE"
      highlight="Exclusividade"
      colorTheme="PETROL"
      format={format}
      titleMode="FULL"
      headline=""
      supportingText=""
      cta="Conheça os detalhes"
      templateConfig={template.config}
    />
  );
}
function Panel({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-sm font-bold text-[var(--grey-olive)]">
          {number}
        </span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}
const HIGHLIGHT_OPTIONS = [
  "Oportunidade",
  "Imóvel em exposição",
  "Exclusividade",
  "Minha Casa Minha Vida",
];
function HighlightSearchbox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const term = normalizeSearch(value);
  const options = HIGHLIGHT_OPTIONS.filter(
    (item) => !term || normalizeSearch(item).includes(term),
  );
  return (
    <label className="relative grid gap-1.5 text-sm font-semibold">
      <span className="flex justify-between">
        <span>Label de destaque</span>
        <span className="text-xs font-normal text-slate-400">
          {value.length}/28
        </span>
      </span>
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls="highlight-options"
        autoComplete="off"
        value={value}
        maxLength={28}
        placeholder="Pesquise ou escreva uma label"
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        className="rounded-xl border border-slate-200 px-3 py-2.5 font-normal"
      />
      {open && options.length ? (
        <div
          id="highlight-options"
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
        >
          {options.map((item) => (
            <button
              key={item}
              type="button"
              role="option"
              aria-selected={item === value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(item);
                setOpen(false);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm font-normal hover:bg-slate-100"
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}
    </label>
  );
}
function Field({
  label,
  value,
  max,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  max: number;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  const classes = "rounded-xl border border-slate-200 px-3 py-2.5 font-normal";
  return (
    <label className="grid gap-1.5 text-sm font-semibold">
      <span className="flex justify-between">
        <span>{label}</span>
        <span className="text-xs font-normal text-slate-400">
          {value.length}/{max}
        </span>
      </span>
      {multiline ? (
        <textarea
          value={value}
          maxLength={max}
          onChange={(event) => onChange(event.target.value)}
          className={`${classes} min-h-20`}
        />
      ) : (
        <input
          value={value}
          maxLength={max}
          onChange={(event) => onChange(event.target.value)}
          className={classes}
        />
      )}
    </label>
  );
}
function Loading() {
  return (
    <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">
      <ArrowClockwise className="mr-2 animate-spin" />
      Carregando...
    </div>
  );
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
function PropertyPickerModal({
  properties,
  selectedId,
  onSelect,
  onClose,
}: {
  properties: Property[];
  selectedId: string;
  onSelect: (property: Property) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const term = normalizeSearch(query);
    if (!term) return properties.slice(0, 60);
    return properties
      .filter((property) =>
        normalizeSearch(
          [
            property.codigo,
            property.titulo,
            property.display_title,
            property.bairro_comercial,
            property.bairro,
            property.cidade,
          ]
            .filter(Boolean)
            .join(" "),
        ).includes(term),
      )
      .slice(0, 60);
  }, [properties, query]);
  useEffect(() => {
    function close(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="property-picker-title"
        className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <h3
              id="property-picker-title"
              className="text-3xl font-normal text-slate-950"
            >
              Selecionar imóvel
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Busque por título, código, bairro ou cidade.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar seleção"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border"
          >
            <X size={21} />
          </button>
        </header>
        <div className="border-b border-slate-200 p-6">
          <label className="relative block">
            <MagnifyingGlass
              size={19}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Título, código ou bairro"
              className="w-full rounded-xl border border-slate-200 py-3 pl-12 pr-4"
            />
          </label>
        </div>
        <div className="max-h-[58vh] overflow-y-auto p-4">
          {filtered.length ? (
            <div className="grid gap-3">
              {filtered.map((property) => (
                <button
                  key={property.id}
                  type="button"
                  onClick={() => onSelect(property)}
                  className={`flex w-full gap-4 rounded-2xl border p-3 text-left transition hover:border-stone-400 hover:bg-stone-50 ${selectedId === property.id ? "border-stone-500 bg-stone-50" : "border-slate-200"}`}
                >
                  <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                    <Image
                      src={property.images[0]}
                      alt=""
                      fill
                      sizes="128px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <span className="min-w-0 flex-1 py-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <b className="text-xs uppercase tracking-wider text-stone-600">
                        {property.codigo || "Sem código"}
                      </b>
                      {selectedId === property.id ? (
                        <span className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-bold text-white">
                          Selecionado
                        </span>
                      ) : null}
                    </span>
                    <strong className="mt-2 block text-base text-slate-950">
                      {property.display_title || property.titulo}
                    </strong>
                    <span className="mt-2 block text-sm text-slate-500">
                      {property.bairro_comercial || property.bairro} |{" "}
                      {property.cidade} / {property.estado}
                    </span>
                    <span className="mt-2 block text-xs font-semibold text-slate-600">
                      {[
                        property.area_util ? `${property.area_util} m²` : null,
                        property.dormitorios
                          ? `${property.dormitorios} dorm.`
                          : null,
                        property.vagas ? `${property.vagas} vagas` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-slate-500">
              Nenhum imóvel encontrado para esta busca.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreativeArtwork({
  property,
  profile,
  imageUrl,
  secondaryImageUrl,
  carouselImageUrls = [],
  carouselSlides = [],
  carouselSlide = 0,
  rendererKey,
  priceMode,
  highlight,
  colorTheme,
  format,
  titleMode,
  headline,
  supportingText,
  cta,
  templateConfig,
}: {
  property: Property | null;
  profile: Profile;
  imageUrl: string;
  secondaryImageUrl: string;
  carouselImageUrls?: string[];
  carouselSlides?: CarouselSlideConfig[];
  carouselSlide?: number;
  rendererKey?: string;
  priceMode: "PRICE" | "CONSULT";
  highlight: string;
  colorTheme: CreativeColorTheme;
  format: CreativeFormat;
  titleMode: TitleMode;
  headline: string;
  supportingText: string;
  cta: string;
  templateConfig?: CreativeTemplateConfig | null;
}) {
  const title = property
    ? titleMode === "SHORT"
      ? property.short_title
      : property.display_title
    : "Título do imóvel";
  const showSupportingCopy = format === "VERTICAL" || titleMode === "SHORT";
  const stats = [
    {
      kind: "AREA" as const,
      value:
        Number(property?.area_util) > 0 ? String(property?.area_util) : "—",
      label: "m² úteis",
    },
    {
      kind: "BED" as const,
      value:
        Number(property?.dormitorios) > 0 ? String(property?.dormitorios) : "—",
      label: "Dormitórios",
    },
    {
      kind: "SUITE" as const,
      value: Number(property?.suites) > 0 ? String(property?.suites) : "—",
      label: "Suítes",
    },
    {
      kind: "CAR" as const,
      value: Number(property?.vagas) > 0 ? String(property?.vagas) : "—",
      label: "Vagas",
    },
  ];
  const payload: PropertyCreativePayload = {
    property: {
      id: property?.id ?? "preview",
      title,
      location: location(property),
      price: priceMode === "CONSULT" ? "Consulte o valor" : price(property),
      code: property?.codigo ?? "",
      imageUrl,
      secondaryImageUrl,
      carouselImages: carouselImageUrls,
      carouselSlides,
      features: property?.caracteristicas ?? undefined,
      highlight,
      stats,
    },
    broker: {
      name: [profile.primeiro_nome, profile.sobrenome]
        .filter(Boolean)
        .join(" "),
      nickname: profile.nickname,
      creci: [
        profile.creci_uf,
        profile.creci_numero ? profile.creci_numero + "-F" : "",
      ]
        .filter(Boolean)
        .join(" "),
      avatarUrl: profile.avatar_url,
      logoUrl: profile.logo_nickname_url,
      logoWhiteUrl: profile.logo_nickname_white_url,
      tagline: profile.frase_impacto,
      authorityNumbers: (profile.authority_numbers ?? []).slice(0, 3).map((item) => ({
        value: item.valor,
        label: item.rotulo,
      })),
    },
    copy: {
      headline: showSupportingCopy ? headline : "",
      supportingText: showSupportingCopy ? supportingText : "",
      cta,
      titleMode,
    },
    format,
    carouselSlide,
    colorTheme,
    templateConfig: templateConfig ?? undefined,
  };
  return (
    <ExactHtmlPreview
      html={
        rendererKey === "property-dual-02"
          ? buildPropertyDualHtml(payload)
          : rendererKey === "property-editorial-03"
            ? buildPropertyEditorialHtml(payload)
            : rendererKey === "property-journey-carousel-01"
              ? buildPropertyJourneyHtml(payload)
              : buildPropertyEssentialHtml(payload)
      }
      format={format}
    />
  );
}
function ExactHtmlPreview({
  html,
  format,
}: {
  html: string;
  format: CreativeFormat;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const dimensions = CREATIVE_DIMENSIONS[format];
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const update = () => setScale(wrapper.clientWidth / dimensions.width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [dimensions.width]);
  return (
    <div
      ref={wrapperRef}
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: `${dimensions.width}/${dimensions.height}` }}
    >
      <iframe
        title="Prévia exata do criativo"
        srcDoc={html}
        className="pointer-events-none absolute left-0 top-0 border-0"
        style={{
          width: dimensions.width,
          height: dimensions.height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      />
    </div>
  );
}
function StandardArtwork({
  property,
  profile,
  imageUrl,
  format,
  titleMode,
  title,
  headline,
  supportingText,
  cta,
}: {
  property: Property | null;
  profile: Profile;
  imageUrl: string;
  format: Exclude<CreativeFormat, "VERTICAL">;
  titleMode: TitleMode;
  title: string;
  headline: string;
  supportingText: string;
  cta: string;
}) {
  const showCopy = titleMode === "SHORT";
  const ratio = format === "SQUARE" ? "aspect-square" : "aspect-[4/5]";
  return (
    <div
      className={`relative w-full overflow-hidden bg-[#f7f5ef] text-slate-950 ${ratio}`}
    >
      <div className="relative h-[60%]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="430px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-200">
            <ImageSquare size={38} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent via-45% to-slate-950/80" />
        <header className="absolute inset-x-[5%] top-[7%] flex items-center justify-between text-white">
          <BrokerIdentity profile={profile} inverse />
          {profile.logo_nickname_white_url ? (
            <Image
              src={profile.logo_nickname_white_url}
              alt={`corretor.one/${profile.nickname}`}
              width={105}
              height={34}
              className="h-7 w-auto object-contain"
              unoptimized
            />
          ) : (
            <p className="text-[9px] font-bold text-white">
              corretor.one/{profile.nickname}
            </p>
          )}
        </header>
        <div className="absolute inset-x-[5%] bottom-[7%] flex items-center justify-between gap-3 text-[8px] font-bold text-white">
          <p>{location(property)}</p>
          <p className="shrink-0">{property?.codigo || ""}</p>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 top-[60%] flex flex-col px-[5%] py-[4%]">
        <h3
          className={`${titleMode === "FULL" ? (format === "SQUARE" ? "line-clamp-2 text-[clamp(10px,2.1vw,15px)]" : "line-clamp-3 text-[clamp(11px,2.5vw,17px)]") : format === "SQUARE" ? "line-clamp-2 text-[clamp(11px,2.45vw,17px)]" : "line-clamp-3 text-[clamp(12px,3vw,21px)]"} font-normal leading-[1.08] tracking-tight`}
        >
          {title}
        </h3>
        {showCopy && headline ? (
          <p className="mt-1.5 truncate whitespace-nowrap text-[9px] font-semibold text-slate-600">
            {headline}
          </p>
        ) : null}
        {showCopy && supportingText ? (
          <p className="mt-1 truncate whitespace-nowrap text-[7px] text-slate-500">
            {supportingText}
          </p>
        ) : null}
        <Stats property={property} />
        <div className="mt-auto flex items-end justify-between pt-2">
          <p className="text-[12px] font-bold">{price(property)}</p>
          <p className="text-right text-[7px] font-bold text-[var(--grey-olive)]">
            {cta}
          </p>
        </div>
      </div>
    </div>
  );
}
function VerticalArtwork({
  property,
  profile,
  imageUrl,
  title,
  headline,
  supportingText,
  cta,
}: {
  property: Property | null;
  profile: Profile;
  imageUrl: string;
  title: string;
  headline: string;
  supportingText: string;
  cta: string;
}) {
  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden bg-[#f7f5ef] text-slate-950">
      <div className="relative h-[60%]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="430px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-300">
            <ImageSquare size={38} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-transparent via-45% to-slate-950/80" />
        <header className="absolute inset-x-[6%] top-[11%] flex items-center justify-between text-white">
          <BrokerIdentity profile={profile} inverse />
          {profile.logo_nickname_white_url ? (
            <Image
              src={profile.logo_nickname_white_url}
              alt={`corretor.one/${profile.nickname}`}
              width={105}
              height={34}
              className="h-7 w-auto object-contain"
              unoptimized
            />
          ) : (
            <p className="text-[9px] font-bold text-white">
              corretor.one/{profile.nickname}
            </p>
          )}
        </header>
        <div className="absolute inset-x-[6%] bottom-[6%] flex items-center justify-between gap-3 text-[8px] font-bold text-white">
          <p>{location(property)}</p>
          <p className="shrink-0">{property?.codigo || ""}</p>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 top-[60%] flex flex-col px-[6%] pb-[16%] pt-[4%]">
        <h3 className="line-clamp-3 text-[16px] font-semibold leading-[1.06] tracking-tight">
          {title}
        </h3>
        {headline ? (
          <p className="mt-1 line-clamp-1 text-[8px] font-semibold text-slate-600">
            {headline}
          </p>
        ) : null}
        {supportingText ? (
          <p className="mt-0.5 line-clamp-1 text-[6px] text-slate-500">
            {supportingText}
          </p>
        ) : null}
        <Stats property={property} vertical />
        <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-2">
          <p className="text-[12px] font-bold">{price(property)}</p>
          <p className="rounded-full bg-slate-950 px-3 py-2 text-center text-[7px] font-bold text-white">
            {cta}
          </p>
        </div>
      </div>
    </div>
  );
}
function BrokerIdentity({
  profile,
  inverse = false,
}: {
  profile: Profile;
  inverse?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {profile.avatar_url ? (
        <Image
          src={profile.avatar_url}
          alt=""
          width={34}
          height={34}
          className={`h-8 w-8 rounded-full object-cover ${inverse ? "border border-white/80" : ""}`}
          unoptimized
        />
      ) : (
        <UserCircle size={32} />
      )}
      <div className="min-w-0">
        <p className="truncate text-[8px] font-bold">
          {profile.primeiro_nome} {profile.sobrenome}
        </p>
        <p
          className={`text-[6px] ${inverse ? "text-white/80" : "text-slate-500"}`}
        >
          {profile.creci_uf} {profile.creci_numero}-F
        </p>
      </div>
    </div>
  );
}
function Stats({
  property,
  vertical = false,
}: {
  property: Property | null;
  vertical?: boolean;
}) {
  const items = [
    [property?.area_util, "m² úteis", Ruler],
    [property?.dormitorios, "Dorm.", Bed],
    [property?.suites, "Suítes", House],
    [property?.vagas, "Vagas", Car],
  ] as const;
  return (
    <div
      className={`${vertical ? "mt-2" : "mt-3"} grid w-full grid-cols-4 border-y border-stone-300 py-2`}
    >
      {items.map(([value, label, Icon]) => (
        <span
          key={label}
          className="flex items-center justify-center gap-1 border-r border-stone-300 text-[6px] text-slate-600 last:border-r-0"
        >
          <Icon size={12} className="shrink-0 text-[var(--grey-olive)]" />
          <span>
            <b className="block leading-none">
              {Number(value) > 0 ? value : "—"}
            </b>
            {label}
          </span>
        </span>
      ))}
    </div>
  );
}
function location(property: Property | null) {
  return property
    ? property.creative_label ||
        [
          property.bairro_comercial || property.bairro,
          `${property.cidade} / ${property.estado}`,
        ]
          .filter(Boolean)
          .join(" | ")
    : "Localização";
}
function imageLabel(property: Property, mode: ImageLabelMode) {
  return mode === "DEVELOPMENT" && property.empreendimento?.nome
    ? property.empreendimento.nome
    : location(property);
}
function price(property: Property | null) {
  return property
    ? money(
        property.finalidade === "ALUGAR"
          ? property.preco_locacao
          : property.preco_venda,
      )
    : "Consulte o valor";
}

function InstagramCarouselPreview({ activeSlide, onActiveSlide, children }: { activeSlide: number; onActiveSlide: (index: number) => void; children: React.ReactNode[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; scrollLeft: number } | null>(null);
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: activeSlide * track.clientWidth, behavior: "auto" });
  }, [activeSlide]);
  return (
    <PreviewFrame mode="INSTAGRAM_FEED">
      <div className="relative">
        <div ref={trackRef} onWheel={(event) => {
          if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
          event.preventDefault();
          event.currentTarget.scrollLeft += event.deltaY;
        }} onPointerDown={(event) => {
          dragRef.current = { pointerId: event.pointerId, startX: event.clientX, scrollLeft: event.currentTarget.scrollLeft };
          event.currentTarget.setPointerCapture(event.pointerId);
        }} onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          event.currentTarget.scrollLeft = drag.scrollLeft - (event.clientX - drag.startX);
        }} onPointerUp={(event) => {
          dragRef.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }} onPointerCancel={() => { dragRef.current = null; }} onScroll={(event) => {
          const element = event.currentTarget;
          const next = Math.round(element.scrollLeft / Math.max(1, element.clientWidth));
          if (next !== activeSlide) onActiveSlide(next);
        }} className="flex cursor-grab snap-x snap-mandatory overflow-x-auto overscroll-x-contain active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ touchAction: "pan-x" }}>
          {children.map((child, index) => <div key={index} className="pointer-events-none min-w-full snap-center select-none">{child}</div>)}
        </div>
        <span className="absolute right-2 top-2 z-20 rounded-full bg-black/65 px-2 py-1 text-[7px] font-bold text-white">{activeSlide + 1}/{children.length}</span>
      </div>
      <div className="flex justify-center gap-1 py-2">
        {children.map((_, index) => <button key={index} type="button" onClick={() => onActiveSlide(index)} aria-label={`Ir para o slide ${index + 1}`} className={`h-1.5 rounded-full transition-all ${activeSlide === index ? "w-4 bg-blue-500" : "w-1.5 bg-slate-300"}`} />)}
      </div>
    </PreviewFrame>
  );
}

function PreviewFrame({
  mode,
  children,
}: {
  mode: PreviewMode;
  children: React.ReactNode;
}) {
  const story = mode === "STORY_STATUS";
  return (
    <div className="mx-auto max-w-[330px] rounded-[42px] border-[9px] border-slate-950 bg-slate-950 p-1 shadow-2xl">
      <div
        className={`relative overflow-hidden rounded-[30px] bg-white ${story ? "aspect-[9/19.5]" : "min-h-[600px]"}`}
      >
        <div className="flex h-7 items-center justify-between px-5 text-[8px] font-bold">
          <span>9:41</span>
          <span>●●●</span>
        </div>
        {!story ? (
          <>
            <div className="flex items-center gap-2 border-y border-slate-100 px-3 py-2">
              <span className="h-6 w-6 rounded-full bg-slate-300" />
              <span className="text-[8px] font-bold">seu perfil</span>
            </div>
            {children}
            <div className="flex items-center justify-between p-3">
              <span className="flex gap-3">
                <Heart size={18} />
                <ChatCircle size={18} />
                <PaperPlaneTilt size={18} />
              </span>
              <BookmarkSimple size={18} />
            </div>
            <p className="px-3 pb-4 text-[8px]">
              <b>seu perfil</b> Conheça este imóvel.
            </p>
          </>
        ) : (
          <div className="absolute inset-x-0 bottom-0 top-7 bg-slate-800">
            <div className="absolute inset-0 [&>*]:h-full [&>*]:w-full">
              {children}
            </div>
            <div className="pointer-events-none absolute inset-x-2 top-2 z-20 flex gap-1">
              {[1, 2, 3].map((item) => (
                <span key={item} className="h-0.5 flex-1 bg-white/80" />
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-4 bottom-6 z-20 h-9 rounded-full border border-white/80" />
            <span className="absolute bottom-1 left-0 right-0 z-20 text-center text-[7px] text-white">
              Enviar mensagem
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
function History({ posts }: { posts: Post[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-100 p-5">
        <h2 className="text-lg font-semibold">Criativos gerados</h2>
      </header>
      {posts.length ? (
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {posts.map((post) => (
            <article
              key={post.id}
              className="overflow-hidden rounded-xl border border-slate-200"
            >
              <div className="relative aspect-square bg-slate-100">
                {post.resultado_url ? (
                  <Image
                    src={post.resultado_url}
                    alt="Criativo"
                    fill
                    sizes="300px"
                    className="object-cover"
                    unoptimized
                  />
                ) : null}
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-semibold">
                  {post.payload?.property?.title ?? "Imóvel"}
                </p>
                {post.resultado_url ? (
                  post.resultado_urls?.length ? (
                    <div className="mt-3 grid grid-cols-4 gap-1.5">
                      {post.resultado_urls.map((url, index) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-semibold"
                          title={`Baixar slide ${index + 1}`}
                        >
                          <DownloadSimple /> {index + 1}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <a
                      href={post.resultado_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm"
                    >
                      <DownloadSimple />
                      Baixar PNG
                    </a>
                  )
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="p-10 text-center text-sm text-slate-400">
          Nenhum criativo gerado.
        </p>
      )}
    </section>
  );
}
