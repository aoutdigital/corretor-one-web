"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import type React from "react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowSquareOut,
  Buildings,
  CalendarBlank,
  CaretDown,
  CaretUp,
  ChatCircle,
  Check,
  DotsSixVertical,
  Eye,
  FloppyDisk,
  House,
  ImageSquare,
  Info,
  LinkSimple,
  ListBullets,
  MagnifyingGlass,
  MegaphoneSimple,
  NotePencil,
  Phone,
  Plus,
  Quotes,
  SlidersHorizontal,
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
  ARTIGO_MAX_IMAGES,
  ARTIGO_CTA_CONFIGS,
  ARTIGO_CATEGORIAS,
  extractYouTubeVideoId,
  getArticleCategoryLabel,
  getReadableTextFromHtml,
  hasLongUppercaseSequence,
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
type ArticleUploadOptions = { consumesImageSlot?: boolean };
type ArtigosResponse = { config: { ordenacao_publica: ArtigosOrdenacao } };
type PropertyOptionsResponse = { items: PropertyOption[] };
type PropertyOption = {
  id: string;
  codigo?: string | null;
  label?: string | null;
  titulo?: string | null;
  status?: string | null;
  finalidade?: string | null;
  tipo_negociacao?: string | null;
  tipo?: string | null;
  subtipo?: string | null;
  area_util?: number | null;
  area_total?: number | null;
  logradouro?: string | null;
  numero?: string | null;
  bairro_comercial?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  dormitorios?: number | null;
  suites?: number | null;
  banheiros?: number | null;
  vagas?: number | null;
  preco_venda?: number | null;
  preco_locacao?: number | null;
  capa_url_publica_thumb_webp?: string | null;
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
type PropertyCarouselMetaResponse = {
  total: number;
  cities: string[];
  neighborhoods: string[];
  enterprises: EnterpriseOption[];
};

const DRAFT_TITLE_PLACEHOLDERS = new Set(["sem título", "sem titulo", "novo artigo", "novo artigo do corretor"]);

type PublishRequirement = {
  label: string;
  description: string;
  done: boolean;
};

function isDraftTitlePlaceholder(value?: string | null) {
  return DRAFT_TITLE_PLACEHOLDERS.has((value ?? "").trim().toLocaleLowerCase("pt-BR"));
}

function getEditableArticleTitle(article?: ArtigoRow | null) {
  if (!article?.titulo || isDraftTitlePlaceholder(article.titulo)) return "";
  return article.titulo;
}

function countArticleImages(article: ArtigoRow | null): number {
  if (!article) return 0;
  return article.conteudo_blocos.blocks.reduce((total, block) => {
    if (block.type === "image") return total + (block.data.url ? 1 : 0);
    if (block.type === "gallery") return total + block.data.images.filter((image) => image.url).length;
    return total;
  }, 0);
}

function getPublishRequirements(article: ArtigoRow | null, imageCount: number): PublishRequirement[] {
  if (!article) return [];
  const title = getEditableArticleTitle(article).trim();
  const subtitle = article.subtitulo?.trim() ?? "";
  const requirements: PublishRequirement[] = [
    {
      label: "Título do artigo",
      description: "Informe um título real com pelo menos 8 caracteres.",
      done: title.length >= 8 && !hasLongUppercaseSequence(title),
    },
    {
      label: "Subtítulo",
      description: "Adicione uma frase curta para complementar o título.",
      done: subtitle.length > 0 && !hasLongUppercaseSequence(subtitle),
    },
    {
      label: "Imagem de capa",
      description: "Envie uma imagem principal para representar o artigo.",
      done: Boolean(article.capa_url),
    },
    {
      label: "Conteúdo",
      description: "Insira pelo menos um bloco no corpo do artigo.",
      done: article.conteudo_blocos.blocks.length > 0,
    },
    {
      label: "Limite de imagens",
      description: `Use no máximo ${ARTIGO_MAX_IMAGES} imagens nos blocos do artigo.`,
      done: imageCount <= ARTIGO_MAX_IMAGES,
    },
  ];

  if (article.categoria === "LOCAL") {
    requirements.push(
      {
        label: "Nome do local",
        description: "Informe o nome do local citado no artigo.",
        done: Boolean(article.local_nome?.trim()),
      },
      {
        label: "Categoria do local",
        description: "Informe a categoria do local para organizar o conteúdo.",
        done: Boolean(article.local_categoria?.trim()),
      },
      {
        label: "Localização do local",
        description: "Informe bairro, cidade ou endereço de referência.",
        done: Boolean(article.localizacao_texto?.trim()),
      },
    );
  }

  return requirements;
}

function cloneArticleSnapshot(article: ArtigoRow): ArtigoRow {
  return {
    ...article,
    tags: [...article.tags],
    conteudo_blocos: {
      version: article.conteudo_blocos.version,
      blocks: article.conteudo_blocos.blocks.map((block) => structuredClone(block)),
    },
  };
}

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

type BlockLibraryItem = (typeof BLOCK_LIBRARY)[number];

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
  const [historyPast, setHistoryPast] = useState<ArtigoRow[]>([]);
  const [historyFuture, setHistoryFuture] = useState<ArtigoRow[]>([]);
  const [activeGroup, setActiveGroup] = useState<BlockGroup>("titulos");
  const [insertMenuIndex, setInsertMenuIndex] = useState<number | null>(null);
  const [draggedBlockItem, setDraggedBlockItem] = useState<BlockLibraryItem | null>(null);
  const [dragOverInsertIndex, setDragOverInsertIndex] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [linkModal, setLinkModal] = useState<LinkModalState | null>(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [publishChecklistOpen, setPublishChecklistOpen] = useState(false);
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
        apiFetchWithAuth<PropertyOptionsResponse>("/api/artigos/property-options"),
        apiFetchWithAuth<EnterpriseOption[]>("/api/empreendimentos"),
        apiFetchWithAuth<CaracteristicaCatalogoOption[]>("/api/caracteristicas/catalogo?escopo=IMOVEL"),
        apiFetchWithAuth<CaracteristicaCatalogoOption[]>("/api/caracteristicas/catalogo?escopo=EMPREENDIMENTO"),
      ]);

      if (articleResult.ok) {
        setArticle({ ...articleResult.data, conteudo_blocos: normalizeClientContent(articleResult.data.conteudo_blocos) });
        setHistoryPast([]);
        setHistoryFuture([]);
      }
      else setError(articleResult.error);

      if (profileResult.ok) {
        setProfileData(profileResult.data);
        setNickname(profileResult.data.nickname ?? null);
      }
      if (artigosResult.ok) setOrdenacaoPublica(artigosResult.data.config.ordenacao_publica);
      if (propertiesResult.ok) setPropertyOptions(propertiesResult.data.items ?? []);
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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (isTyping || (!event.metaKey && !event.ctrlKey)) return;

      const key = event.key.toLowerCase();
      if (key === "z" && event.shiftKey) {
        event.preventDefault();
        redoArticleChange();
        return;
      }
      if (key === "z") {
        event.preventDefault();
        undoArticleChange();
        return;
      }
      if (key === "y") {
        event.preventDefault();
        redoArticleChange();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [article, historyPast, historyFuture]);

  const editableTitle = getEditableArticleTitle(article);
  const titleHasCaps = Boolean(editableTitle && hasLongUppercaseSequence(editableTitle));
  const subtitleHasCaps = Boolean(article?.subtitulo && hasLongUppercaseSequence(article.subtitulo));
  const previewPath = nickname && article?.status === "PUBLICADO" ? `/${nickname}/artigos/${article.slug}` : null;
  const showManualOrder = ordenacaoPublica === "MANUAL";
  const articleImageCount = countArticleImages(article);
  const remainingArticleImages = Math.max(ARTIGO_MAX_IMAGES - articleImageCount, 0);
  const publishRequirements = getPublishRequirements(article, articleImageCount);
  const publishPendencies = publishRequirements.filter((requirement) => !requirement.done);
  const canPublish = publishPendencies.length === 0;
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
  const canUndo = historyPast.length > 0;
  const canRedo = historyFuture.length > 0;

  function commitArticleChange(updater: (current: ArtigoRow) => ArtigoRow) {
    if (!article) return;
    const nextArticle = updater(article);
    if (nextArticle === article) return;
    setHistoryPast((current) => [...current.slice(-49), cloneArticleSnapshot(article)]);
    setHistoryFuture([]);
    setArticle(nextArticle);
  }

  function undoArticleChange() {
    const previousArticle = historyPast.at(-1);
    if (!article || !previousArticle) return;
    setHistoryPast((current) => current.slice(0, -1));
    setHistoryFuture((current) => [cloneArticleSnapshot(article), ...current.slice(0, 49)]);
    setArticle(cloneArticleSnapshot(previousArticle));
    setInsertMenuIndex(null);
    setDragOverInsertIndex(null);
  }

  function redoArticleChange() {
    const nextArticle = historyFuture[0];
    if (!article || !nextArticle) return;
    setHistoryFuture((current) => current.slice(1));
    setHistoryPast((current) => [...current.slice(-49), cloneArticleSnapshot(article)]);
    setArticle(cloneArticleSnapshot(nextArticle));
    setInsertMenuIndex(null);
    setDragOverInsertIndex(null);
  }

  function updateArticle<K extends keyof ArtigoRow>(key: K, value: ArtigoRow[K]) {
    commitArticleChange((current) => ({ ...current, [key]: value }));
  }

  function updateBlock(index: number, block: ArtigoBlock) {
    commitArticleChange((current) => {
      const blocks = [...current.conteudo_blocos.blocks];
      blocks[index] = block;
      return { ...current, conteudo_blocos: { version: 1, blocks } };
    });
  }

  function addBlock(item: BlockLibraryItem, insertIndex?: number) {
    commitArticleChange((current) => {
      const blocks = [...current.conteudo_blocos.blocks];
      const nextIndex = typeof insertIndex === "number" ? Math.min(Math.max(insertIndex, 0), blocks.length) : blocks.length;
      blocks.splice(nextIndex, 0, createBlock(item));
      return { ...current, conteudo_blocos: { version: 1, blocks } };
    });
    setInsertMenuIndex(null);
    setDragOverInsertIndex(null);
    setDraggedBlockItem(null);
  }

  function removeBlock(index: number) {
    commitArticleChange((current) => ({
      ...current,
      conteudo_blocos: { version: 1, blocks: current.conteudo_blocos.blocks.filter((_, currentIndex) => currentIndex !== index) },
    }));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    commitArticleChange((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.conteudo_blocos.blocks.length) return current;
      const blocks = [...current.conteudo_blocos.blocks];
      const [block] = blocks.splice(index, 1);
      if (!block) return current;
      blocks.splice(nextIndex, 0, block);
      return { ...current, conteudo_blocos: { version: 1, blocks } };
    });
  }

  function handleBlockLibraryDragStart(event: React.DragEvent<HTMLButtonElement>, item: BlockLibraryItem) {
    setDraggedBlockItem(item);
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/plain", `${item.type}:${item.variant ?? item.title}`);
  }

  function handleBlockLibraryDragEnd() {
    setDraggedBlockItem(null);
    setDragOverInsertIndex(null);
  }

  function handleInsertDragOver(index: number, event: React.DragEvent<HTMLDivElement>) {
    if (!draggedBlockItem) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDragOverInsertIndex(index);
  }

  function handleInsertDrop(index: number, event: React.DragEvent<HTMLDivElement>) {
    if (!draggedBlockItem) return;
    event.preventDefault();
    addBlock(draggedBlockItem, index);
  }

  async function uploadMedia(file: File, grupo: string, alt?: string, options?: ArticleUploadOptions): Promise<UploadedMedia | null> {
    if (!article) return null;
    if (options?.consumesImageSlot !== false && countArticleImages(article) >= ARTIGO_MAX_IMAGES) {
      setError(`Este artigo já atingiu o limite de ${ARTIGO_MAX_IMAGES} imagens.`);
      return null;
    }
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("ref_tipo", "ARTIGO");
    form.append("ref_id", article.id);
    form.append("grupo", grupo);
    form.append("alt", alt || article.titulo || file.name);
    form.append("apply_watermark", "true");
    form.append("filename_base", `${article.slug || article.titulo || "artigo"}-${grupo}`);
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
      const uploaded = await uploadMedia(file, "capa", article?.titulo ?? file.name, {
        consumesImageSlot: false,
      });
      if (uploaded) updateArticle("capa_url", uploaded.url);
    } finally {
      setCoverUploading(false);
    }
  }

  function syncParagraphEditor(editorId: string) {
    const editor = editorRefs.current[editorId];
    if (!editor) return;
    commitArticleChange((current) => {
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

  async function save(status?: ArtigoStatus): Promise<boolean> {
    if (!article) return false;
    if (countArticleImages(article) > ARTIGO_MAX_IMAGES) {
      setError(`Este artigo tem mais de ${ARTIGO_MAX_IMAGES} imagens. Remova algumas imagens antes de salvar.`);
      return false;
    }
    const requestedStatus = status ?? article.status;
    const titleForSave = getEditableArticleTitle(article).trim();
    setSaving(true);
    setError(null);
    setSuccess(null);
    const result = await apiFetchWithAuth<ArtigoRow>(`/api/artigos/${article.id}`, {
      method: "PATCH",
      body: JSON.stringify({ ...article, titulo: titleForSave, status: requestedStatus, slug: undefined }),
    });
    setSaving(false);

    if (result.ok) {
      setArticle({ ...result.data, conteudo_blocos: normalizeClientContent(result.data.conteudo_blocos) });
      setSuccess(status === "PUBLICADO" ? "Artigo publicado." : "Artigo salvo.");
      return true;
    } else {
      setError(result.error);
      return false;
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
              <h1 className="max-w-[52vw] overflow-x-auto whitespace-nowrap text-xl font-light text-slate-950 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{editableTitle || "Artigo sem título"}</h1>
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
            <button
              type="button"
              onClick={undoArticleChange}
              disabled={!canUndo}
              title="Desfazer"
              aria-label="Desfazer"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ArrowCounterClockwise size={19} />
            </button>
            <button
              type="button"
              onClick={redoArticleChange}
              disabled={!canRedo}
              title="Refazer"
              aria-label="Refazer"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ArrowClockwise size={19} />
            </button>
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
                        if (status === "PUBLICADO") {
                          setPublishChecklistOpen(true);
                          return;
                        }
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
            <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                  <Field label="Categoria do artigo">
                    <div className="relative">
                      <select
                        value={article.categoria}
                        onChange={(event) => updateArticle("categoria", event.target.value as ArtigoCategoria)}
                        className="input-base appearance-none pr-12"
                      >
                        {ARTIGO_CATEGORIAS.map((category) => (
                          <option key={category.value} value={category.value}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                      <CaretDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} weight="bold" />
                    </div>
                  </Field>
                  <Field label="Título" help={`${editableTitle.length}/${ARTICLE_LIMITS.title}`}>
                    <input
                      value={editableTitle}
                      placeholder="Digite o título do artigo"
                      maxLength={ARTICLE_LIMITS.title}
                      onChange={(event) => updateArticle("titulo", event.target.value)}
                      className={`input-base ${titleHasCaps ? "border-red-300" : ""}`}
                    />
                    {titleHasCaps ? <p className="mt-1 text-xs text-red-600">Evite palavras em caixa alta.</p> : null}
                  </Field>
                </div>
                <Field label="Subtítulo" help={`${article.subtitulo?.length ?? 0}/${ARTICLE_LIMITS.subtitle}`}>
                  <input
                    value={article.subtitulo ?? ""}
                    placeholder="Uma frase curta que complemente o título"
                    maxLength={ARTICLE_LIMITS.subtitle}
                    onChange={(event) => updateArticle("subtitulo", event.target.value)}
                    className={`input-base ${subtitleHasCaps ? "border-red-300" : ""}`}
                  />
                  {subtitleHasCaps ? <p className="mt-1 text-xs text-red-600">Evite palavras em caixa alta.</p> : null}
                </Field>
                <Field label="Imagem de capa">
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <div className="relative h-[260px] overflow-hidden md:h-[320px] 2xl:h-[360px]">
                      {article.capa_url ? (
                        <Image src={article.capa_url} alt={article.titulo} fill sizes="(min-width: 1024px) 760px, 100vw" className="object-cover" unoptimized />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                          <ImageSquare size={42} />
                          <span className="text-sm font-medium">Nenhuma capa enviada</span>
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
              <aside className="self-start rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--grey-olive)]">SEO</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">Campos opcionais para melhorar a prévia em buscadores e compartilhamentos.</p>
                </div>
                <div className="grid gap-4">
                <Field label={<span className="inline-flex items-center gap-1">Meta title <Help text="Título exibido em buscadores e compartilhamentos. Ideal: até 60 caracteres." /></span>}>
                  <input value={article.meta_title ?? ""} maxLength={70} onChange={(event) => updateArticle("meta_title", event.target.value)} className="input-base bg-white" />
                </Field>
                <Field label={<span className="inline-flex items-center gap-1">Meta description <Help text="Resumo usado por buscadores. Ajuda a aumentar o clique quando descreve bem o conteúdo." /></span>}>
                  <textarea value={article.meta_description ?? ""} maxLength={180} onChange={(event) => updateArticle("meta_description", event.target.value)} className="min-h-[180px] input-base bg-white" />
                </Field>
                </div>
              </aside>
            </div>

            {article.categoria === "LOCAL" ? <LocalFields article={article} updateArticle={updateArticle} /> : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--grey-olive)]">Blocos inseridos</p>
                <h2 className="mt-2 text-3xl font-light">Construção do artigo</h2>
              </div>
              <div className={`rounded-full px-4 py-2 text-sm font-bold ${remainingArticleImages <= 0 ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                {articleImageCount}/{ARTIGO_MAX_IMAGES} imagens
              </div>
            </div>

            <div className="space-y-2">
              {article.conteudo_blocos.blocks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[var(--grey-olive)] shadow-sm">
                    <Plus size={22} weight="bold" />
                  </div>
                  <h3 className="mt-4 text-2xl font-light text-slate-950">Insira o primeiro bloco do artigo</h3>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                    Comece com um título, um parágrafo, uma imagem, um imóvel ou uma chamada pronta do Corretor.one.
                  </p>
                  <button
                    type="button"
                    onClick={() => setInsertMenuIndex(0)}
                    className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    Adicionar primeiro bloco
                    <Plus size={16} weight="bold" />
                  </button>
                </div>
              ) : (
                <>
                  <BlockInsertPoint
                    index={0}
                    active={insertMenuIndex === 0}
                    isDragTarget={dragOverInsertIndex === 0}
                    onOpen={() => setInsertMenuIndex(0)}
                    onDragOver={handleInsertDragOver}
                    onDragLeave={() => setDragOverInsertIndex(null)}
                    onDrop={handleInsertDrop}
                  />
                  {article.conteudo_blocos.blocks.map((block, index) => (
                    <Fragment key={block.id}>
                      <BlockEditor
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
                        remainingImageSlots={remainingArticleImages}
                      />
                      <BlockInsertPoint
                        index={index + 1}
                        active={insertMenuIndex === index + 1}
                        isDragTarget={dragOverInsertIndex === index + 1}
                        onOpen={() => setInsertMenuIndex(index + 1)}
                        onDragOver={handleInsertDragOver}
                        onDragLeave={() => setDragOverInsertIndex(null)}
                        onDrop={handleInsertDrop}
                      />
                    </Fragment>
                  ))}
                </>
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
                            draggable
                            onDragStart={(event) => handleBlockLibraryDragStart(event, item)}
                            onDragEnd={handleBlockLibraryDragEnd}
                            onClick={() => addBlock(item)}
                            className="group cursor-grab rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[color:rgba(145,139,118,0.55)] hover:shadow-md active:cursor-grabbing"
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

      {insertMenuIndex !== null ? (
        <BlockInsertModal
          insertIndex={insertMenuIndex}
          onClose={() => setInsertMenuIndex(null)}
          onInsert={(item) => addBlock(item, insertMenuIndex)}
        />
      ) : null}
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
      {publishChecklistOpen ? (
        <PublishChecklistModal
          requirements={publishRequirements}
          canPublish={canPublish}
          saving={saving}
          uploading={uploading || coverUploading}
          onClose={() => setPublishChecklistOpen(false)}
          onPublish={async () => {
            if (!canPublish || saving || uploading || coverUploading) return;
            const published = await save("PUBLICADO");
            if (published) setPublishChecklistOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function PublishChecklistModal({
  requirements,
  canPublish,
  saving,
  uploading,
  onClose,
  onPublish,
}: {
  requirements: PublishRequirement[];
  canPublish: boolean;
  saving: boolean;
  uploading: boolean;
  onClose: () => void;
  onPublish: () => void;
}) {
  const pendingCount = requirements.filter((requirement) => !requirement.done).length;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--grey-olive)]">Publicação</p>
            <h2 className="mt-2 text-3xl font-light leading-tight text-slate-950">
              {canPublish ? "Tudo pronto para publicar" : "Revise as pendências do artigo"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {canPublish
                ? "O artigo atende aos requisitos básicos e já pode ir para o perfil público."
                : `${pendingCount} ${pendingCount === 1 ? "item precisa" : "itens precisam"} de ajuste antes da publicação.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
            aria-label="Fechar pendências de publicação"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-3 p-6">
          {requirements.map((requirement) => (
            <div
              key={requirement.label}
              className={`flex items-start gap-3 rounded-2xl border p-4 ${
                requirement.done ? "border-emerald-200 bg-emerald-50/70" : "border-amber-200 bg-amber-50/70"
              }`}
            >
              <span
                className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  requirement.done ? "bg-emerald-600 text-white" : "bg-white text-[var(--grey-olive)] shadow-sm"
                }`}
              >
                {requirement.done ? <Check size={15} weight="bold" /> : <span className="h-2 w-2 rounded-full bg-current" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-950">{requirement.label}</span>
                <span className="mt-1 block text-sm leading-5 text-slate-500">{requirement.description}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Voltar ao editor
          </button>
          <button
            type="button"
            onClick={onPublish}
            disabled={!canPublish || saving || uploading}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-55 ${
              canPublish ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-400"
            }`}
          >
            {saving ? <SpinnerGap size={16} className="animate-spin" /> : <Check size={16} weight="bold" />}
            {saving ? "Publicando..." : "Publicar artigo"}
          </button>
        </div>
      </div>
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

function BlockInsertPoint({
  index,
  active,
  isDragTarget,
  onOpen,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  index: number;
  active: boolean;
  isDragTarget: boolean;
  onOpen: () => void;
  onDragOver: (index: number, event: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (index: number, event: React.DragEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={`group relative py-2 transition ${isDragTarget ? "py-4" : ""}`}
      onDragOver={(event) => onDragOver(index, event)}
      onDragLeave={onDragLeave}
      onDrop={(event) => onDrop(index, event)}
    >
      <div
        className={`h-px transition ${
          active || isDragTarget ? "bg-[color:rgba(145,139,118,0.55)]" : "bg-slate-100 group-hover:bg-slate-200"
        }`}
      />
      <button
        type="button"
        onClick={onOpen}
        className={`absolute left-1/2 top-1/2 inline-flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-white text-slate-500 shadow-sm transition hover:border-[var(--grey-olive)] hover:text-[var(--grey-olive)] ${
          active || isDragTarget ? "border-[var(--grey-olive)] text-[var(--grey-olive)] opacity-100" : "border-slate-200 opacity-0 group-hover:opacity-100"
        }`}
        aria-label="Inserir bloco aqui"
        title="Inserir bloco aqui"
      >
        <Plus size={16} weight="bold" />
      </button>
    </div>
  );
}

function BlockInsertModal({
  insertIndex,
  onClose,
  onInsert,
}: {
  insertIndex: number;
  onClose: () => void;
  onInsert: (item: BlockLibraryItem) => void;
}) {
  const [selectedGroup, setSelectedGroup] = useState<BlockGroup>("titulos");
  const visibleItems = BLOCK_LIBRARY.filter((item) => item.group === selectedGroup);
  const positionLabel = insertIndex === 0 ? "no início do artigo" : `após o bloco ${insertIndex}`;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--grey-olive)]">Inserir bloco</p>
            <h2 className="mt-2 text-4xl font-light text-slate-950">Escolha o próximo bloco</h2>
            <p className="mt-2 text-sm text-slate-500">O bloco será inserido {positionLabel}.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
            aria-label="Fechar"
          >
            <X size={22} />
          </button>
        </div>

        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {BLOCK_GROUPS.map((group) => (
              <button
                key={group.value}
                type="button"
                onClick={() => setSelectedGroup(group.value)}
                className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-bold transition ${
                  selectedGroup === group.value
                    ? "bg-slate-950 text-white ring-2 ring-[var(--primary-blue)] ring-offset-1"
                    : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {group.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={`${item.group}-${item.type}-${item.variant ?? item.title}`}
                  type="button"
                  onClick={() => onInsert(item)}
                  className="group flex min-h-32 items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[color:rgba(145,139,118,0.58)] hover:shadow-md"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-stone-50 text-[var(--grey-olive)] transition group-hover:bg-stone-100">
                    <Icon size={23} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xl font-light text-slate-950">{item.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-slate-500">{item.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
            Cancelar
          </button>
        </div>
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
  remainingImageSlots,
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
  onUpload: (file: File, grupo: string, alt?: string, options?: ArticleUploadOptions) => Promise<UploadedMedia | null>;
  options: ArticleEditorOptions;
  remainingImageSlots: number;
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
      {renderBlockFields(block, editorRefs, onChange, onOpenLink, onUpload, options, remainingImageSlots)}
    </div>
  );
}

function renderBlockFields(
  block: ArtigoBlock,
  editorRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>,
  onChange: (block: ArtigoBlock) => void,
  onOpenLink: (selection: ArticleLinkSelection) => void,
  onUpload: (file: File, grupo: string, alt?: string, options?: ArticleUploadOptions) => Promise<UploadedMedia | null>,
  options: ArticleEditorOptions,
  remainingImageSlots: number,
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
      <ImageBlockEditor
        block={block}
        onChange={onChange}
        onUpload={onUpload}
        remainingImageSlots={remainingImageSlots}
      />
    );
  }

  if (block.type === "gallery") {
    return (
      <GalleryBlockEditor
        block={block}
        onChange={onChange}
        onUpload={onUpload}
        remainingImageSlots={remainingImageSlots}
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
    return <PropertyFeatureBlockEditor block={block} onChange={onChange} options={options} />;
  }

  if (block.type === "property_carousel") {
    return <PropertyCarouselBlockEditor block={block} onChange={onChange} options={options} />;
  }

  if (block.type === "button") return null;
  return null;
}

function PropertyFeatureBlockEditor({
  block,
  onChange,
  options,
}: {
  block: Extract<ArtigoBlock, { type: "property_feature" }>;
  onChange: (block: ArtigoBlock) => void;
  options: ArticleEditorOptions;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedProperty = options.propertyOptions.find((property) => property.id === block.data.propertyId) ?? null;

  function selectProperty(property: PropertyOption) {
    onChange({ ...block, data: { propertyId: property.id } });
    setPickerOpen(false);
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-950">Imóvel em destaque</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              No artigo público, o card só aparece se o imóvel estiver publicado.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition hover:border-stone-300 hover:text-stone-700"
          >
            <House size={16} />
            {selectedProperty ? "Trocar imóvel" : "Selecionar imóvel"}
          </button>
        </div>

        {selectedProperty ? (
          <SelectedPropertySummary property={selectedProperty} />
        ) : block.data.propertyId ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Imóvel selecionado não foi encontrado na lista carregada. Clique em Trocar imóvel para escolher novamente.
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500">
            Nenhum imóvel selecionado.
          </div>
        )}
      </div>

      {pickerOpen ? (
        <PropertyPickerModal
          properties={options.propertyOptions}
          selectedId={block.data.propertyId}
          onSelect={selectProperty}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
    </div>
  );
}

function SelectedPropertySummary({ property }: { property: PropertyOption }) {
  return (
    <div className="mt-4 flex gap-3 rounded-2xl border border-slate-200 bg-white p-3">
      <PropertyThumb property={property} className="h-20 w-24 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {property.codigo ? (
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-stone-700">
              {property.codigo}
            </span>
          ) : null}
          {property.status ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              {formatStatusLabel(property.status)}
            </span>
          ) : null}
        </div>
        <p className="mt-2 truncate text-sm font-bold text-slate-950">{getPropertyTitle(property)}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{formatPropertyAddress(property)}</p>
        <p className="mt-2 text-xs font-semibold text-slate-600">{formatPropertySpecs(property)}</p>
      </div>
    </div>
  );
}

function PropertyPickerModal({
  properties,
  selectedId,
  onSelect,
  onClose,
}: {
  properties: PropertyOption[];
  selectedId?: string | null;
  onSelect: (property: PropertyOption) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const filteredProperties = useMemo(() => {
    const normalizedQuery = normalizeOptionSearch(query);
    return properties
      .filter((property) => propertyMatchesQuery(property, normalizedQuery))
      .slice(0, 60);
  }, [properties, query]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <h3 className="text-3xl font-normal text-slate-950">Selecionar imóvel</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Busque por código, nome, endereço, bairro ou cidade.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800 transition hover:border-slate-300"
            aria-label="Fechar seleção de imóvel"
          >
            <X size={22} />
          </button>
        </div>

        <div className="border-b border-slate-200 p-6">
          <label className="relative block">
            <span className="pointer-events-none absolute left-5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <MagnifyingGlass size={18} />
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoFocus
              className="input-base"
              style={{ paddingLeft: "5rem" }}
              placeholder="Código, título ou endereço"
            />
          </label>
        </div>

        <div className="max-h-[58vh] overflow-y-auto p-4">
          {filteredProperties.length ? (
            <div className="grid gap-3">
              {filteredProperties.map((property) => {
                const selected = property.id === selectedId;
                return (
                  <button
                    key={property.id}
                    type="button"
                    onClick={() => onSelect(property)}
                    className={[
                      "flex w-full gap-3 rounded-2xl border p-3 text-left transition",
                      selected
                        ? "border-stone-400 bg-stone-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-stone-300 hover:bg-stone-50/40",
                    ].join(" ")}
                  >
                    <PropertyThumb property={property} className="h-20 w-28 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {property.codigo ? (
                          <span className="text-xs font-bold uppercase tracking-[0.12em] text-stone-700">
                            {property.codigo}
                          </span>
                        ) : null}
                        {property.status ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                            {formatStatusLabel(property.status)}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-950">{getPropertyTitle(property)}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{formatPropertyAddress(property)}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-600">{formatPropertySpecs(property)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
              Nenhum imóvel encontrado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PropertyThumb({ property, className }: { property: PropertyOption; className: string }) {
  const src = property.capa_url_publica_thumb_webp;
  return (
    <div className={`${className} overflow-hidden rounded-xl bg-slate-100`}>
      {src ? (
        <Image
          src={src}
          alt={getPropertyTitle(property)}
          width={160}
          height={120}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-slate-400">
          <ImageSquare size={24} />
        </div>
      )}
    </div>
  );
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
  const [queryModalOpen, setQueryModalOpen] = useState(false);
  const { meta, loading } = usePropertyCarouselMeta(filters);
  const filterChips = getPropertyCarouselFilterChips(filters, options, meta);

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

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--grey-olive)]">Lista de imóveis</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {filterChips.length ? (
                filterChips.map((chip) => (
                  <span key={chip} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {chip}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">Todos os imóveis publicados do corretor, sem filtros adicionais.</span>
              )}
            </div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-stone-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
              {loading ? <SpinnerGap size={16} className="animate-spin text-[var(--grey-olive)]" /> : <Check size={16} className="text-[var(--grey-olive)]" />}
              {loading ? "Atualizando contagem..." : formatCarouselCount(meta.total)}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setQueryModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-800 transition hover:border-[var(--grey-olive)] hover:text-[var(--grey-olive)]"
          >
            <SlidersHorizontal size={18} />
            Configurar imóveis
          </button>
        </div>
      </div>

      {queryModalOpen ? (
        <PropertyCarouselQueryModal
          initialFilters={filters}
          options={options}
          onClose={() => setQueryModalOpen(false)}
          onApply={(nextFilters) => {
            onChange({ ...block, data: { ...block.data, filters: nextFilters } });
            setQueryModalOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function PropertyCarouselQueryModal({
  initialFilters,
  options,
  onClose,
  onApply,
}: {
  initialFilters: ArtigoPropertyCarouselFilters;
  options: ArticleEditorOptions;
  onClose: () => void;
  onApply: (filters: ArtigoPropertyCarouselFilters) => void;
}) {
  const [step, setStep] = useState(0);
  const [draftFilters, setDraftFilters] = useState<ArtigoPropertyCarouselFilters>(initialFilters);
  const { meta, loading } = usePropertyCarouselMeta(draftFilters);
  const steps = ["Localização", "Perfil", "Valores", "Características"];
  const cityOptions = mergeTextOptions(meta.cities, draftFilters.cidade);
  const neighborhoodOptions = mergeTextOptions(meta.neighborhoods, draftFilters.bairro);
  const enterpriseOptions = mergeEnterpriseOptions(meta.enterprises, draftFilters.empreendimentoId);

  function updateDraft(nextFilters: Partial<ArtigoPropertyCarouselFilters>) {
    setDraftFilters((current) => ({ ...current, ...nextFilters }));
  }

  function toggleCharacteristic(scope: "imovel" | "empreendimento", value: string) {
    const key = scope === "imovel" ? "caracteristicasImovel" : "caracteristicasEmpreendimento";
    const current = draftFilters[key] ?? [];
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    updateDraft({ [key]: next } as Partial<ArtigoPropertyCarouselFilters>);
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--grey-olive)]">Carrossel de imóveis</p>
            <h3 className="mt-2 text-3xl font-light text-slate-950">Configurar imóveis</h3>
            <p className="mt-1 text-sm text-slate-500">Combine filtros. O carrossel público só exibe imóveis publicados.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 p-3 text-slate-600 transition hover:bg-slate-50">
            <X size={22} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 bg-slate-50 p-4 lg:border-b-0 lg:border-r">
            <div className="grid gap-2">
              {steps.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setStep(index)}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                    step === index ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-white"
                  }`}
                >
                  <span>{label}</span>
                  <span className={step === index ? "text-white/70" : "text-slate-400"}>{index + 1}</span>
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Prévia</p>
              <div className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-slate-800">
                {loading ? <SpinnerGap size={16} className="animate-spin text-[var(--grey-olive)]" /> : <Check size={16} className="text-[var(--grey-olive)]" />}
                {loading ? "Calculando..." : formatCarouselCount(meta.total)}
              </div>
            </div>
          </aside>

          <div className="min-h-0 overflow-y-auto p-6">
            {step === 0 ? (
              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Cidade">
                    <select
                      value={draftFilters.cidade ?? ""}
                      onChange={(event) => updateDraft({ cidade: event.target.value || null, bairro: null, empreendimentoId: null })}
                      className="input-base"
                    >
                      <option value="">Todas as cidades</option>
                      {cityOptions.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Bairro">
                    <select
                      value={draftFilters.bairro ?? ""}
                      onChange={(event) => updateDraft({ bairro: event.target.value || null, empreendimentoId: null })}
                      className="input-base"
                    >
                      <option value="">Todos os bairros</option>
                      {neighborhoodOptions.map((neighborhood) => (
                        <option key={neighborhood} value={neighborhood}>
                          {neighborhood}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Empreendimento">
                  <select value={draftFilters.empreendimentoId ?? ""} onChange={(event) => updateDraft({ empreendimentoId: event.target.value || null })} className="input-base">
                    <option value="">Todos os empreendimentos</option>
                    {enterpriseOptions.map((enterprise) => (
                      <option key={enterprise.id} value={enterprise.id}>
                        {[enterprise.nome, enterprise.bairro, enterprise.cidade].filter(Boolean).join(" · ")}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid gap-4">
                <MinimumSegmentedField label="Dormitórios mínimos" value={draftFilters.dormitoriosMin ?? null} onChange={(value) => updateDraft({ dormitoriosMin: value })} />
                <MinimumSegmentedField label="Suítes mínimas" value={draftFilters.suitesMin ?? null} onChange={(value) => updateDraft({ suitesMin: value })} />
                <MinimumSegmentedField label="Vagas mínimas" value={draftFilters.vagasMin ?? null} onChange={(value) => updateDraft({ vagasMin: value })} />
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Valor mínimo">
                  <input
                    type="number"
                    min={0}
                    value={draftFilters.valorMin ?? ""}
                    onChange={(event) => updateDraft({ valorMin: numberOrNull(event.target.value) })}
                    className="input-base"
                    placeholder="Ex.: 800000"
                  />
                </Field>
                <Field label="Valor máximo">
                  <input
                    type="number"
                    min={0}
                    value={draftFilters.valorMax ?? ""}
                    onChange={(event) => updateDraft({ valorMax: numberOrNull(event.target.value) })}
                    className="input-base"
                    placeholder="Ex.: 1500000"
                  />
                </Field>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="grid gap-4">
                <CharacteristicPicker
                  title="Características do imóvel"
                  values={draftFilters.caracteristicasImovel ?? []}
                  options={options.propertyCharacteristics}
                  onToggle={(value) => toggleCharacteristic("imovel", value)}
                />
                <CharacteristicPicker
                  title="Características do empreendimento"
                  values={draftFilters.caracteristicasEmpreendimento ?? []}
                  options={options.enterpriseCharacteristics}
                  onToggle={(value) => toggleCharacteristic("empreendimento", value)}
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-stone-50 px-4 py-2 text-sm font-bold text-slate-800">
            {loading ? <SpinnerGap size={16} className="animate-spin text-[var(--grey-olive)]" /> : <Check size={16} className="text-[var(--grey-olive)]" />}
            {loading ? "Atualizando imóveis..." : formatCarouselCount(meta.total)}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
              Cancelar
            </button>
            {step > 0 ? (
              <button type="button" onClick={() => setStep((current) => Math.max(current - 1, 0))} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                Voltar
              </button>
            ) : null}
            {step < steps.length - 1 ? (
              <button type="button" onClick={() => setStep((current) => Math.min(current + 1, steps.length - 1))} className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800">
                Continuar
              </button>
            ) : (
              <button type="button" onClick={() => onApply(cleanPropertyCarouselFilters(draftFilters))} className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800">
                Aplicar lista
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MinimumSegmentedField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="text-sm font-bold text-slate-700">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {[1, 2, 3, 4].map((option) => {
          const active = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(active ? null : option)}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 text-slate-600 hover:border-[var(--grey-olive)] hover:text-[var(--grey-olive)]"
              }`}
            >
              {option}+
            </button>
          );
        })}
        {value ? (
          <button type="button" onClick={() => onChange(null)} className="rounded-full px-4 py-2 text-sm font-bold text-slate-400 transition hover:bg-slate-50 hover:text-slate-700">
            Limpar
          </button>
        ) : null}
      </div>
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

function ImageBlockEditor({
  block,
  onChange,
  onUpload,
  remainingImageSlots,
}: {
  block: Extract<ArtigoBlock, { type: "image" }>;
  onChange: (block: ArtigoBlock) => void;
  onUpload: (file: File, grupo: string, alt?: string, options?: ArticleUploadOptions) => Promise<UploadedMedia | null>;
  remainingImageSlots: number;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const hasImage = Boolean(block.data.url);
  const canUpload = hasImage || remainingImageSlots > 0;

  async function handleUpload(file: File | null) {
    if (!file || !canUpload) return;
    setIsUploading(true);
    try {
      const uploaded = await onUpload(file, "bloco_imagem", block.data.alt || file.name, {
        consumesImageSlot: !hasImage,
      });
      if (uploaded) {
        onChange({ ...block, data: { ...block.data, url: uploaded.url, alt: block.data.alt || file.name } });
      }
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="relative h-[220px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm md:h-[280px]">
        {block.data.url ? (
          <Image src={block.data.url} alt={block.data.alt || ""} fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <ImageSquare size={42} />
          </div>
        )}
        {isUploading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80 text-sm font-bold text-slate-700 backdrop-blur-sm">
            <SpinnerGap size={28} className="animate-spin text-[var(--grey-olive)]" />
            Enviando e otimizando imagem...
          </div>
        ) : null}
      </div>
      <div className="grid content-start gap-3">
        <label className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 ${isUploading || !canUpload ? "pointer-events-none opacity-70" : "cursor-pointer hover:bg-slate-50"}`}>
          {isUploading ? <SpinnerGap size={16} className="animate-spin" /> : <ImageSquare size={16} />}
          {isUploading ? "Enviando imagem..." : hasImage ? "Trocar imagem" : "Enviar imagem"}
          <input
            type="file"
            accept="image/*"
            disabled={isUploading || !canUpload}
            className="hidden"
            onChange={(event) => void handleUpload(event.target.files?.[0] ?? null).finally(() => {
              event.currentTarget.value = "";
            })}
          />
        </label>
        {!canUpload ? <p className="text-xs font-medium text-red-600">Limite de {ARTIGO_MAX_IMAGES} imagens atingido.</p> : null}
        <Field label="Texto alternativo" help={`${block.data.alt.length}/${ARTICLE_LIMITS.alt}`}>
          <input
            value={block.data.alt}
            maxLength={ARTICLE_LIMITS.alt}
            onChange={(event) => onChange({ ...block, data: { ...block.data, alt: event.target.value } })}
            className="input-base"
          />
        </Field>
        <Field label="Legenda opcional" help={`${block.data.caption?.length ?? 0}/${ARTICLE_LIMITS.caption}`}>
          <input
            value={block.data.caption ?? ""}
            maxLength={ARTICLE_LIMITS.caption}
            onChange={(event) => onChange({ ...block, data: { ...block.data, caption: event.target.value } })}
            className="input-base"
          />
        </Field>
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
  remainingImageSlots,
}: {
  block: Extract<ArtigoBlock, { type: "gallery" }>;
  onChange: (block: ArtigoBlock) => void;
  onUpload: (file: File, grupo: string, alt?: string, options?: ArticleUploadOptions) => Promise<UploadedMedia | null>;
  remainingImageSlots: number;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const images = block.data.images.filter((image) => image.url);
  const canAddImages = remainingImageSlots > 0 && !isUploading;

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
              className={`group flex gap-3 rounded-2xl border bg-white p-2 transition ${dragIndex === index ? "border-[var(--grey-olive)] opacity-60" : "border-slate-200"}`}
            >
              <div className="relative h-[120px] aspect-[4/3] shrink-0 overflow-hidden rounded-xl bg-slate-100">
                <Image src={image.url} alt={image.alt || ""} fill sizes="(min-width: 768px) 360px, 100vw" className="object-cover" unoptimized />
                <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-bold text-slate-700 shadow-sm backdrop-blur">
                  <DotsSixVertical size={14} />
                  Arrastar
                </div>
                <button type="button" onClick={() => removeImage(index)} title="Remover imagem" className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-600 shadow-sm backdrop-blur transition hover:bg-white">
                  <Trash size={15} />
                </button>
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
                <div className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-slate-500">{image.alt || `Imagem ${index + 1}`}</span>
                  <span className="mt-1 block text-[10px] uppercase tracking-[0.2em] text-slate-300">Miniatura</span>
                </div>
                <div className="flex items-center justify-end gap-1">
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
      <label className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 ${canAddImages ? "cursor-pointer hover:bg-slate-50" : "pointer-events-none opacity-70"}`}>
        {isUploading ? <SpinnerGap size={16} className="animate-spin" /> : <ImageSquare size={16} />}
        {isUploading ? "Enviando imagens..." : "Enviar imagens para galeria"}
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={!canAddImages}
          className="hidden"
          onChange={async (event) => {
            const files = Array.from(event.target.files ?? []);
            if (!files.length) return;

            setUploadNotice(null);
            const allowedFiles = files.slice(0, remainingImageSlots);
            if (!allowedFiles.length) {
              setUploadNotice(`Limite de ${ARTIGO_MAX_IMAGES} imagens atingido.`);
              event.currentTarget.value = "";
              return;
            }
            if (allowedFiles.length < files.length) {
              setUploadNotice(`Só foi possível adicionar ${allowedFiles.length} imagem(ns). O artigo aceita no máximo ${ARTIGO_MAX_IMAGES} imagens.`);
            }

            setIsUploading(true);
            try {
              const uploadedImages = [];
              for (const file of allowedFiles) {
                const uploaded = await onUpload(file, "bloco_galeria", file.name, { consumesImageSlot: true });
                if (uploaded) uploadedImages.push({ url: uploaded.url, alt: file.name, caption: "" });
              }
              if (uploadedImages.length) updateImages([...images, ...uploadedImages]);
            } finally {
              setIsUploading(false);
              event.currentTarget.value = "";
            }
          }}
        />
      </label>
      {isUploading ? (
        <div className="inline-flex items-center gap-2 rounded-xl bg-stone-50 px-4 py-3 text-sm font-medium text-[var(--grey-olive)]">
          <SpinnerGap size={16} className="animate-spin" />
          Otimizando e salvando imagens da galeria...
        </div>
      ) : null}
      {!canAddImages && !isUploading ? <p className="text-xs font-medium text-red-600">Limite de {ARTIGO_MAX_IMAGES} imagens atingido.</p> : null}
      {uploadNotice ? <p className="text-xs font-medium text-red-600">{uploadNotice}</p> : null}
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
    <div className="grid gap-3 md:grid-cols-2">
      {videoId ? (
        <div className="h-[220px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm md:h-[280px]">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${videoId}`}
            title="Prévia do vídeo do artigo"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 md:h-[280px]">
          Cole uma URL válida do YouTube para visualizar o vídeo.
        </div>
      )}
      <div className="grid content-start gap-3">
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
      </div>
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
    <div className={`relative h-[220px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 md:h-[280px] ${large ? "aspect-[16/9]" : ""}`}>
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

function usePropertyCarouselMeta(filters: ArtigoPropertyCarouselFilters) {
  const [meta, setMeta] = useState<PropertyCarouselMetaResponse>({ total: 0, cities: [], neighborhoods: [], enterprises: [] });
  const [loading, setLoading] = useState(false);
  const queryString = useMemo(() => buildPropertyCarouselParams(filters).toString(), [filters]);

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      setLoading(true);
      const path = queryString ? `/api/artigos/property-carousel-meta?${queryString}` : "/api/artigos/property-carousel-meta";
      apiFetchWithAuth<PropertyCarouselMetaResponse>(path)
        .then((result) => {
          if (active && result.ok) setMeta(result.data);
          if (active && !result.ok) setMeta({ total: 0, cities: [], neighborhoods: [], enterprises: [] });
        })
        .catch(() => {
          if (active) setMeta({ total: 0, cities: [], neighborhoods: [], enterprises: [] });
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [queryString]);

  return { meta, loading };
}

function buildPropertyCarouselParams(filters: ArtigoPropertyCarouselFilters) {
  const params = new URLSearchParams();
  appendParam(params, "cidade", filters.cidade);
  appendParam(params, "bairro", filters.bairro);
  appendParam(params, "empreendimento_id", filters.empreendimentoId);
  appendParam(params, "dormitorios_min", filters.dormitoriosMin);
  appendParam(params, "suites_min", filters.suitesMin);
  appendParam(params, "vagas_min", filters.vagasMin);
  appendParam(params, "valor_min", filters.valorMin);
  appendParam(params, "valor_max", filters.valorMax);
  for (const item of filters.caracteristicasImovel ?? []) appendParam(params, "caracteristicas_imovel", item);
  for (const item of filters.caracteristicasEmpreendimento ?? []) appendParam(params, "caracteristicas_empreendimento", item);
  return params;
}

function appendParam(params: URLSearchParams, key: string, value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return;
  params.append(key, String(value));
}

function cleanPropertyCarouselFilters(filters: ArtigoPropertyCarouselFilters): ArtigoPropertyCarouselFilters {
  return {
    cidade: filters.cidade?.trim() || null,
    bairro: filters.bairro?.trim() || null,
    empreendimentoId: filters.empreendimentoId || null,
    dormitoriosMin: filters.dormitoriosMin ?? null,
    suitesMin: filters.suitesMin ?? null,
    vagasMin: filters.vagasMin ?? null,
    valorMin: filters.valorMin ?? null,
    valorMax: filters.valorMax ?? null,
    caracteristicasImovel: filters.caracteristicasImovel?.filter(Boolean) ?? [],
    caracteristicasEmpreendimento: filters.caracteristicasEmpreendimento?.filter(Boolean) ?? [],
  };
}

function getPropertyCarouselFilterChips(filters: ArtigoPropertyCarouselFilters, options: ArticleEditorOptions, meta?: PropertyCarouselMetaResponse) {
  const chips: string[] = [];
  const enterprise = [...(meta?.enterprises ?? []), ...options.enterpriseOptions].find((item) => item.id === filters.empreendimentoId);

  if (filters.cidade) chips.push(`Cidade: ${filters.cidade}`);
  if (filters.bairro) chips.push(`Bairro: ${filters.bairro}`);
  if (enterprise?.nome) chips.push(`Empreendimento: ${enterprise.nome}`);
  if (filters.dormitoriosMin) chips.push(`${filters.dormitoriosMin}+ dormitórios`);
  if (filters.suitesMin) chips.push(`${filters.suitesMin}+ suítes`);
  if (filters.vagasMin) chips.push(`${filters.vagasMin}+ vagas`);
  if (filters.valorMin) chips.push(`A partir de ${formatCompactCurrency(filters.valorMin)}`);
  if (filters.valorMax) chips.push(`Até ${formatCompactCurrency(filters.valorMax)}`);
  if (filters.caracteristicasImovel?.length) chips.push(`${filters.caracteristicasImovel.length} ${filters.caracteristicasImovel.length === 1 ? "característica do imóvel" : "características do imóvel"}`);
  if (filters.caracteristicasEmpreendimento?.length) chips.push(`${filters.caracteristicasEmpreendimento.length} ${filters.caracteristicasEmpreendimento.length === 1 ? "característica do empreendimento" : "características do empreendimento"}`);

  return chips;
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCarouselCount(total: number) {
  return `${total} ${total === 1 ? "imóvel encontrado" : "imóveis encontrados"}`;
}

function mergeTextOptions(values: string[], selected?: string | null) {
  const current = new Set(values);
  if (selected?.trim()) current.add(selected.trim());
  return Array.from(current).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function mergeEnterpriseOptions(values: EnterpriseOption[], selectedId?: string | null) {
  if (!selectedId || values.some((item) => item.id === selectedId)) return values;
  return [...values, { id: selectedId, nome: "Empreendimento selecionado" }];
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

function getPropertyTitle(property: PropertyOption) {
  return property.label?.trim() || property.titulo?.trim() || property.tipo?.trim() || "Imóvel sem título";
}

function formatPropertyAddress(property: PropertyOption) {
  const street = [property.logradouro, property.numero].filter(Boolean).join(", ");
  const cityLabel = [property.cidade, property.estado].filter(Boolean).join("/");
  const neighborhood = property.bairro_comercial || property.bairro;
  return [street, [neighborhood, cityLabel].filter(Boolean).join(" - ")].filter(Boolean).join(" • ") || "Endereço não informado";
}

function formatPropertySpecs(property: PropertyOption) {
  const specs = [
    property.area_util ? `${property.area_util} m²` : null,
    property.dormitorios ? formatCount(property.dormitorios, "dormitório", "dormitórios") : null,
    property.suites ? formatCount(property.suites, "suíte", "suítes") : null,
    property.vagas ? formatCount(property.vagas, "vaga", "vagas") : null,
  ].filter(Boolean);
  return specs.length ? specs.join(" · ") : "Dados principais não informados";
}

function formatCount(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function formatStatusLabel(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "PUBLICADO") return "Publicado";
  if (normalized === "RASCUNHO") return "Rascunho";
  if (normalized === "PAUSADO") return "Pausado";
  if (normalized === "VENDIDO") return "Vendido";
  if (normalized === "ALUGADO") return "Alugado";
  if (normalized === "INATIVO") return "Inativo";
  return status;
}

function normalizeOptionSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function propertyMatchesQuery(property: PropertyOption, query: string) {
  if (!query) return true;
  return [
    property.codigo,
    property.label,
    property.titulo,
    property.tipo,
    property.subtipo,
    property.logradouro,
    property.numero,
    property.bairro_comercial,
    property.bairro,
    property.cidade,
    property.estado,
    formatPropertyAddress(property),
  ].some((value) => normalizeOptionSearch(String(value ?? "")).includes(query));
}

function formatPropertyOption(property: PropertyOption) {
  return [property.codigo, getPropertyTitle(property), formatPropertyAddress(property), formatPropertySpecs(property)]
    .filter(Boolean)
    .join(" · ");
}
