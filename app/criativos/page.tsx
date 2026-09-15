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
  Trash,
  UserCircle,
  X,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/app/_components/app-shell";
import { apiFetchWithAuth, getAccessToken } from "@/lib/client/auth-api";
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
  objetivo?: "PROMOVER_IMOVEL" | "PROMOVER_EMPREENDIMENTO";
};
type Property = {
  id: string;
  titulo: string;
  display_title: string;
  short_title: string;
  codigo: string | null;
  finalidade: string;
  tipo: string;
  fase?: string | null;
  bairro_comercial: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  preco_venda: number | null;
  preco_locacao: number | null;
  area_util: number | string | null;
  dormitorios: number | string | null;
  suites: number | string | null;
  vagas: number | string | null;
  caracteristicas: string[] | null;
  characteristic_count?: number;
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
  development_meta?: {
    address: string;
    phase: string;
    totalUnits: string;
    referenceDate: string;
    unitTypes: string;
    bedrooms: string;
    areas: string;
    cityState: string;
    startingPrice: string | null;
  };
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
  subject_id: string;
  template_id: string;
  subject_type?: "PROPERTY" | "DEVELOPMENT" | "PROFILE";
  formato: CreativeFormat;
  status: "GERANDO" | "PRONTO" | "ERRO";
  resultado_url: string | null;
  resultado_urls: string[] | null;
  created_at?: string;
  payload: {
    property?: { title?: string; code?: string };
    development?: { name?: string };
  };
};
type Bootstrap = {
  templates: Template[];
  properties: Property[];
  developments: Property[];
  profile: Profile | null;
  posts: Post[];
};
type CreativeDraft = {
  id: string;
  objetivo?: CreativeObjective;
  template_id: string;
  subject_id: string;
  formato: CreativeFormat;
  updated_at?: string;
  payload: {
    image_url?: string;
    secondary_image_url?: string;
    carousel_image_urls?: string[];
    carousel_slides?: CarouselSlideConfig[];
    price_mode?: "PRICE" | "CONSULT";
    highlight?: string;
    image_label_mode?: ImageLabelMode;
    development_label_mode?: DevelopmentLabelMode;
    development_footer_mode?: DevelopmentFooterMode;
    cta?: string;
    color_theme?: CreativeColorTheme;
  };
};
type PreviewMode = "INSTAGRAM_FEED" | "STORY_STATUS";
type TitleMode = "FULL" | "SHORT";
type ImageLabelMode = "DEVELOPMENT" | "LOCATION";
type DevelopmentLabelMode = "FULL_ADDRESS" | "CITY_STATE" | "PHASE";
type DevelopmentFooterMode = "YEAR" | "STARTING_PRICE" | "CONSULT";
type CreativeStep = "OBJECTIVE" | "TEMPLATE" | "EDITOR";
type CreativeObjective = "PROMOVER_IMOVEL" | "PROMOVER_EMPREENDIMENTO";
type CarouselSlideConfig = {
  kind: "COVER" | "NUMBERS" | "ENVIRONMENT" | "FEATURES" | "LOCATION" | "CONTACT";
  environmentId?: string;
  imageUrl: string;
  eyebrow: string;
  title: string;
  text: string;
  attributes?: string[];
};

const FORMAT_LABELS: Record<CreativeFormat, string> = {
  SQUARE: "Quadrado",
  PORTRAIT: "Retrato",
  VERTICAL: "Stories / Status",
};

const formatLabel = (format: CreativeFormat) => FORMAT_LABELS[format];

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
      title: item.kind === "FEATURES" ? featureHeadline(features.length) : environment?.title || item.title,
      text: environment ? [environment.area, environment.subtitle, ...environment.tags].filter(Boolean).slice(0, 4).join(" · ") : item.text,
      imageUrl: available[Math.min(Math.max(0, index - 1), available.length - 1)],
      attributes: item.kind === "FEATURES" ? features.slice(0, 6) : undefined,
    };
  });
}

function createDevelopmentCarouselSlides(images: string[], meta?: Property["development_meta"], features: string[] = []) {
  const available = images.length ? images : [""];
  const content = [
    ["COVER", "Apresentação", "Um projeto pensado por inteiro.", ""],
    ["NUMBERS", "Visão geral", "", ""],
    ["ENVIRONMENT", "Arquitetura", "Uma identidade para transformar a paisagem.", ""],
    ["ENVIRONMENT", "Tipologias", meta?.unitTypes ?? "Plantas para diferentes formas de viver.", meta?.areas ?? ""],
    ["ENVIRONMENT", "Experiência", "Áreas comuns que ampliam o jeito de morar.", ""],
    ["LOCATION", "Localização", "Tudo o que importa, ao redor.", meta?.address ?? ""],
    ["FEATURES", "Diferenciais", featureHeadline(features.length), ""],
    ["CONTACT", "Contato", "Conheça o empreendimento com acompanhamento especializado.", ""],
  ] as const;
  return content.map(([kind, eyebrow, title, textValue], index) => ({
    kind: kind as CarouselSlideConfig["kind"],
    imageUrl: index === 1 || index === 7 ? "" : available[Math.min(index, available.length - 1)],
    eyebrow,
    title,
    text: textValue,
    attributes: index === 6 ? features.slice(0, 6) : undefined,
  }));
}

function featureHeadline(count: number) {
  if (count <= 0) return "Escolhas que valorizam cada detalhe.";
  if (count <= 5) return `${count} diferenciais para viver melhor.`;
  const threshold = Math.max(5, Math.floor((count - 1) / 5) * 5);
  return `Mais de ${threshold} características ao seu dispor.`;
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
  const [objective, setObjective] = useState<CreativeObjective>("PROMOVER_IMOVEL");
  const [step, setStep] = useState<CreativeStep>("OBJECTIVE");
  const [draftId, setDraftId] = useState("");
  const [drafts, setDrafts] = useState<CreativeDraft[]>([]);
  const [savingDraft, setSavingDraft] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [centralTab, setCentralTab] = useState<"CREATE" | "CREATED">("CREATE");
  const [latestGenerated, setLatestGenerated] = useState<Post | null>(null);
  const [historyTotal, setHistoryTotal] = useState(0);
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
  const [developmentLabelMode, setDevelopmentLabelMode] =
    useState<DevelopmentLabelMode>("FULL_ADDRESS");
  const [developmentFooterMode, setDevelopmentFooterMode] =
    useState<DevelopmentFooterMode>("CONSULT");
  const [generating, setGenerating] = useState(false);
  const [propertyPickerOpen, setPropertyPickerOpen] = useState(false);
  const automaticPickerKey = useRef("");
  function apply(result: Bootstrap) {
    setData(result);
    setHistoryTotal((current) => current || result.posts.length);
  }
  function refresh() {
    apiFetchWithAuth<Bootstrap>("/api/criativos").then((result) =>
      result.ok ? apply(result.data) : setError(result.error),
    );
  }
  function refreshDrafts() {
    apiFetchWithAuth<CreativeDraft[]>("/api/criativos/drafts").then((result) => {
      if (result.ok) setDrafts(result.data ?? []);
    });
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
    refreshDrafts();
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
      const draftObjective = draft.objetivo ?? "PROMOVER_IMOVEL";
      setObjective(draftObjective);
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
          : draftObjective === "PROMOVER_EMPREENDIMENTO"
            ? createDevelopmentCarouselSlides(
                payload.carousel_image_urls ?? [],
                data.developments.find((item) => item.id === draft.subject_id)?.development_meta,
                data.developments.find((item) => item.id === draft.subject_id)?.caracteristicas ?? [],
              )
            : createCarouselSlides(
                payload.carousel_image_urls ?? [],
                data.properties.find((item) => item.id === draft.subject_id)?.environments ?? [],
                data.properties.find((item) => item.id === draft.subject_id)?.caracteristicas ?? [],
              ),
      );
      setPriceMode(payload.price_mode ?? "PRICE");
      setHighlight(payload.highlight ?? "Oportunidade");
      setImageLabelMode(payload.image_label_mode ?? "DEVELOPMENT");
      setDevelopmentLabelMode(payload.development_label_mode ?? "FULL_ADDRESS");
      setDevelopmentFooterMode(payload.development_footer_mode ?? "CONSULT");
      setCta(payload.cta ?? (draftObjective === "PROMOVER_EMPREENDIMENTO" ? "Conheça o empreendimento" : "Conheça todos os detalhes"));
      setColorTheme(payload.color_theme ?? "PETROL");
      setStep("EDITOR");
    });
  }, [data, draftLoaded]);
  const subjects = objective === "PROMOVER_EMPREENDIMENTO" ? (data?.developments ?? []) : (data?.properties ?? []);
  const property = useMemo(
    () => subjects.find((item) => item.id === propertyId) ?? null,
    [subjects, propertyId],
  );
  useEffect(() => {
    if (step !== "EDITOR" || propertyId || !templateId) return;
    const key = `${objective}:${templateId}`;
    if (automaticPickerKey.current === key) return;
    automaticPickerKey.current = key;
    setPropertyPickerOpen(true);
  }, [step, propertyId, templateId, objective]);
  useEffect(() => {
    if (!property?.development_meta) return;
    if (developmentFooterMode === "YEAR" && property.fase !== "ENTREGUE") setDevelopmentFooterMode("CONSULT");
    if (developmentFooterMode === "STARTING_PRICE" && !property.development_meta.startingPrice) setDevelopmentFooterMode("CONSULT");
  }, [property, developmentFooterMode]);
  const template =
    data?.templates.find((item) => item.id === templateId) ?? null;
  const isDual = template?.renderer_key.includes("dual-02") ?? false;
  const isEditorial = template?.renderer_key.includes("editorial-03") ?? false;
  const isCarousel = template?.renderer_key.includes("journey-carousel-01") ?? false;
  const carouselRenderImages = [
    ...new Set(carouselSlides.map((slide) => slide.imageUrl).filter(Boolean)),
  ];
  const previewMode: PreviewMode =
    format === "VERTICAL" ? "STORY_STATUS" : "INSTAGRAM_FEED";
  function chooseProperty(id: string) {
    setPropertyId(id);
    const selected = subjects.find((item) => item.id === id);
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
      objective === "PROMOVER_EMPREENDIMENTO" ? createDevelopmentCarouselSlides(
        [
          ...new Set([
            ...(selected?.images ?? []),
            ...(selected?.development_images ?? []),
          ]),
        ].slice(0, 6),
        selected?.development_meta,
        selected?.caracteristicas ?? [],
      ) : createCarouselSlides(
        [...new Set([...(selected?.images ?? []), ...(selected?.development_images ?? [])])].slice(0, 6),
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
  function chooseObjective(nextObjective: CreativeObjective) {
    setObjective(nextObjective);
    setLatestGenerated(null);
    setTemplateId("");
    setPropertyId("");
    setImageUrl("");
    setCta(nextObjective === "PROMOVER_EMPREENDIMENTO" ? "Conheça o empreendimento" : "Conheça todos os detalhes");
    navigate("TEMPLATE");
  }
  function chooseTemplate(item: Template) {
    setTemplateId(item.id);
    if (item.renderer_key.includes("dual-02") && property)
      setSecondaryImageUrl(
        property.development_images[0] ??
          property.images[1] ??
          property.images[0] ??
          "",
      );
    if (item.renderer_key.includes("journey-carousel-01")) {
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
          objective,
          format,
          payload: {
            image_url: imageUrl,
            secondary_image_url: secondaryImageUrl,
            carousel_image_urls: isCarousel ? carouselRenderImages : carouselImageUrls,
            carousel_slides: carouselSlides,
            price_mode: priceMode,
            highlight,
            image_label_mode: imageLabelMode,
            development_label_mode: developmentLabelMode,
            development_footer_mode: developmentFooterMode,
            cta,
            color_theme: colorTheme,
          },
        }),
      },
    );
    setSavingDraft(false);
    if (!result.ok) return setError(result.error);
    setDraftId(result.data.id);
    refreshDrafts();
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
    const result = await apiFetchWithAuth<{ id: string; url: string; urls?: string[] }>("/api/criativos", {
      method: "POST",
      body: JSON.stringify({
        template_id: template.id,
        property_id: property.id,
        objective,
        image_url: imageUrl,
        secondary_image_url: isDual ? secondaryImageUrl : undefined,
        carousel_image_urls: isCarousel ? carouselRenderImages : undefined,
        carousel_slides: isCarousel ? carouselSlides : undefined,
        price_mode: priceMode,
        highlight: isDual || isEditorial || isCarousel ? highlight : undefined,
        color_theme: isEditorial ? colorTheme : undefined,
        format,
        image_label_mode: imageLabelMode,
        development_label_mode: developmentLabelMode,
        development_footer_mode: developmentFooterMode,
        cta,
      }),
    });
    setGenerating(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setLatestGenerated({
      id: result.data.id,
      subject_id: property.id,
      template_id: template.id,
      subject_type: objective === "PROMOVER_EMPREENDIMENTO" ? "DEVELOPMENT" : "PROPERTY",
      formato: format,
      status: "PRONTO",
      resultado_url: result.data.url,
      resultado_urls: result.data.urls ?? null,
      created_at: new Date().toISOString(),
      payload: objective === "PROMOVER_EMPREENDIMENTO"
        ? { development: { name: property.display_title || property.titulo } }
        : { property: { title: property.display_title || property.titulo, code: property.codigo ?? undefined } },
    });
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
            {centralTab === "CREATE" && step === "OBJECTIVE" ? (
              <DraftHistory
                drafts={drafts}
                templates={data.templates}
                properties={[...data.properties, ...data.developments]}
              />
            ) : null}
            {step === "OBJECTIVE" ? <nav className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Seções da Central de Criativos">
              <button
                type="button"
                onClick={() => setCentralTab("CREATE")}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition ${centralTab === "CREATE" ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-50"}`}
              >
                Criar novo
              </button>
              <button
                type="button"
                onClick={() => setCentralTab("CREATED")}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition ${centralTab === "CREATED" ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-50"}`}
              >
                Meus criativos ({historyTotal})
              </button>
            </nav> : null}
            {centralTab === "CREATE" ? (
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
              <ObjectiveSelection onSelect={chooseObjective} />
            ) : step === "TEMPLATE" ? (
              <TemplateSelection
                templates={data.templates.filter((item) => item.objetivo === objective)}
                selectedId={templateId}
                profile={data.profile}
                property={property ?? subjects[0] ?? null}
                onBack={() => navigate("OBJECTIVE")}
                onSelect={chooseTemplate}
              />
            ) : (
              <>
                <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(390px,.78fr)]">
                  <div className="space-y-5">
                    <Panel number="1" title={objective === "PROMOVER_EMPREENDIMENTO" ? "Empreendimento e imagens" : "Imóvel e imagens"}>
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
                                {objective === "PROMOVER_EMPREENDIMENTO" ? property.development_meta?.phase : property.codigo || "Sem código"}
                              </span>
                              <span className="mt-1 block truncate font-bold text-slate-950">
                                {property.display_title || property.titulo}
                              </span>
                              <span className="mt-1 block truncate text-xs text-slate-500">
                                {objective === "PROMOVER_EMPREENDIMENTO" ? property.development_meta?.address : <>{property.bairro_comercial || property.bairro} | {property.cidade}</>}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="block font-bold">
                                Selecionar {objective === "PROMOVER_EMPREENDIMENTO" ? "empreendimento" : "imóvel"} publicado
                              </span>
                              <span className="mt-1 block text-sm text-slate-500">
                                {objective === "PROMOVER_EMPREENDIMENTO" ? "Busque por nome, endereço, bairro ou fase" : "Busque por título, código ou bairro"}
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
                              label: objective === "PROMOVER_EMPREENDIMENTO" ? "Imagens do empreendimento" : "Imagens do imóvel",
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
                              characteristics={property.caracteristicas ?? []}
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
                        properties={subjects}
                        subjectLabel={objective === "PROMOVER_EMPREENDIMENTO" ? "empreendimento" : "imóvel"}
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
                          {objective === "PROMOVER_EMPREENDIMENTO" ? "O nome e os dados comerciais são carregados automaticamente do empreendimento." : "Este template utiliza sempre o título completo do imóvel."}
                        </p>
                        {objective === "PROMOVER_EMPREENDIMENTO" && property?.development_meta ? (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-bold uppercase tracking-[.16em] text-stone-500">Dados do empreendimento</p>
                            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                              {[
                                ["Fase", property.development_meta.phase],
                                ["Unidades totais", property.development_meta.totalUnits],
                                [property.fase === "ENTREGUE" ? "Construção" : "Previsão", property.development_meta.referenceDate],
                                ["Tipos de unidades", property.development_meta.unitTypes],
                                ["Dormitórios", property.development_meta.bedrooms],
                                ["Metragens", property.development_meta.areas],
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-xl bg-white p-3"><dt className="text-slate-400">{label}</dt><dd className="mt-1 font-semibold text-slate-900">{value}</dd></div>
                              ))}
                            </dl>
                            <p className="mt-3 text-xs text-slate-500">Esses dados são factuais e devem ser alterados no cadastro do empreendimento. O editor controla apenas a composição do criativo.</p>
                          </div>
                        ) : null}
                        {objective === "PROMOVER_IMOVEL" ? (
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
                        ) : null}
                        {objective === "PROMOVER_EMPREENDIMENTO" && property?.development_meta ? (
                          <div className="grid gap-4 sm:grid-cols-2">
                            <label className="grid gap-1.5 text-sm font-semibold">
                              Informação sobre a imagem
                              <select value={developmentLabelMode} onChange={(event) => setDevelopmentLabelMode(event.target.value as DevelopmentLabelMode)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal">
                                <option value="FULL_ADDRESS">Endereço completo</option>
                                <option value="CITY_STATE">Bairro - Cidade / UF</option>
                                <option value="PHASE">Fase do empreendimento</option>
                              </select>
                            </label>
                            <label className="grid gap-1.5 text-sm font-semibold">
                              Informação final
                              <select value={developmentFooterMode} onChange={(event) => setDevelopmentFooterMode(event.target.value as DevelopmentFooterMode)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal">
                                {property.fase === "ENTREGUE" ? <option value="YEAR">Ano de construção</option> : null}
                                {property.development_meta.startingPrice ? <option value="STARTING_PRICE">A partir de</option> : null}
                                <option value="CONSULT">Consulte os valores</option>
                              </select>
                            </label>
                          </div>
                        ) : null}
                        {isDual ? (
                          <>
                            {objective === "PROMOVER_IMOVEL" ? (
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
                            ) : null}
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
                              {objective === "PROMOVER_EMPREENDIMENTO" ? (
                                <>
                                  <option>Conheça o empreendimento</option>
                                  <option>Veja plantas e detalhes</option>
                                  <option>Consulte a disponibilidade</option>
                                  <option>Fale comigo</option>
                                </>
                              ) : (
                                <>
                                  <option>Conheça todos os detalhes</option>
                                  <option>Agende uma visita</option>
                                  <option>Fale comigo</option>
                                  <option>Veja este imóvel</option>
                                  <option>Solicite mais informações</option>
                                </>
                              )}
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
                                property={property ? { ...property, creative_label: imageLabel(property, imageLabelMode, developmentLabelMode) } : null}
                                profile={data.profile!}
                                imageUrl={imageUrl}
                                secondaryImageUrl={secondaryImageUrl}
                                carouselImageUrls={carouselRenderImages}
                                carouselSlides={carouselSlides}
                                carouselSlide={index}
                                rendererKey={template?.renderer_key}
                                priceMode={priceMode}
                                developmentFooterMode={developmentFooterMode}
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
                                      developmentLabelMode,
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
                            developmentFooterMode={developmentFooterMode}
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
                {latestGenerated ? (
                  <History
                    posts={[latestGenerated]}
                    templates={data.templates}
                    title="Última versão gerada"
                    description="Seu criativo está pronto para baixar."
                    onViewAll={() => {
                      navigate("OBJECTIVE");
                      setCentralTab("CREATED");
                    }}
                    onDeleted={() => {
                      setLatestGenerated(null);
                      refresh();
                    }}
                  />
                ) : null}
              </>
            )}
              </>
            ) : (
              <History
                posts={data.posts}
                templates={data.templates}
                paginated
                onTotalChange={setHistoryTotal}
                onDeleted={(id) => setData((current) => current ? { ...current, posts: current.posts.filter((post) => post.id !== id) } : current)}
              />
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

function ObjectiveSelection({ onSelect }: { onSelect: (objective: CreativeObjective) => void }) {
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
          onClick={() => onSelect("PROMOVER_IMOVEL")}
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
        <button
          type="button"
          onClick={() => onSelect("PROMOVER_EMPREENDIMENTO")}
          className="group flex min-h-52 flex-col justify-between rounded-3xl border-2 border-slate-950 bg-white p-6 text-left text-slate-950 transition hover:-translate-y-1 hover:shadow-xl"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <House size={28} />
          </span>
          <span>
            <strong className="block text-2xl">Promover empreendimento</strong>
            <span className="mt-2 block text-sm text-slate-500">
              Apresente projeto, plantas, lazer e localização.
            </span>
          </span>
        </button>
        {[
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
  characteristics,
  onActiveSlide,
  onChange,
}: {
  slides: CarouselSlideConfig[];
  activeSlide: number;
  images: string[];
  environments: Property["environments"];
  characteristics: string[];
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
                        <select
                          value={attribute}
                          aria-label={`Atributo ${attributeIndex + 1}`}
                          onChange={(event) =>
                            update(index, {
                              attributes: (slide.attributes ?? []).map((item, position) =>
                                position === attributeIndex ? event.target.value : item,
                              ),
                            })
                          }
                          className="min-w-0 flex-1 rounded-lg border bg-white px-3 py-2 text-sm font-normal"
                        >
                          <option value="">Selecione uma característica</option>
                          {characteristics.map((option) => {
                            const selectedElsewhere = (slide.attributes ?? []).some(
                              (item, position) => position !== attributeIndex && item === option,
                            );
                            return (
                              <option key={option} value={option} disabled={selectedElsewhere}>
                                {option}
                              </option>
                            );
                          })}
                        </select>
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
                      Até seis características cadastradas no empreendimento, sem repetição. Os diferenciais vêm selecionados primeiro.
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
  subjectLabel,
  selectedId,
  onSelect,
  onClose,
}: {
  properties: Property[];
  subjectLabel: "imóvel" | "empreendimento";
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
            property.development_meta?.address,
            property.development_meta?.phase,
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
              Selecionar {subjectLabel}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {subjectLabel === "empreendimento" ? "Busque por nome, endereço, bairro, cidade ou fase." : "Busque por título, código, bairro ou cidade."}
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
              placeholder={subjectLabel === "empreendimento" ? "Nome, endereço, bairro ou fase" : "Título, código ou bairro"}
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
                        {subjectLabel === "empreendimento" ? property.development_meta?.phase : property.codigo || "Sem código"}
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
                      {subjectLabel === "empreendimento" ? property.development_meta?.address : <>{property.bairro_comercial || property.bairro} | {property.cidade} / {property.estado}</>}
                    </span>
                    <span className="mt-2 block text-xs font-semibold text-slate-600">
                      {subjectLabel === "empreendimento" ? [
                        property.development_meta?.unitTypes,
                        property.development_meta?.bedrooms !== "Não informado" ? `${property.development_meta?.bedrooms} dorm.` : null,
                        property.development_meta?.areas,
                      ].filter(Boolean).join(" · ") : [
                        property.area_util ? `${property.area_util} m²` : null,
                        property.dormitorios
                          ? `${property.dormitorios} dorm.`
                          : null,
                        property.vagas ? `${property.vagas} vagas` : null,
                      ].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-slate-500">
              Nenhum {subjectLabel} encontrado para esta busca.
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
  developmentFooterMode = "CONSULT",
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
  developmentFooterMode?: DevelopmentFooterMode;
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
  const propertyStats = [
    {
      kind: "AREA" as const,
      value:
        typeof property?.area_util === "string" && property.area_util ? property.area_util : Number(property?.area_util) > 0 ? String(property?.area_util) : "—",
      label: "m² úteis",
    },
    {
      kind: "BED" as const,
      value:
        typeof property?.dormitorios === "string" && property.dormitorios ? property.dormitorios : Number(property?.dormitorios) > 0 ? String(property?.dormitorios) : "—",
      label: "Dormitórios",
    },
    {
      kind: "SUITE" as const,
      value: typeof property?.suites === "string" && property.suites ? property.suites : Number(property?.suites) > 0 ? String(property?.suites) : "—",
      label: "Suítes",
    },
    {
      kind: "CAR" as const,
      value: typeof property?.vagas === "string" && property.vagas ? property.vagas : Number(property?.vagas) > 0 ? String(property?.vagas) : "—",
      label: "Vagas",
    },
  ];
  const stats = property?.development_meta
    ? [
        { kind: "PHASE" as const, value: property.development_meta.phase, label: "Fase" },
        {
          kind: "UNITS" as const,
          value: property.development_meta.totalUnits,
          label: "Unidades",
        },
        { kind: "BED" as const, value: property.development_meta.bedrooms, label: "Dormitórios" },
        { kind: "AREA" as const, value: property.development_meta.areas, label: "Plantas" },
      ]
    : propertyStats;
  const payload: PropertyCreativePayload = {
    subjectType: property?.development_meta ? "DEVELOPMENT" : "PROPERTY",
    property: {
      id: property?.id ?? "preview",
      title,
      location: location(property),
      price: property?.development_meta
        ? developmentFooter(property, developmentFooterMode)
        : priceMode === "CONSULT" ? "Consulte o valor" : price(property),
      code: property?.codigo ?? "",
      imageUrl,
      secondaryImageUrl,
      carouselImages: carouselImageUrls,
      carouselSlides,
      features: property?.caracteristicas ?? undefined,
      featureCount: property?.characteristic_count ?? property?.caracteristicas?.length ?? 0,
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
  const normalizedRendererKey = rendererKey?.replace(/^development-/, "property-");
  return (
    <ExactHtmlPreview
      html={
        normalizedRendererKey === "property-dual-02"
          ? buildPropertyDualHtml(payload)
          : normalizedRendererKey === "property-editorial-03"
            ? buildPropertyEditorialHtml(payload)
            : normalizedRendererKey === "property-journey-carousel-01"
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
function imageLabel(property: Property, mode: ImageLabelMode, developmentMode: DevelopmentLabelMode = "FULL_ADDRESS") {
  if (property.development_meta) {
    if (developmentMode === "PHASE") return property.development_meta.phase;
    if (developmentMode === "CITY_STATE") return property.development_meta.cityState;
    return property.development_meta.address;
  }
  return mode === "DEVELOPMENT" && property.empreendimento?.nome
    ? property.empreendimento.nome
    : location(property);
}
function price(property: Property | null) {
  if (property?.development_meta) return property.development_meta.referenceDate;
  return property
    ? money(
        property.finalidade === "ALUGAR"
          ? property.preco_locacao
          : property.preco_venda,
      )
    : "Consulte o valor";
}
function developmentFooter(property: Property, mode: DevelopmentFooterMode) {
  const meta = property.development_meta;
  if (!meta) return "Consulte os valores";
  if (mode === "YEAR" && property.fase === "ENTREGUE") return meta.referenceDate;
  if (mode === "STARTING_PRICE" && meta.startingPrice) return `A partir de ${meta.startingPrice}`;
  return "Consulte os valores";
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
function History({
  posts,
  templates,
  title = "Meus criativos",
  description = "Consulte e baixe os materiais já gerados.",
  onViewAll,
  onDeleted,
  paginated = false,
  onTotalChange,
}: {
  posts: Post[];
  templates: Template[];
  title?: string;
  description?: string;
  onViewAll?: () => void;
  onDeleted?: (id: string) => void;
  paginated?: boolean;
  onTotalChange?: (total: number) => void;
}) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [items, setItems] = useState(posts);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [objectiveFilter, setObjectiveFilter] = useState("ALL");
  const [order, setOrder] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(posts.length);
  const [totalPages, setTotalPages] = useState(1);
  const [historyVersion, setHistoryVersion] = useState(0);

  useEffect(() => {
    if (!paginated) {
      setItems(posts);
      setTotal(posts.length);
      return;
    }
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, paginated, posts]);

  useEffect(() => {
    if (!paginated) return;
    let active = true;
    setLoadingHistory(true);
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize), order });
    if (objectiveFilter !== "ALL") params.set("objective", objectiveFilter);
    if (search) params.set("search", search);
    apiFetchWithAuth<{ items: Post[]; page: number; pageSize: number; total: number; totalPages: number }>(`/api/criativos/history?${params}`).then((result) => {
      if (!active) return;
      setLoadingHistory(false);
      if (!result.ok) {
        setDownloadError(result.error);
        return;
      }
      setItems(result.data.items);
      setTotal(result.data.total);
      setTotalPages(result.data.totalPages);
      onTotalChange?.(result.data.total);
    });
    return () => { active = false; };
  }, [paginated, page, pageSize, order, objectiveFilter, search, historyVersion, onTotalChange]);

  async function removeCreative() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDownloadError(null);
    const result = await apiFetchWithAuth<{ id: string }>(`/api/criativos?id=${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE" });
    setDeleting(false);
    if (!result.ok) {
      setDownloadError(result.error);
      return;
    }
    const deletedId = deleteTarget.id;
    setDeleteTarget(null);
    setItems((current) => current.filter((post) => post.id !== deletedId));
    setTotal((current) => Math.max(0, current - 1));
    onDeleted?.(deletedId);
    if (paginated && items.length === 1 && page > 1) setPage((current) => current - 1);
    else if (paginated) setHistoryVersion((current) => current + 1);
  }

  async function download(post: Post, slideIndex = 0, all = false) {
    const key = `${post.id}:${all ? "all" : slideIndex}`;
    setDownloading(key);
    setDownloadError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Sessão inválida.");
      const response = await fetch(
        `/api/criativos/download?post=${encodeURIComponent(post.id)}&slide=${slideIndex}${all ? "&all=1" : ""}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(result?.error?.message ?? "Não foi possível baixar o arquivo.");
      }
      const blobUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      const disposition = response.headers.get("content-disposition") ?? "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1];
      anchor.href = blobUrl;
      anchor.download = filename ?? `criativo-${post.id}.${all ? "zip" : "png"}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1_000);
    } catch (cause) {
      setDownloadError(
        cause instanceof Error ? cause.message : "Não foi possível baixar o arquivo.",
      );
    } finally {
      setDownloading(null);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {onViewAll ? (
          <button type="button" onClick={onViewAll} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold hover:bg-slate-50">
            Ver todos os criativos
          </button>
        ) : null}
      </header>
      {paginated ? (
        <div className="grid gap-3 border-b border-slate-100 p-5 lg:grid-cols-[minmax(260px,1fr)_220px_210px_150px]">
          <label className="relative block">
            <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
            <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Título, código, bairro, cidade ou endereço" className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm" />
          </label>
          <select value={objectiveFilter} onChange={(event) => { setObjectiveFilter(event.target.value); setPage(1); }} aria-label="Filtrar por objetivo" className="h-11 min-w-[220px] rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm">
            <option value="ALL">Todos os objetivos</option>
            <option value="PROPERTY">Promover imóvel</option>
            <option value="DEVELOPMENT">Promover empreendimento</option>
            <option value="PROFILE">Promover perfil</option>
          </select>
          <select value={order} onChange={(event) => { setOrder(event.target.value as "newest" | "oldest"); setPage(1); }} aria-label="Ordenar criativos" className="h-11 min-w-[210px] rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm">
            <option value="newest">Mais recentes primeiro</option>
            <option value="oldest">Mais antigos primeiro</option>
          </select>
          <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} aria-label="Itens por página" className="h-11 min-w-[150px] rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm">
            <option value={10}>10 por página</option>
            <option value={20}>20 por página</option>
            <option value={50}>50 por página</option>
          </select>
        </div>
      ) : null}
      {loadingHistory ? <p className="p-10 text-center text-sm text-slate-400">Carregando criativos...</p> : items.length ? (
        <div className="divide-y divide-slate-100 px-5">
          {items.map((post) => {
            const template = templates.find((item) => item.id === post.template_id);
            const subject = post.payload?.development?.name ?? post.payload?.property?.title ?? "Material sem identificação";
            const objective = post.subject_type === "DEVELOPMENT" ? "Promover empreendimento" : post.subject_type === "PROFILE" ? "Promover perfil" : "Promover imóvel";
            const ratio = post.formato === "SQUARE" ? "aspect-square" : post.formato === "VERTICAL" ? "aspect-[9/16]" : "aspect-[4/5]";
            return (
            <article
              key={post.id}
              className="grid gap-5 py-5 md:grid-cols-[180px_minmax(0,1fr)_auto] md:items-center"
            >
              <div className={`relative mx-auto w-full max-w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50 ${ratio}`}>
                {post.resultado_url ? (
                  <Image
                    src={post.resultado_url}
                    alt="Criativo"
                    fill
                    sizes="180px"
                    className="object-contain"
                    unoptimized
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[.16em] text-stone-500">{objective}</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">{subject}</h3>
                <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                  <div><dt className="text-slate-400">Modelo</dt><dd className="font-medium">{template?.nome ?? "Modelo indisponível"}</dd></div>
                  <div><dt className="text-slate-400">Formato</dt><dd className="font-medium">{formatLabel(post.formato)}</dd></div>
                  <div><dt className="text-slate-400">Criado em</dt><dd className="font-medium">{post.created_at ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(post.created_at)) : "—"}</dd></div>
                  <div><dt className="text-slate-400">Arquivos</dt><dd className="font-medium">{post.resultado_urls?.length ?? (post.resultado_url ? 1 : 0)}</dd></div>
                </dl>
              </div>
              <div className="w-full md:w-48">
                {post.resultado_url ? (
                  post.resultado_urls?.length ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => void download(post, 0, true)}
                        disabled={downloading === `${post.id}:all`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                      >
                        {downloading === `${post.id}:all` ? <ArrowClockwise className="animate-spin" /> : <DownloadSimple />}
                        {downloading === `${post.id}:all` ? "Preparando..." : "Baixar tudo (.zip)"}
                      </button>
                      <div className="grid grid-cols-4 gap-1.5">
                      {post.resultado_urls.map((url, index) => (
                        <button
                          key={url}
                          type="button"
                          onClick={() => void download(post, index)}
                          disabled={downloading === `${post.id}:${index}`}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-semibold"
                          title={`Baixar slide ${index + 1}`}
                        >
                          {downloading === `${post.id}:${index}` ? (
                            <ArrowClockwise className="animate-spin" />
                          ) : (
                            <DownloadSimple />
                          )}{" "}
                          {index + 1}
                        </button>
                      ))}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void download(post)}
                      disabled={downloading === `${post.id}:0`}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm"
                    >
                      {downloading === `${post.id}:0` ? (
                        <ArrowClockwise className="animate-spin" />
                      ) : (
                        <DownloadSimple />
                      )}
                      {downloading === `${post.id}:0` ? "Baixando..." : "Baixar PNG"}
                    </button>
                  )
                ) : null}
                <button
                  type="button"
                  onClick={() => setDeleteTarget(post)}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash size={17} />
                  Excluir
                </button>
              </div>
            </article>
            );
          })}
        </div>
      ) : (
        <p className="p-10 text-center text-sm text-slate-400">
          Nenhum criativo gerado.
        </p>
      )}
      {paginated && !loadingHistory && total > 0 ? (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5 text-sm">
          <span className="text-slate-500">{total} criativo(s) · Página {page} de {totalPages}</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-xl border border-slate-200 px-4 py-2 font-semibold disabled:opacity-40">Anterior</button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-xl border border-slate-200 px-4 py-2 font-semibold disabled:opacity-40">Próxima</button>
          </div>
        </footer>
      ) : null}
      {downloadError ? (
        <p className="px-5 pb-5 text-sm text-red-600">{downloadError}</p>
      ) : null}
      {deleteTarget ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-creative-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="delete-creative-title" className="text-xl font-semibold text-slate-950">Excluir criativo?</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">O registro e os arquivos gerados serão removidos definitivamente do servidor.</p>
              </div>
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} aria-label="Fechar" className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><X size={18} /></button>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold disabled:opacity-40">Cancelar</button>
              <button type="button" onClick={() => void removeCreative()} disabled={deleting} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-bold text-white disabled:opacity-50">
                {deleting ? <ArrowClockwise className="animate-spin" /> : <Trash />}
                {deleting ? "Excluindo..." : "Excluir definitivamente"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function DraftHistory({
  drafts,
  templates,
  properties,
}: {
  drafts: CreativeDraft[];
  templates: Template[];
  properties: Property[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-100 p-5">
        <div>
          <h2 className="text-lg font-semibold">Rascunhos recentes</h2>
          <p className="mt-1 text-sm text-slate-500">
            Continue um criativo do ponto em que parou.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {drafts.length}
        </span>
      </header>
      {drafts.length ? (
        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {drafts.map((draft) => {
            const property = properties.find((item) => item.id === draft.subject_id);
            const template = templates.find((item) => item.id === draft.template_id);
            return (
              <article
                key={draft.id}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 p-3"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {property?.images[0] ? (
                    <Image
                      src={property.images[0]}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {property?.display_title ?? property?.titulo ?? "Imóvel"}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {template?.nome ?? "Modelo"} · {formatLabel(draft.formato)}
                  </p>
                  {draft.updated_at ? (
                    <p className="mt-1 text-[11px] text-slate-400">
                      Editado em {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(draft.updated_at))}
                    </p>
                  ) : null}
                </div>
                <a
                  href={`/criativos?rascunho=${encodeURIComponent(draft.id)}&etapa=editor`}
                  className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold hover:bg-slate-50"
                >
                  Continuar
                </a>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="p-8 text-center text-sm text-slate-400">
          Nenhum rascunho salvo.
        </p>
      )}
    </section>
  );
}
