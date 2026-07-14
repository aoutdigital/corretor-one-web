"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowSquareOut,
  Buildings,
  CalendarBlank,
  CaretDown,
  CaretUp,
  ChatCircle,
  DotsSixVertical,
  Eye,
  FloppyDisk,
  House,
  ImageSquare,
  Info,
  LinkSimple,
  ListBullets,
  MegaphoneSimple,
  NotePencil,
  Phone,
  Plus,
  Quotes,
  SpinnerGap,
  TextB,
  TextH,
  TextItalic,
  TextT,
  TextUnderline,
  Trash,
  Video,
  WhatsappLogo,
  X,
} from "@phosphor-icons/react";

import {
  ARTICLE_LIMITS,
  ARTIGO_CTA_CONFIGS,
  ARTIGO_CATEGORIAS,
  extractYouTubeVideoId,
  getArticleCategoryLabel,
  getReadableTextFromHtml,
  hasLongUppercaseSequence,
  slugifyArticle,
  type ArtigoBlock,
  type ArtigoCtaType,
  type ArtigoPropertyCarouselFilters,
  type ArtigosOrdenacao,
  type ArtigoCategoria,
  type ArtigoConteudo,
  type ArtigoStatus,
} from "@/lib/artigos/content";
import { ArticleContentRenderer } from "@/app/[nickname]/_components/article-content-renderer";
import { apiFetchWithAuth } from "@/lib/client/auth-api";
import {
  ArticleLinkModal,
  findClosestArticleAnchor,
  getArticleLinkSelection,
  type ArticleLinkSelection,
} from "../_components/article-link-modal";

type ArtigoRow = {
  id: string;
  status: ArtigoStatus;
  categoria: ArtigoCategoria;
  titulo: string;
  subtitulo: string | null;
  resumo: string | null;
  slug: string;
  capa_url: string | null;
  conteudo_blocos: ArtigoConteudo;
  tags: string[];
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  indexar: boolean;
  leitura_minutos: number;
  ordem_manual: number;
  publicado_em: string | null;
  local_nome: string | null;
  local_categoria: string | null;
  local_horario_funcionamento: string | null;
  local_website_url: string | null;
  local_whatsapp: string | null;
  local_telefone: string | null;
  localizacao_texto: string | null;
};

type ProfileData = {
  nickname?: string | null;
  primeiro_nome?: string | null;
  sobrenome?: string | null;
  avatar_url?: string | null;
  creci_uf?: string | null;
  creci_numero?: string | null;
  creci_sufixo?: string | null;
};
type UploadedMedia = { id: string; url: string };
type BlockKind = ArtigoBlock["type"];
type BlockGroup = "titulos" | "texto" | "midia" | "imoveis" | "cta";
type LinkModalState = ArticleLinkSelection & { editorId: string };
type ArtigosResponse = { config: { ordenacao_publica: ArtigosOrdenacao } };
type PropertyOption = {
  id: string;
  codigo?: string | null;
  titulo?: string | null;
  status?: string | null;
  tipo?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  dormitorios?: number | null;
  suites?: number | null;
  vagas?: number | null;
  preco_venda?: number | null;
  preco_locacao?: number | null;
};
type EnterpriseOption = {
  id: string;
  nome?: string | null;
  status?: string | null;
  bairro?: string | null;
  cidade?: string | null;
};
type CaracteristicaCatalogoOption = {
  chave: string;
  label_pt: string;
  ativo?: boolean | null;
};
type ArticleEditorOptions = {
  propertyOptions: PropertyOption[];
  enterpriseOptions: EnterpriseOption[];
  propertyCharacteristics: CaracteristicaCatalogoOption[];
  enterpriseCharacteristics: CaracteristicaCatalogoOption[];
};

const BLOCK_GROUPS: Array<{ value: BlockGroup; label: string }> = [
  { value: "titulos", label: "Títulos" },
  { value: "texto", label: "Texto" },
  { value: "midia", label: "Mídia" },
  { value: "imoveis", label: "Imóveis" },
  { value: "cta", label: "Chamada" },
];

const BLOCK_LIBRARY: Array<{
  group: BlockGroup;
  type: BlockKind;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  variant?: "h2" | "h3" | "ordered" | "bullet" | ArtigoCtaType;
}> = [
  { group: "titulos", type: "heading", variant: "h2", title: "Título H2", description: "Seção principal do artigo.", icon: TextH },
  { group: "titulos", type: "heading", variant: "h3", title: "Título H3", description: "Subseção curta.", icon: TextH },
  { group: "texto", type: "paragraph", title: "Parágrafo", description: "Texto rico com negrito, itálico, sublinhado e link.", icon: TextT },
  { group: "texto", type: "list", variant: "bullet", title: "Lista bullet", description: "Pontos rápidos para leitura.", icon: ListBullets },
  { group: "texto", type: "list", variant: "ordered", title: "Lista ordenada", description: "Passos em sequência.", icon: ListBullets },
  { group: "texto", type: "quote", title: "Citação", description: "Destaque editorial com autoria.", icon: Quotes },
  { group: "midia", type: "image", title: "Imagem", description: "Imagem única com alt e legenda.", icon: ImageSquare },
  { group: "midia", type: "gallery", title: "Galeria", description: "Conjunto de imagens do artigo.", icon: ImageSquare },
  { group: "midia", type: "youtube", title: "YouTube", description: "Vídeo incorporado com URL segura.", icon: Video },
  { group: "imoveis", type: "property_feature", title: "Destacar imóvel", description: "Card horizontal com um imóvel publicado.", icon: House },
  { group: "imoveis", type: "property_carousel", title: "Carrossel de imóveis", description: "Lista dinâmica por filtros combinados.", icon: Buildings },
  { group: "cta", type: "cta", variant: "curadoria", title: "Pedir Curadoria", description: ARTIGO_CTA_CONFIGS.curadoria.buttonLabel, icon: ChatCircle },
  { group: "cta", type: "cta", variant: "whatsapp", title: "Me chama no WhatsApp", description: ARTIGO_CTA_CONFIGS.whatsapp.buttonLabel, icon: WhatsappLogo },
  { group: "cta", type: "cta", variant: "inventory", title: "Veja meus imóveis", description: ARTIGO_CTA_CONFIGS.inventory.buttonLabel, icon: House },
  { group: "cta", type: "cta", variant: "phone", title: "Me ligue", description: ARTIGO_CTA_CONFIGS.phone.buttonLabel, icon: Phone },
  { group: "cta", type: "cta", variant: "advertise", title: "Anuncie seu imóvel", description: ARTIGO_CTA_CONFIGS.advertise.buttonLabel, icon: MegaphoneSimple },
];

export default function ArtigoEditorPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [article, setArticle] = useState<ArtigoRow | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<BlockGroup>("titulos");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [linkModal, setLinkModal] = useState<LinkModalState | null>(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [ordenacaoPublica, setOrdenacaoPublica] = useState<ArtigosOrdenacao>("PUBLICACAO_DESC");
  const [propertyOptions, setPropertyOptions] = useState<PropertyOption[]>([]);
  const [enterpriseOptions, setEnterpriseOptions] = useState<EnterpriseOption[]>([]);
  const [propertyCharacteristics, setPropertyCharacteristics] = useState<CaracteristicaCatalogoOption[]>([]);
  const [enterpriseCharacteristics, setEnterpriseCharacteristics] = useState<CaracteristicaCatalogoOption[]>([]);
  const editorRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const blockLibraryScrollRef = useRef<HTMLDivElement | null>(null);
  const blockLibraryContentRef = useRef<HTMLDivElement | null>(null);
  const blockLibrarySectionRefs = useRef<Record<BlockGroup, HTMLElement | null>>({
    titulos: null,
    texto: null,
    midia: null,
    imoveis: null,
    cta: null,
  });

  useEffect(() => {
    async function load() {
      const [
        articleResult,
        profileResult,
        artigosResult,
        propertiesResult,
        enterprisesResult,
        propertyCharacteristicsResult,
        enterpriseCharacteristicsResult,
      ] = await Promise.all([
        apiFetchWithAuth<ArtigoRow>(`/api/artigos/${id}`),
        apiFetchWithAuth<ProfileData>("/api/profile"),
        apiFetchWithAuth<ArtigosResponse>("/api/artigos"),
        apiFetchWithAuth<PropertyOption[]>("/api/imoveis"),
        apiFetchWithAuth<EnterpriseOption[]>("/api/empreendimentos"),
        apiFetchWithAuth<CaracteristicaCatalogoOption[]>("/api/caracteristicas/catalogo?escopo=IMOVEL"),
        apiFetchWithAuth<CaracteristicaCatalogoOption[]>("/api/caracteristicas/catalogo?escopo=EMPREENDIMENTO"),
      ]);

      if (articleResult.ok) setArticle({ ...articleResult.data, conteudo_blocos: normalizeClientContent(articleResult.data.conteudo_blocos) });
      else setError(articleResult.error);

      if (profileResult.ok) {
        setProfileData(profileResult.data);
        setNickname(profileResult.data.nickname ?? null);
      }
      if (artigosResult.ok) setOrdenacaoPublica(artigosResult.data.config.ordenacao_publica);
      if (propertiesResult.ok) setPropertyOptions(propertiesResult.data ?? []);
      if (enterprisesResult.ok) setEnterpriseOptions(enterprisesResult.data ?? []);
      if (propertyCharacteristicsResult.ok) setPropertyCharacteristics(propertyCharacteristicsResult.data ?? []);
      if (enterpriseCharacteristicsResult.ok) setEnterpriseCharacteristics(enterpriseCharacteristicsResult.data ?? []);
      setLoading(false);
    }

    void load();
  }, [id]);

  useEffect(() => {
    const container = blockLibraryScrollRef.current;
    if (!container) return;

    function handleScroll() {
      if (!container) return;
      const content = blockLibraryContentRef.current;
      let nextGroup: BlockGroup = BLOCK_GROUPS[0]?.value ?? "titulos";
      const currentTop = container.scrollTop + 32;

      for (const group of BLOCK_GROUPS) {
        const section = blockLibrarySectionRefs.current[group.value];
        if (!section) continue;
        const sectionTop = section.offsetTop - (content?.offsetTop ?? 0);
        if (sectionTop <= currentTop) nextGroup = group.value;
      }

      setActiveGroup((current) => (current === nextGroup ? current : nextGroup));
    }

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const generatedSlug = useMemo(() => slugifyArticle(article?.titulo ?? ""), [article?.titulo]);
  const titleHasCaps = Boolean(article?.titulo && hasLongUppercaseSequence(article.titulo));
  const subtitleHasCaps = Boolean(article?.subtitulo && hasLongUppercaseSequence(article.subtitulo));
  const previewPath = nickname && article?.status === "PUBLICADO" ? `/${nickname}/artigos/${article.slug}` : null;
  const showManualOrder = ordenacaoPublica === "MANUAL";
  const brokerName = [profileData?.primeiro_nome, profileData?.sobrenome].filter(Boolean).join(" ").trim() || "Corretor";
  const brokerCreci =
    profileData?.creci_uf && profileData?.creci_numero
      ? `${profileData.creci_uf} ${profileData.creci_numero}-${profileData.creci_sufixo ?? "F"}`
      : null;
  const editorOptions: ArticleEditorOptions = {
    propertyOptions,
    enterpriseOptions,
    propertyCharacteristics,
    enterpriseCharacteristics,
  };

  function updateArticle<K extends keyof ArtigoRow>(key: K, value: ArtigoRow[K]) {
    setArticle((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateBlock(index: number, block: ArtigoBlock) {
    setArticle((current) => {
      if (!current) return current;
      const blocks = [...current.conteudo_blocos.blocks];
      blocks[index] = block;
      return { ...current, conteudo_blocos: { version: 1, blocks } };
    });
  }

  function addBlock(item: (typeof BLOCK_LIBRARY)[number]) {
    setArticle((current) =>
      current
        ? {
            ...current,
            conteudo_blocos: { version: 1, blocks: [...current.conteudo_blocos.blocks, createBlock(item)] },
          }
        : current,
    );
  }

  function removeBlock(index: number) {
    setArticle((current) =>
      current
        ? {
            ...current,
            conteudo_blocos: { version: 1, blocks: current.conteudo_blocos.blocks.filter((_, currentIndex) => currentIndex !== index) },
          }
        : current,
    );
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setArticle((current) => {
      if (!current) return current;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.conteudo_blocos.blocks.length) return current;
      const blocks = [...current.conteudo_blocos.blocks];
      const [block] = blocks.splice(index, 1);
      if (!block) return current;
      blocks.splice(nextIndex, 0, block);
      return { ...current, conteudo_blocos: { version: 1, blocks } };
    });
  }

  async function uploadMedia(file: File, grupo: string, alt?: string): Promise<UploadedMedia | null> {
    if (!article) return null;
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("ref_tipo", "ARTIGO");
    form.append("ref_id", article.id);
    form.append("grupo", grupo);
    form.append("alt", alt || article.titulo || file.name);
    form.append("apply_watermark", "true");
    const result = await apiFetchWithAuth<UploadedMedia>("/api/midia/upload", { method: "POST", body: form }).finally(() => {
      setUploading(false);
    });
    if (!result.ok) {
      setError(result.error);
      return null;
    }
    return result.data;
  }

  async function handleCoverUpload(file: File | null) {
    if (!file) return;
    setCoverUploading(true);
    try {
      const uploaded = await uploadMedia(file, "capa", article?.titulo ?? file.name);
      if (uploaded) updateArticle("capa_url", uploaded.url);
    } finally {
      setCoverUploading(false);
    }
  }

  function syncParagraphEditor(editorId: string) {
    const editor = editorRefs.current[editorId];
    if (!editor) return;
    setArticle((current) => {
      if (!current) return current;
      return {
        ...current,
        conteudo_blocos: {
          version: 1,
          blocks: current.conteudo_blocos.blocks.map((block) =>
            block.id === editorId && block.type === "paragraph"
              ? { ...block, data: { content: editor.innerHTML } }
              : block,
          ),
        },
      };
    });
  }

  function scrollBlockLibraryToGroup(group: BlockGroup) {
    const container = blockLibraryScrollRef.current;
    const section = blockLibrarySectionRefs.current[group];
    const content = blockLibraryContentRef.current;
    setActiveGroup(group);
    if (!container || !section) return;
    const sectionTop = section.offsetTop - (content?.offsetTop ?? 0);
    container.scrollTo({
      top: Math.max(sectionTop - 16, 0),
      behavior: "smooth",
    });
  }

  async function save(status?: ArtigoStatus) {
    if (!article) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const result = await apiFetchWithAuth<ArtigoRow>(`/api/artigos/${article.id}`, {
      method: "PATCH",
      body: JSON.stringify({ ...article, status: status ?? article.status, slug: undefined }),
    });
    setSaving(false);

    if (result.ok) {
      setArticle({ ...result.data, conteudo_blocos: normalizeClientContent(result.data.conteudo_blocos) });
      setSuccess(status === "PUBLICADO" ? "Artigo publicado." : "Artigo salvo.");
    } else {
      setError(result.error);
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-50 p-6 text-slate-700">Carregando editor...</div>;
  }

  if (!article) {
    return <div className="min-h-screen bg-slate-50 p-6 text-red-700">{error ?? "Artigo não encontrado."}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1760px] flex-nowrap items-center justify-between gap-3 px-5 py-3">
          <div className="flex min-w-[360px] flex-1 items-center gap-3">
            <Link href="/artigos" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--grey-olive)]">Editor de artigo</p>
              <h1 className="max-w-[52vw] overflow-x-auto whitespace-nowrap text-xl font-light text-slate-950 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{article.titulo || "Novo artigo"}</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-end justify-end gap-2">
            <label className="grid gap-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--grey-olive)]">
              Data
              <input
                type="datetime-local"
                max={toDateTimeLocal(new Date().toISOString())}
                value={toDateTimeLocal(article.publicado_em)}
                onChange={(event) => updateArticle("publicado_em", fromDateTimeLocal(event.target.value))}
                className="h-11 w-48 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal text-slate-700 outline-none transition focus:border-[var(--grey-olive)]"
              />
            </label>
            {showManualOrder ? (
              <label className="grid gap-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--grey-olive)]">
                Ordem
                <input
                  type="number"
                  value={article.ordem_manual}
                  onChange={(event) => updateArticle("ordem_manual", Number(event.target.value))}
                  className="h-11 w-16 rounded-xl border border-slate-200 bg-white px-2 text-sm font-bold normal-case tracking-normal text-slate-700 outline-none transition focus:border-[var(--grey-olive)]"
                />
              </label>
            ) : null}
            {previewPath ? (
              <Link href={previewPath} target="_blank" title="Ver público" aria-label="Ver artigo público" className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
                <ArrowSquareOut size={19} />
              </Link>
            ) : null}
            <button type="button" onClick={() => setPreviewOpen(true)} title="Visualização rápida" aria-label="Visualização rápida" className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
              <Eye size={19} />
            </button>
            <button type="button" onClick={() => void save()} disabled={saving || uploading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-60">
              <FloppyDisk size={17} />
              Salvar
            </button>
            <div className="relative z-[70]">
              <button
                type="button"
                onClick={() => setStatusMenuOpen((current) => !current)}
                disabled={saving || uploading}
                className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold text-white disabled:opacity-60 ${article.status === "PUBLICADO" ? "bg-emerald-600" : "bg-[var(--primary-scarlet)]"}`}
              >
                {article.status === "PUBLICADO" ? "Publicado" : "Publicar"}
                <CaretDown size={15} />
              </button>
              {statusMenuOpen ? (
                <div className="absolute right-0 top-full z-[80] mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                  {(["RASCUNHO", "PUBLICADO", "ARQUIVADO"] as ArtigoStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setStatusMenuOpen(false);
                        void save(status);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold transition hover:bg-slate-50 ${article.status === status ? "text-[var(--grey-olive)]" : "text-slate-700"}`}
                    >
                      {statusLabel(status)}
                      {article.status === status ? <span className="h-2 w-2 rounded-full bg-[var(--grey-olive)]" /> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1760px] gap-5 px-5 py-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Categoria do artigo">
                <select value={article.categoria} onChange={(event) => updateArticle("categoria", event.target.value as ArtigoCategoria)} className="input-base">
                  {ARTIGO_CATEGORIAS.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="URL automática">
                <div className="input-base bg-slate-50 text-slate-500">{generatedSlug || "gerada pelo título"}</div>
              </Field>
              <Field label="Título" help={`${article.titulo.length}/${ARTICLE_LIMITS.title}`}>
                <input value={article.titulo} maxLength={ARTICLE_LIMITS.title} onChange={(event) => updateArticle("titulo", event.target.value)} className={`input-base ${titleHasCaps ? "border-red-300" : ""}`} />
                {titleHasCaps ? <p className="mt-1 text-xs text-red-600">Evite palavras em caixa alta.</p> : null}
              </Field>
              <Field label="Subtítulo" help={`${article.subtitulo?.length ?? 0}/${ARTICLE_LIMITS.subtitle}`}>
                <input value={article.subtitulo ?? ""} maxLength={ARTICLE_LIMITS.subtitle} onChange={(event) => updateArticle("subtitulo", event.target.value)} className={`input-base ${subtitleHasCaps ? "border-red-300" : ""}`} />
                {subtitleHasCaps ? <p className="mt-1 text-xs text-red-600">Evite palavras em caixa alta.</p> : null}
              </Field>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div>
                <Field label="Imagem de capa">
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <div className="relative aspect-[16/7]">
                      {article.capa_url ? (
                        <Image src={article.capa_url} alt={article.titulo} fill sizes="(min-width: 1024px) 760px, 100vw" className="object-cover" unoptimized />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-400">
                          <ImageSquare size={42} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-3">
                      <span className="text-xs text-slate-500">Use upload ou escolha depois pela central de mídia.</span>
                      <label className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 ${coverUploading ? "pointer-events-none opacity-70" : "cursor-pointer"}`}>
                        {coverUploading ? <SpinnerGap size={16} className="animate-spin" /> : <ImageSquare size={16} />}
                        {coverUploading ? "Processando capa..." : "Enviar capa"}
                        <input type="file" accept="image/*" disabled={coverUploading} className="hidden" onChange={(event) => void handleCoverUpload(event.target.files?.[0] ?? null)} />
                      </label>
                    </div>
                    {coverUploading ? (
                      <div className="border-t border-slate-200 bg-stone-50 px-3 py-2 text-xs font-medium text-[var(--grey-olive)]">
                        Otimizando e salvando a imagem de capa...
                      </div>
                    ) : null}
                  </div>
                </Field>
              </div>
              <div className="grid gap-4">
                <Field label={<span className="inline-flex items-center gap-1">Meta title <Help text="Título exibido em buscadores e compartilhamentos. Ideal: até 60 caracteres." /></span>}>
                  <input value={article.meta_title ?? ""} maxLength={70} onChange={(event) => updateArticle("meta_title", event.target.value)} className="input-base" />
                </Field>
                <Field label={<span className="inline-flex items-center gap-1">Meta description <Help text="Resumo usado por buscadores. Ajuda a aumentar o clique quando descreve bem o conteúdo." /></span>}>
                  <textarea value={article.meta_description ?? ""} maxLength={180} onChange={(event) => updateArticle("meta_description", event.target.value)} className="min-h-24 input-base" />
                </Field>
              </div>
            </div>

            {article.categoria === "LOCAL" ? <LocalFields article={article} updateArticle={updateArticle} /> : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--grey-olive)]">Blocos inseridos</p>
              <h2 className="mt-2 text-3xl font-light">Construção do artigo</h2>
            </div>

            <div className="space-y-4">
              {article.conteudo_blocos.blocks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
                  Escolha um bloco na coluna direita para começar.
                </div>
              ) : (
                article.conteudo_blocos.blocks.map((block, index) => (
                  <BlockEditor
                    key={block.id}
                    articleId={article.id}
                    block={block}
                    index={index}
                    editorRefs={editorRefs}
                    onChange={(next) => updateBlock(index, next)}
                    onRemove={() => removeBlock(index)}
                    onMoveUp={() => moveBlock(index, -1)}
                    onMoveDown={() => moveBlock(index, 1)}
                    canMoveUp={index > 0}
                    canMoveDown={index < article.conteudo_blocos.blocks.length - 1}
                    onOpenLink={(selection) => setLinkModal({ editorId: block.id, ...selection })}
                    onUpload={uploadMedia}
                    options={editorOptions}
                  />
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="xl:sticky xl:top-[82px] xl:h-[calc(100vh-102px)]">
          <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--grey-olive)]">Adicionar bloco</p>
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {BLOCK_GROUPS.map((group) => (
                  <button
                    key={group.value}
                    type="button"
                    onClick={() => scrollBlockLibraryToGroup(group.value)}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                      activeGroup === group.value
                        ? "bg-slate-950 text-white ring-2 ring-[var(--primary-blue)] ring-offset-1"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {group.label}
                  </button>
                ))}
              </div>
            </div>

            <div ref={blockLibraryScrollRef} className="min-h-0 flex-1 overflow-y-auto scroll-smooth p-4">
              <div ref={blockLibraryContentRef} className="grid gap-6">
                {BLOCK_GROUPS.map((group) => (
                  <section
                    key={group.value}
                    ref={(element) => {
                      blockLibrarySectionRefs.current[group.value] = element;
                    }}
                    className="scroll-mt-4"
                  >
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{group.label}</p>
                    <div className="grid gap-3">
                      {BLOCK_LIBRARY.filter((item) => item.group === group.value).map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={`${item.type}-${item.variant ?? item.title}`}
                            type="button"
                            onClick={() => addBlock(item)}
                            className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[color:rgba(145,139,118,0.55)] hover:shadow-md"
                          >
                            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-50 text-[var(--grey-olive)]">
                              <Icon size={22} />
                            </span>
                            <span className="mt-3 block text-lg font-light text-slate-950">{item.title}</span>
                            <span className="mt-1 block text-sm leading-5 text-slate-500">{item.description}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </main>

      {previewOpen ? (
        <PreviewModal
          article={article}
          nickname={nickname ?? "preview"}
          brokerName={brokerName}
          avatarUrl={profileData?.avatar_url ?? null}
          creci={brokerCreci}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
      {linkModal ? (
        <ArticleLinkModal
          editor={editorRefs.current[linkModal.editorId]}
          selection={linkModal}
          onClose={() => setLinkModal(null)}
          onApply={() => {
            syncParagraphEditor(linkModal.editorId);
            setLinkModal(null);
          }}
        />
      ) : null}
    </div>
  );
}

function Field({ label, help, children }: { label: React.ReactNode; help?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-600">
      <span className="flex items-center justify-between gap-3">
        <span>{label}</span>
        {help ? <span className="text-xs font-normal text-slate-400">{help}</span> : null}
      </span>
      {children}
    </label>
  );
}

function Help({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-slate-500">
      <Info size={11} />
      <span className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 hidden w-64 rounded-lg bg-slate-950 px-3 py-2 text-xs leading-5 text-white shadow-lg group-hover:block">
        {text}
      </span>
    </span>
  );
}

function LocalFields({ article, updateArticle }: { article: ArtigoRow; updateArticle: <K extends keyof ArtigoRow>(key: K, value: ArtigoRow[K]) => void }) {
  return (
    <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--grey-olive)]">Campos obrigatórios para Local</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Field label="Nome do local"><input value={article.local_nome ?? ""} onChange={(event) => updateArticle("local_nome", event.target.value)} className="input-base" /></Field>
        <Field label="Categoria do local"><input value={article.local_categoria ?? ""} onChange={(event) => updateArticle("local_categoria", event.target.value)} className="input-base" /></Field>
        <Field label="Localização"><input value={article.localizacao_texto ?? ""} onChange={(event) => updateArticle("localizacao_texto", event.target.value)} className="input-base" /></Field>
        <Field label="Horário de funcionamento"><input value={article.local_horario_funcionamento ?? ""} onChange={(event) => updateArticle("local_horario_funcionamento", event.target.value)} className="input-base" /></Field>
        <Field label="Website"><input value={article.local_website_url ?? ""} onChange={(event) => updateArticle("local_website_url", event.target.value)} className="input-base" /></Field>
        <Field label="WhatsApp / telefone"><div className="grid gap-2 sm:grid-cols-2"><input value={article.local_whatsapp ?? ""} onChange={(event) => updateArticle("local_whatsapp", event.target.value)} className="input-base" placeholder="WhatsApp" /><input value={article.local_telefone ?? ""} onChange={(event) => updateArticle("local_telefone", event.target.value)} className="input-base" placeholder="Telefone" /></div></Field>
      </div>
    </div>
  );
}

function BlockEditor({
  block,
  index,
  editorRefs,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onOpenLink,
  onUpload,
  options,
}: {
  articleId: string;
  block: ArtigoBlock;
  index: number;
  editorRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  onChange: (block: ArtigoBlock) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onOpenLink: (selection: ArticleLinkSelection) => void;
  onUpload: (file: File, grupo: string, alt?: string) => Promise<UploadedMedia | null>;
  options: ArticleEditorOptions;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          {String(index + 1).padStart(2, "0")} · {blockLabel(block)}
        </span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onMoveUp} disabled={!canMoveUp} title="Mover para cima" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-35">
            <CaretUp size={16} />
          </button>
          <button type="button" onClick={onMoveDown} disabled={!canMoveDown} title="Mover para baixo" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-35">
            <CaretDown size={16} />
          </button>
          <button type="button" onClick={onRemove} title="Remover bloco" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600">
            <Trash size={16} />
          </button>
        </div>
      </div>
      {renderBlockFields(block, editorRefs, onChange, onOpenLink, onUpload, options)}
    </div>
  );
}

function renderBlockFields(
  block: ArtigoBlock,
  editorRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>,
  onChange: (block: ArtigoBlock) => void,
  onOpenLink: (selection: ArticleLinkSelection) => void,
  onUpload: (file: File, grupo: string, alt?: string) => Promise<UploadedMedia | null>,
  options: ArticleEditorOptions,
) {
  if (block.type === "paragraph") {
    return (
      <RichTextBlock
        block={block}
        editorRefs={editorRefs}
        onChange={onChange}
        onOpenLink={onOpenLink}
      />
    );
  }

  if (block.type === "heading") {
    const limit = block.data.level === 2 ? ARTICLE_LIMITS.h2 : ARTICLE_LIMITS.h3;
    return (
      <Field label={`Título H${block.data.level}`} help={`${block.data.content.length}/${limit}`}>
        <input value={block.data.content} maxLength={limit} onChange={(event) => onChange({ ...block, data: { ...block.data, content: event.target.value } })} className="input-base" />
      </Field>
    );
  }

  if (block.type === "quote") {
    return (
      <div className="grid gap-3">
        <Field label="Citação" help={`${block.data.content.length}/${ARTICLE_LIMITS.quote}`}>
          <textarea value={block.data.content} maxLength={ARTICLE_LIMITS.quote} onChange={(event) => onChange({ ...block, data: { ...block.data, content: event.target.value } })} className="min-h-28 input-base" />
        </Field>
        <Field label="Autor">
          <input value={block.data.author ?? ""} maxLength={ARTICLE_LIMITS.quoteAuthor} onChange={(event) => onChange({ ...block, data: { ...block.data, author: event.target.value } })} className="input-base" />
        </Field>
      </div>
    );
  }

  if (block.type === "list") {
    return (
      <Field label={block.data.style === "ordered" ? "Lista ordenada" : "Lista bullet"} help={`1 por linha, até ${ARTICLE_LIMITS.listItems} itens`}>
        <textarea value={block.data.items.join("\n")} onChange={(event) => onChange({ ...block, data: { ...block.data, items: event.target.value.split("\n").slice(0, ARTICLE_LIMITS.listItems) } })} className="min-h-32 input-base" />
      </Field>
    );
  }

  if (block.type === "image") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <MediaPreview url={block.data.url} alt={block.data.alt} />
        <div className="grid content-start gap-3">
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
            <ImageSquare size={16} /> Enviar imagem
            <input type="file" accept="image/*" className="hidden" onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const uploaded = await onUpload(file, "bloco_imagem", block.data.alt || file.name);
              if (uploaded) onChange({ ...block, data: { ...block.data, url: uploaded.url, alt: block.data.alt || file.name } });
            }} />
          </label>
          <Field label="Texto alternativo"><input value={block.data.alt} maxLength={ARTICLE_LIMITS.alt} onChange={(event) => onChange({ ...block, data: { ...block.data, alt: event.target.value } })} className="input-base" /></Field>
          <Field label="Legenda"><input value={block.data.caption ?? ""} maxLength={ARTICLE_LIMITS.caption} onChange={(event) => onChange({ ...block, data: { ...block.data, caption: event.target.value } })} className="input-base" /></Field>
        </div>
      </div>
    );
  }

  if (block.type === "gallery") {
    return (
      <GalleryBlockEditor
        block={block}
        onChange={onChange}
        onUpload={onUpload}
      />
    );
  }

  if (block.type === "youtube") {
    return <YouTubeBlockEditor block={block} onChange={onChange} />;
  }

  if (block.type === "cta") {
    const cta = ARTIGO_CTA_CONFIGS[block.data.ctaType];
    return (
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <p className="text-sm font-bold text-slate-950">{cta.title}</p>
        <p className="mt-1 text-sm leading-5 text-slate-500">{cta.subtitle}</p>
        <p className="mt-1 text-sm text-slate-500">Título, texto e ação são definidos pelo Corretor.one para manter consistência e conversão.</p>
      </div>
    );
  }

  if (block.type === "property_feature") {
    return (
      <div className="grid gap-3">
        <Field label="Imóvel em destaque">
          <select
            value={block.data.propertyId ?? ""}
            onChange={(event) => onChange({ ...block, data: { propertyId: event.target.value || null } })}
            className="input-base"
          >
            <option value="">Selecione um imóvel</option>
            {options.propertyOptions.map((property) => (
              <option key={property.id} value={property.id}>
                {formatPropertyOption(property)}
              </option>
            ))}
          </select>
        </Field>
        <p className="text-xs leading-5 text-slate-500">
          No artigo público, o card só aparece se o imóvel estiver publicado.
        </p>
      </div>
    );
  }

  if (block.type === "property_carousel") {
    return <PropertyCarouselBlockEditor block={block} onChange={onChange} options={options} />;
  }

  if (block.type === "button") return null;
  return null;
}

function PropertyCarouselBlockEditor({
  block,
  onChange,
  options,
}: {
  block: Extract<ArtigoBlock, { type: "property_carousel" }>;
  onChange: (block: ArtigoBlock) => void;
  options: ArticleEditorOptions;
}) {
  const filters = block.data.filters ?? {};

  function updateFilters(nextFilters: Partial<ArtigoPropertyCarouselFilters>) {
    onChange({ ...block, data: { ...block.data, filters: { ...filters, ...nextFilters } } });
  }

  function toggleCharacteristic(scope: "imovel" | "empreendimento", value: string) {
    const key = scope === "imovel" ? "caracteristicasImovel" : "caracteristicasEmpreendimento";
    const current = filters[key] ?? [];
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    updateFilters({ [key]: next } as Partial<ArtigoPropertyCarouselFilters>);
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 lg:grid-cols-2">
        <Field label="Título do bloco" help={`${block.data.title.length}/${ARTICLE_LIMITS.propertyCarouselTitle}`}>
          <input
            value={block.data.title}
            maxLength={ARTICLE_LIMITS.propertyCarouselTitle}
            onChange={(event) => onChange({ ...block, data: { ...block.data, title: event.target.value } })}
            className="input-base"
          />
        </Field>
        <Field label="Subtítulo" help={`${block.data.subtitle?.length ?? 0}/${ARTICLE_LIMITS.propertyCarouselSubtitle}`}>
          <input
            value={block.data.subtitle ?? ""}
            maxLength={ARTICLE_LIMITS.propertyCarouselSubtitle}
            onChange={(event) => onChange({ ...block, data: { ...block.data, subtitle: event.target.value } })}
            className="input-base"
          />
        </Field>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--grey-olive)]">Filtros combinados por AND</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Cidade">
            <input value={filters.cidade ?? ""} onChange={(event) => updateFilters({ cidade: event.target.value })} className="input-base" placeholder="São Paulo" />
          </Field>
          <Field label="Bairro">
            <input value={filters.bairro ?? ""} onChange={(event) => updateFilters({ bairro: event.target.value })} className="input-base" placeholder="Santana" />
          </Field>
          <Field label="Empreendimento">
            <select value={filters.empreendimentoId ?? ""} onChange={(event) => updateFilters({ empreendimentoId: event.target.value || null })} className="input-base">
              <option value="">Todos</option>
              {options.enterpriseOptions.map((enterprise) => (
                <option key={enterprise.id} value={enterprise.id}>
                  {[enterprise.nome, enterprise.bairro, enterprise.cidade].filter(Boolean).join(" · ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Dormitórios mín."><input type="number" min={0} value={filters.dormitoriosMin ?? ""} onChange={(event) => updateFilters({ dormitoriosMin: numberOrNull(event.target.value) })} className="input-base" /></Field>
          <Field label="Suítes mín."><input type="number" min={0} value={filters.suitesMin ?? ""} onChange={(event) => updateFilters({ suitesMin: numberOrNull(event.target.value) })} className="input-base" /></Field>
          <Field label="Vagas mín."><input type="number" min={0} value={filters.vagasMin ?? ""} onChange={(event) => updateFilters({ vagasMin: numberOrNull(event.target.value) })} className="input-base" /></Field>
          <Field label="Valor mín."><input type="number" min={0} value={filters.valorMin ?? ""} onChange={(event) => updateFilters({ valorMin: numberOrNull(event.target.value) })} className="input-base" /></Field>
          <Field label="Valor máx."><input type="number" min={0} value={filters.valorMax ?? ""} onChange={(event) => updateFilters({ valorMax: numberOrNull(event.target.value) })} className="input-base" /></Field>
        </div>
      </div>

      <CharacteristicPicker
        title="Características do imóvel"
        values={filters.caracteristicasImovel ?? []}
        options={options.propertyCharacteristics}
        onToggle={(value) => toggleCharacteristic("imovel", value)}
      />
      <CharacteristicPicker
        title="Características do empreendimento"
        values={filters.caracteristicasEmpreendimento ?? []}
        options={options.enterpriseCharacteristics}
        onToggle={(value) => toggleCharacteristic("empreendimento", value)}
      />
    </div>
  );
}

function CharacteristicPicker({
  title,
  values,
  options,
  onToggle,
}: {
  title: string;
  values: string[];
  options: CaracteristicaCatalogoOption[];
  onToggle: (value: string) => void;
}) {
  const activeOptions = options.filter((item) => item.ativo !== false);
  if (!activeOptions.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="text-sm font-bold text-slate-700">{title}</p>
      <div className="mt-3 grid max-h-52 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
        {activeOptions.map((option) => (
          <label key={option.chave} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50">
            <input
              type="checkbox"
              checked={values.includes(option.chave)}
              onChange={() => onToggle(option.chave)}
              className="h-4 w-4 accent-slate-950"
            />
            <span>{option.label_pt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function RichTextBlock({ block, editorRefs, onChange, onOpenLink }: { block: Extract<ArtigoBlock, { type: "paragraph" }>; editorRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>; onChange: (block: ArtigoBlock) => void; onOpenLink: (selection: ArticleLinkSelection) => void }) {
  useEffect(() => {
    const editor = editorRefs.current[block.id];
    if (editor && editor.innerHTML !== block.data.content) editor.innerHTML = block.data.content;
  }, [block.data.content, block.id, editorRefs]);

  function exec(command: "bold" | "italic" | "underline") {
    const editor = editorRefs.current[block.id];
    if (!editor) return;
    editor.focus();
    document.execCommand(command);
    onChange({ ...block, data: { content: editor.innerHTML } });
  }

  function openLinkFromSelection() {
    const editor = editorRefs.current[block.id];
    if (!editor) return;
    onOpenLink(getArticleLinkSelection(editor));
  }

  function handleEditorClick(event: React.MouseEvent<HTMLDivElement>) {
    const editor = editorRefs.current[block.id];
    const anchor = findClosestArticleAnchor(event.target, editor);
    if (!anchor) return;
    event.preventDefault();
    const range = document.createRange();
    range.selectNode(anchor);
    onOpenLink({ range, href: anchor.getAttribute("href") ?? "", label: anchor.textContent ?? "" });
  }

  return (
    <div className="rounded-xl border border-slate-200">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 p-2">
        <ToolbarButton onClick={() => exec("bold")} icon={<TextB size={16} />} label="Negrito" />
        <ToolbarButton onClick={() => exec("italic")} icon={<TextItalic size={16} />} label="Itálico" />
        <ToolbarButton onClick={() => exec("underline")} icon={<TextUnderline size={16} />} label="Sublinhado" />
        <ToolbarButton onClick={openLinkFromSelection} icon={<LinkSimple size={16} />} label="Link" />
      </div>
      <div
        ref={(element) => {
          editorRefs.current[block.id] = element;
        }}
        contentEditable
        suppressContentEditableWarning
        onClick={handleEditorClick}
        onInput={(event) => onChange({ ...block, data: { content: event.currentTarget.innerHTML } })}
        className="min-h-40 px-4 py-3 text-lg font-light leading-8 outline-none [&_a]:underline [&_a]:underline-offset-4 [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p+p]:mt-3 [&_ul]:list-disc [&_ul]:pl-6"
      />
      <div className="border-t border-slate-200 px-3 py-2 text-right text-xs text-slate-400">
        {getReadableTextFromHtml(block.data.content).length}/{ARTICLE_LIMITS.paragraph}
      </div>
    </div>
  );
}

function GalleryBlockEditor({
  block,
  onChange,
  onUpload,
}: {
  block: Extract<ArtigoBlock, { type: "gallery" }>;
  onChange: (block: ArtigoBlock) => void;
  onUpload: (file: File, grupo: string, alt?: string) => Promise<UploadedMedia | null>;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const images = block.data.images.filter((image) => image.url);

  function updateImages(nextImages: typeof images) {
    onChange({ ...block, data: { images: nextImages } });
  }

  function moveImage(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= images.length) return;
    const nextImages = [...images];
    const [image] = nextImages.splice(index, 1);
    if (!image) return;
    nextImages.splice(nextIndex, 0, image);
    updateImages(nextImages);
  }

  function removeImage(index: number) {
    updateImages(images.filter((_, currentIndex) => currentIndex !== index));
  }

  function dropImage(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    const nextImages = [...images];
    const [image] = nextImages.splice(dragIndex, 1);
    if (!image) {
      setDragIndex(null);
      return;
    }
    nextImages.splice(targetIndex, 0, image);
    updateImages(nextImages);
    setDragIndex(null);
  }

  return (
    <div className="grid gap-3">
      {images.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image, index) => (
            <div
              key={`${image.url}-${index}`}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => dropImage(index)}
              onDragEnd={() => setDragIndex(null)}
              className={`group overflow-hidden rounded-2xl border bg-white transition ${dragIndex === index ? "border-[var(--grey-olive)] opacity-60" : "border-slate-200"}`}
            >
              <div className="relative aspect-[4/3] bg-slate-100">
                <Image src={image.url} alt={image.alt || ""} fill sizes="(min-width: 768px) 360px, 100vw" className="object-cover" unoptimized />
                <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-bold text-slate-700 shadow-sm backdrop-blur">
                  <DotsSixVertical size={14} />
                  Arrastar
                </div>
                <button type="button" onClick={() => removeImage(index)} title="Remover imagem" className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-600 shadow-sm backdrop-blur transition hover:bg-white">
                  <Trash size={15} />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 p-2">
                <span className="truncate text-xs text-slate-500">{image.alt || `Imagem ${index + 1}`}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0} title="Mover para esquerda" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-35">
                    <CaretUp size={14} />
                  </button>
                  <button type="button" onClick={() => moveImage(index, 1)} disabled={index === images.length - 1} title="Mover para direita" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-35">
                    <CaretDown size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
          Nenhuma imagem adicionada na galeria.
        </div>
      )}
      <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
        <ImageSquare size={16} /> Enviar imagens para galeria
        <input type="file" accept="image/*" multiple className="hidden" onChange={async (event) => {
          const files = Array.from(event.target.files ?? []);
          const uploadedImages = [];
          for (const file of files) {
            const uploaded = await onUpload(file, "bloco_galeria", file.name);
            if (uploaded) uploadedImages.push({ url: uploaded.url, alt: file.name, caption: "" });
          }
          if (uploadedImages.length) updateImages([...images, ...uploadedImages].slice(0, 12));
          event.currentTarget.value = "";
        }} />
      </label>
    </div>
  );
}

function YouTubeBlockEditor({
  block,
  onChange,
}: {
  block: Extract<ArtigoBlock, { type: "youtube" }>;
  onChange: (block: ArtigoBlock) => void;
}) {
  const videoId = extractYouTubeVideoId(block.data.url) ?? block.data.videoId;
  return (
    <div className="grid gap-3">
      <Field label="URL do YouTube">
        <input
          value={block.data.url}
          onChange={(event) => {
            const url = event.target.value;
            onChange({ ...block, data: { ...block.data, url, videoId: extractYouTubeVideoId(url) ?? "" } });
          }}
          className="input-base"
          placeholder="https://www.youtube.com/watch?v=..."
        />
      </Field>
      <Field label="Legenda opcional" help={`${block.data.caption?.length ?? 0}/${ARTICLE_LIMITS.caption}`}>
        <input
          value={block.data.caption ?? ""}
          maxLength={ARTICLE_LIMITS.caption}
          onChange={(event) => onChange({ ...block, data: { ...block.data, caption: event.target.value } })}
          className="input-base"
          placeholder="Contexto breve do vídeo"
        />
      </Field>
      {videoId ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm">
          <iframe
            className="aspect-video w-full"
            src={`https://www.youtube-nocookie.com/embed/${videoId}`}
            title="Prévia do vídeo do artigo"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
          Cole uma URL válida do YouTube para visualizar o vídeo.
        </div>
      )}
    </div>
  );
}

function ToolbarButton({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button type="button" title={label} onMouseDown={(event) => event.preventDefault()} onClick={onClick} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100">{icon}</button>;
}

function PreviewModal({
  article,
  nickname,
  brokerName,
  avatarUrl,
  creci,
  onClose,
}: {
  article: ArtigoRow;
  nickname: string;
  brokerName: string;
  avatarUrl?: string | null;
  creci?: string | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-4">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--grey-olive)]">Visualização rápida</p>
          <button type="button" onClick={onClose} className="h-10 w-10 rounded-xl border border-slate-200"><X size={18} className="mx-auto" /></button>
        </div>
        {article.capa_url ? <div className="relative aspect-[16/7]"><Image src={article.capa_url} alt={article.titulo} fill sizes="960px" className="object-cover" unoptimized /></div> : null}
        <article className="px-6 py-10 md:px-10 md:py-14">
          <div className="mx-auto max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--grey-olive)]">{getArticleCategoryLabel(article.categoria)}</p>
            <h1 className="mt-3 text-4xl font-light leading-tight text-slate-950 md:text-5xl">{article.titulo}</h1>
            {article.subtitulo ? <p className="mt-4 text-lg font-light leading-8 text-slate-600">{article.subtitulo}</p> : null}
          </div>
          <div className="mt-10">
            <ArticleContentRenderer
              content={article.conteudo_blocos}
              nickname={nickname}
              brokerName={brokerName}
              avatarUrl={avatarUrl}
              creci={creci}
              interactive={false}
            />
          </div>
        </article>
      </div>
    </div>
  );
}

function MediaPreview({ url, alt, large = false }: { url: string; alt: string; large?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 ${large ? "aspect-[16/9]" : "aspect-[4/3]"}`}>
      {url ? <Image src={url} alt={alt || ""} fill sizes="(min-width: 768px) 420px, 100vw" className="object-cover" unoptimized /> : <div className="flex h-full items-center justify-center text-slate-400"><ImageSquare size={32} /></div>}
    </div>
  );
}

function createBlock(item: (typeof BLOCK_LIBRARY)[number]): ArtigoBlock {
  const id = crypto.randomUUID();
  if (item.type === "paragraph") return { id, type: "paragraph", data: { content: "<p></p>" } };
  if (item.type === "heading") return { id, type: "heading", data: { level: item.variant === "h3" ? 3 : 2, content: "" } };
  if (item.type === "quote") return { id, type: "quote", data: { content: "", author: "" } };
  if (item.type === "list") return { id, type: "list", data: { style: item.variant === "ordered" ? "ordered" : "bullet", items: [""] } };
  if (item.type === "image") return { id, type: "image", data: { url: "", alt: "", caption: "" } };
  if (item.type === "gallery") return { id, type: "gallery", data: { images: [] } };
  if (item.type === "youtube") return { id, type: "youtube", data: { url: "", videoId: "", caption: "" } };
  if (item.type === "property_feature") return { id, type: "property_feature", data: { propertyId: null } };
  if (item.type === "property_carousel") {
    return {
      id,
      type: "property_carousel",
      data: {
        title: "Imóveis selecionados",
        subtitle: "Uma curadoria de opções relacionadas ao tema deste artigo.",
        filters: {},
      },
    };
  }
  if (item.type === "cta") {
    const ctaType =
      item.variant === "whatsapp" || item.variant === "phone" || item.variant === "inventory" || item.variant === "advertise"
        ? item.variant
        : "curadoria";
    return { id, type: "cta", data: { ctaType } };
  }
  return { id, type: "button", data: { label: "Saiba mais", url: "/", kind: "internal" } };
}

function normalizeClientContent(value: unknown): ArtigoConteudo {
  if (value && typeof value === "object" && Array.isArray((value as { blocks?: unknown }).blocks)) {
    return { version: 1, blocks: (value as { blocks: ArtigoBlock[] }).blocks ?? [] };
  }
  return { version: 1, blocks: [] };
}

function blockLabel(block: ArtigoBlock) {
  if (block.type === "heading") return `Título H${block.data.level}`;
  if (block.type === "cta") return ctaTitle(block.data.ctaType);
  if (block.type === "property_feature") return "Imóvel em destaque";
  if (block.type === "property_carousel") return "Carrossel de imóveis";
  return block.type;
}

function ctaTitle(type: ArtigoCtaType) {
  const config = ARTIGO_CTA_CONFIGS[type];
  return `CTA: ${config.buttonLabel}`;
}

function statusLabel(status: ArtigoStatus) {
  if (status === "PUBLICADO") return "Publicado";
  if (status === "ARQUIVADO") return "Arquivado";
  return "Rascunho";
}

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function numberOrNull(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatPropertyOption(property: PropertyOption) {
  const location = [property.bairro, property.cidade].filter(Boolean).join(" - ");
  const stats = [
    property.dormitorios ? `${property.dormitorios} dorm.` : null,
    property.suites ? `${property.suites} suíte(s)` : null,
    property.vagas ? `${property.vagas} vaga(s)` : null,
  ].filter(Boolean);
  return [property.codigo, property.titulo || property.tipo || "Imóvel", location, stats.join(", ")].filter(Boolean).join(" · ");
}
