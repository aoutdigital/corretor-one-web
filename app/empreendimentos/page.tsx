"use client";

import Link from "next/link";
import {
  CaretLeft,
  CaretRight,
  ClockCounterClockwise,
  DotsThreeVertical,
  Eye,
  FunnelSimple,
  PencilSimple,
  Plus,
  Trash,
  X,
} from "@phosphor-icons/react";
import { Card } from "flowbite-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/app/_components/app-shell";
import { apiFetchWithAuth } from "@/lib/client/auth-api";

type Empreendimento = {
  id: string;
  slug_publico: string;
  nome: string;
  status: string;
  tipo_uso?: "RESIDENCIAL" | "COMERCIAL" | null;
  categoria_imovel?: string | null;
  cidade: string;
  estado: string;
  bairro?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  fase?: string | null;
  ano_construcao?: number | null;
  construtora?: string | null;
  created_at: string;
  updated_at: string;
  caracteristicas?: string[] | null;
  caracteristica_ids?: string[] | null;
};

type EmpreendimentoRascunho = {
  id: string;
  etapa_atual: number;
  titulo: string | null;
  updated_at: string;
};

type MidiaItem = {
  relacao_id: string;
  midia_id: string;
  tipo: "IMAGEM" | "VIDEO" | "PDF";
  url: string;
};

type MediaSummary = {
  images: string[];
  photos: number;
  videos: number;
  total: number;
};

type ProfileData = {
  nickname?: string | null;
};

type ImovelLite = {
  empreendimento_id?: string | null;
  status?: string;
};

type CaracteristicaCatalogoItem = {
  chave: string;
  label_pt: string;
};

const MAX_RASCUNHOS = 5;
const PAGE_SIZE = 9;
const DEFAULT_ADVANCED_ANO_MAX = String(new Date().getFullYear());
const EDITOR_ALLOWED_STATUSES = new Set(["PUBLICADO", "PAUSADO", "INATIVO"]);

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase().trim();
}

function buildAddress(item: Empreendimento) {
  const parts = [
    item.logradouro?.trim(),
    item.numero?.trim(),
    item.bairro?.trim(),
    item.cidade?.trim(),
    item.estado?.trim(),
  ].filter((part) => Boolean(part && part.length));

  if (parts.length === 0) return "Endereço não informado";
  const [logradouro, numero, bairro, cidade, estado] = parts;
  const rua = [logradouro, numero].filter(Boolean).join(", ");
  const local = [bairro, [cidade, estado].filter(Boolean).join("/")].filter(Boolean).join(" - ");
  return [rua, local].filter(Boolean).join(" • ");
}

export default function EmpreendimentosPage() {
  const searchParams = useSearchParams();

  const [items, setItems] = useState<Empreendimento[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [profileNickname, setProfileNickname] = useState<string | null>(null);

  const [openDraftModal, setOpenDraftModal] = useState(false);
  const [drafts, setDrafts] = useState<EmpreendimentoRascunho[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftActionLoadingId, setDraftActionLoadingId] = useState<string | null>(null);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const [quickQuery, setQuickQuery] = useState("");
  const [quickFase, setQuickFase] = useState("");
  const [sortBy, setSortBy] = useState("NOME_ASC");
  const [page, setPage] = useState(1);

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedCidade, setAdvancedCidade] = useState("");
  const [advancedBairro, setAdvancedBairro] = useState("");
  const [advancedStatus, setAdvancedStatus] = useState("");
  const [advancedTipoUso, setAdvancedTipoUso] = useState("");
  const [advancedCategoria, setAdvancedCategoria] = useState("");
  const [advancedConstrutora, setAdvancedConstrutora] = useState("");
  const [advancedAnoMin, setAdvancedAnoMin] = useState("");
  const [advancedAnoMax, setAdvancedAnoMax] = useState(DEFAULT_ADVANCED_ANO_MAX);
  const [advancedMinImoveis, setAdvancedMinImoveis] = useState("");
  const [advancedCaracteristicas, setAdvancedCaracteristicas] = useState<string[]>([]);
  const [advancedCaracteristicaQuery, setAdvancedCaracteristicaQuery] = useState("");

  const [caracteristicasCatalogo, setCaracteristicasCatalogo] = useState<CaracteristicaCatalogoItem[]>([]);
  const [imoveisDisponiveisByEmpreendimento, setImoveisDisponiveisByEmpreendimento] = useState<
    Record<string, number>
  >({});
  const [imoveisAssociadosByEmpreendimento, setImoveisAssociadosByEmpreendimento] = useState<
    Record<string, number>
  >({});

  const [mediaByEmpreendimento, setMediaByEmpreendimento] = useState<Record<string, MediaSummary>>({});
  const [loadingMediaIds, setLoadingMediaIds] = useState<Record<string, boolean>>({});
  const [carouselByEmpreendimento, setCarouselByEmpreendimento] = useState<Record<string, number>>({});
  const [deleteModalTarget, setDeleteModalTarget] = useState<Empreendimento | null>(null);
  const [deleteBlockedCount, setDeleteBlockedCount] = useState(0);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [openActionsMenuId, setOpenActionsMenuId] = useState<string | null>(null);

  const publicationQueued = searchParams.get("publicacao_enfileirada") === "1";

  useEffect(() => {
    async function load() {
      const [empreendimentosResult, profileResult, imoveisResult, caracteristicasResult] = await Promise.all([
        apiFetchWithAuth<Empreendimento[]>("/api/empreendimentos"),
        apiFetchWithAuth<ProfileData>("/api/profile"),
        apiFetchWithAuth<ImovelLite[]>("/api/imoveis"),
        apiFetchWithAuth<CaracteristicaCatalogoItem[]>("/api/caracteristicas/catalogo?escopo=EMPREENDIMENTO"),
      ]);

      if (!empreendimentosResult.ok) {
        setError(empreendimentosResult.error);
      } else {
        setItems(empreendimentosResult.data);
      }

      if (profileResult.ok) {
        setProfileNickname(profileResult.data.nickname ?? null);
      }

      if (imoveisResult.ok) {
        const nextDisponiveis: Record<string, number> = {};
        const nextAssociados: Record<string, number> = {};
        for (const imovel of imoveisResult.data) {
          if (imovel.status !== "PUBLICADO") continue;
          const empreendimentoId = imovel.empreendimento_id ?? "";
          if (!empreendimentoId) continue;
          nextDisponiveis[empreendimentoId] = (nextDisponiveis[empreendimentoId] ?? 0) + 1;
        }
        for (const imovel of imoveisResult.data) {
          const empreendimentoId = imovel.empreendimento_id ?? "";
          if (!empreendimentoId) continue;
          nextAssociados[empreendimentoId] = (nextAssociados[empreendimentoId] ?? 0) + 1;
        }
        setImoveisDisponiveisByEmpreendimento(nextDisponiveis);
        setImoveisAssociadosByEmpreendimento(nextAssociados);
      }

      if (caracteristicasResult.ok) {
        const list = [...caracteristicasResult.data].sort((a, b) =>
          a.label_pt.localeCompare(b.label_pt, "pt-BR"),
        );
        setCaracteristicasCatalogo(list);
      }
    }

    void load();
  }, []);

  useEffect(() => {
    async function processBackgroundPublication() {
      const processResult = await apiFetchWithAuth<{
        processed: boolean;
        jobId: string | null;
        empreendimentoId: string | null;
      }>("/api/empreendimentos/publicacao-jobs/process", {
        method: "POST",
      });

      if (!processResult.ok || !processResult.data.processed) return;

      const reloadResult = await apiFetchWithAuth<Empreendimento[]>("/api/empreendimentos");
      if (!reloadResult.ok) return;
      setItems(reloadResult.data);
      setToast("Publicação concluída.");
      setTimeout(() => setToast(null), 4000);
    }

    void processBackgroundPublication();
  }, []);

  useEffect(() => {
    function handleDocumentPointerDown(event: MouseEvent) {
      if (!openActionsMenuId) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const menuContainer = target.closest("[data-empreendimento-actions-menu]");
      if (!menuContainer) {
        setOpenActionsMenuId(null);
      }
    }

    document.addEventListener("mousedown", handleDocumentPointerDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentPointerDown);
    };
  }, [openActionsMenuId]);

  const availableFases = useMemo(() => {
    return Array.from(
      new Set(items.map((item) => (item.fase ?? "").trim()).filter((value) => value.length > 0)),
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [items]);

  const availableCidades = useMemo(() => {
    return Array.from(
      new Set(items.map((item) => (item.cidade ?? "").trim()).filter((value) => value.length > 0)),
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [items]);

  const availableBairros = useMemo(() => {
    const base = advancedCidade
      ? items.filter((item) => normalizeText(item.cidade) === normalizeText(advancedCidade))
      : items;
    return Array.from(
      new Set(base.map((item) => (item.bairro ?? "").trim()).filter((value) => value.length > 0)),
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [items, advancedCidade]);

  const filteredCaracteristicas = useMemo(() => {
    const query = normalizeText(advancedCaracteristicaQuery);
    if (!query) return caracteristicasCatalogo;
    return caracteristicasCatalogo.filter(
      (item) =>
        normalizeText(item.label_pt).includes(query) || normalizeText(item.chave).includes(query),
    );
  }, [caracteristicasCatalogo, advancedCaracteristicaQuery]);

  const filteredAndSorted = useMemo(() => {
    const query = normalizeText(quickQuery);

    const filtered = items.filter((item) => {
      if (query) {
        const haystack = [item.nome, item.bairro, item.logradouro, item.cidade]
          .map((value) => normalizeText(value ?? ""))
          .join(" ");
        if (!haystack.includes(query)) return false;
      }

      if (quickFase && (item.fase ?? "") !== quickFase) return false;
      if (advancedCidade && normalizeText(item.cidade) !== normalizeText(advancedCidade)) return false;
      if (advancedBairro && normalizeText(item.bairro) !== normalizeText(advancedBairro)) return false;
      if (advancedStatus && item.status !== advancedStatus) return false;
      if (advancedTipoUso && (item.tipo_uso ?? "") !== advancedTipoUso) return false;
      if (advancedCategoria && normalizeText(item.categoria_imovel) !== normalizeText(advancedCategoria))
        return false;
      if (
        advancedConstrutora &&
        !normalizeText(item.construtora).includes(normalizeText(advancedConstrutora))
      ) {
        return false;
      }

      if (advancedCaracteristicas.length > 0) {
        const empreendimentoCaracteristicas = Array.isArray(item.caracteristicas)
          ? item.caracteristicas
          : [];
        const matchesAny = advancedCaracteristicas.some((selected) =>
          empreendimentoCaracteristicas.includes(selected),
        );
        if (!matchesAny) return false;
      }

      const hasAnoFilter =
        advancedAnoMin.trim().length > 0 || advancedAnoMax.trim() !== DEFAULT_ADVANCED_ANO_MAX;
      if (hasAnoFilter) {
        const ano = item.ano_construcao ?? null;
        const minAno = Number(advancedAnoMin);
        const maxAno = Number(advancedAnoMax);
        if (!ano) return false;
        if (advancedAnoMin.trim() && Number.isFinite(minAno) && ano < minAno) return false;
        if (advancedAnoMax.trim() && Number.isFinite(maxAno) && ano > maxAno) return false;
        if (
          advancedAnoMin.trim() &&
          advancedAnoMax.trim() &&
          Number.isFinite(minAno) &&
          Number.isFinite(maxAno) &&
          minAno > maxAno
        ) {
          return false;
        }
      }

      if (advancedMinImoveis.trim()) {
        const minImoveis = Number(advancedMinImoveis);
        if (Number.isFinite(minImoveis)) {
          const totalImoveis = imoveisDisponiveisByEmpreendimento[item.id] ?? 0;
          if (totalImoveis < minImoveis) return false;
        }
      }

      return true;
    });

    const sorted = [...filtered];
    if (sortBy === "NOME_ASC") {
      sorted.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    } else if (sortBy === "NOME_DESC") {
      sorted.sort((a, b) => b.nome.localeCompare(a.nome, "pt-BR"));
    } else if (sortBy === "CREATED_DESC") {
      sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    } else if (sortBy === "CREATED_ASC") {
      sorted.sort((a, b) => a.created_at.localeCompare(b.created_at));
    } else if (sortBy === "UPDATED_DESC") {
      sorted.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    } else if (sortBy === "UPDATED_ASC") {
      sorted.sort((a, b) => a.updated_at.localeCompare(b.updated_at));
    }

    return sorted;
  }, [
    items,
    quickQuery,
    quickFase,
    advancedCidade,
    advancedBairro,
    advancedStatus,
    advancedTipoUso,
    advancedCategoria,
    advancedConstrutora,
    advancedAnoMin,
    advancedAnoMax,
    advancedMinImoveis,
    advancedCaracteristicas,
    sortBy,
    imoveisDisponiveisByEmpreendimento,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAndSorted.slice(start, start + PAGE_SIZE);
  }, [filteredAndSorted, currentPage]);

  useEffect(() => {
    async function loadMediaSummaries() {
      const missingIds = currentItems
        .map((item) => item.id)
        .filter((id) => !mediaByEmpreendimento[id] && !loadingMediaIds[id]);

      if (missingIds.length === 0) return;

      setLoadingMediaIds((current) => {
        const next = { ...current };
        for (const id of missingIds) next[id] = true;
        return next;
      });

      const results = await Promise.all(
        missingIds.map(async (empreendimentoId) => {
          const response = await apiFetchWithAuth<MidiaItem[]>(
            `/api/empreendimentos/${empreendimentoId}/midia`,
          );
          return { empreendimentoId, response };
        }),
      );

      setMediaByEmpreendimento((current) => {
        const next = { ...current };
        for (const { empreendimentoId, response } of results) {
          if (!response.ok) continue;
          const data = response.data;
          const photos = data.filter((item) => item.tipo === "IMAGEM");
          const videos = data.filter((item) => item.tipo === "VIDEO");
          next[empreendimentoId] = {
            images: photos.slice(0, 3).map((item) => item.url),
            photos: photos.length,
            videos: videos.length,
            total: data.length,
          };
        }
        return next;
      });

      setLoadingMediaIds((current) => {
        const next = { ...current };
        for (const id of missingIds) next[id] = false;
        return next;
      });
    }

    void loadMediaSummaries();
  }, [currentItems, mediaByEmpreendimento, loadingMediaIds]);

  async function loadDrafts() {
    setDraftsLoading(true);
    setDraftError(null);
    const result = await apiFetchWithAuth<EmpreendimentoRascunho[]>("/api/empreendimentos/rascunhos");
    setDraftsLoading(false);
    if (!result.ok) {
      setDraftError(result.error);
      return;
    }
    setDrafts(result.data);
  }

  async function handleCreateDraft() {
    setCreatingDraft(true);
    setDraftError(null);
    const result = await apiFetchWithAuth<{ id: string }>("/api/empreendimentos/rascunhos", {
      method: "POST",
      body: JSON.stringify({}),
    });
    setCreatingDraft(false);

    if (!result.ok) {
      setDraftError(result.error);
      return;
    }

    window.location.href = `/empreendimentos/novo?draft=${result.data.id}`;
  }

  async function handleDeleteDraft(draftId: string) {
    setDraftActionLoadingId(draftId);
    setDraftError(null);
    const result = await apiFetchWithAuth<{ id: string }>(`/api/empreendimentos/rascunhos/${draftId}`, {
      method: "DELETE",
    });
    setDraftActionLoadingId(null);

    if (!result.ok) {
      setDraftError(result.error);
      return;
    }

    await loadDrafts();
  }

  function toggleAdvancedCaracteristica(chave: string) {
    setAdvancedCaracteristicas((current) =>
      current.includes(chave) ? current.filter((item) => item !== chave) : [...current, chave],
    );
  }

  function moveCarousel(itemId: string, total: number, direction: "prev" | "next") {
    if (total <= 1) return;
    setCarouselByEmpreendimento((current) => {
      const base = current[itemId] ?? 0;
      const next = direction === "next" ? (base + 1) % total : (base - 1 + total) % total;
      return { ...current, [itemId]: next };
    });
  }

  function handleRequestDelete(item: Empreendimento) {
    const associados = imoveisAssociadosByEmpreendimento[item.id] ?? 0;
    setDeleteModalTarget(item);
    setDeleteBlockedCount(associados);
    setDeleteConfirmText("");
  }

  async function handleConfirmDelete() {
    if (!deleteModalTarget) return;
    if (deleteConfirmText.trim().toLowerCase() !== "excluir") return;

    setDeleteLoading(true);
    const result = await apiFetchWithAuth<{ id: string }>(`/api/empreendimentos/${deleteModalTarget.id}`, {
      method: "DELETE",
    });
    setDeleteLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setItems((current) => current.filter((item) => item.id !== deleteModalTarget.id));
    setMediaByEmpreendimento((current) => {
      const next = { ...current };
      delete next[deleteModalTarget.id];
      return next;
    });
    setImoveisDisponiveisByEmpreendimento((current) => {
      const next = { ...current };
      delete next[deleteModalTarget.id];
      return next;
    });
    setImoveisAssociadosByEmpreendimento((current) => {
      const next = { ...current };
      delete next[deleteModalTarget.id];
      return next;
    });
    setDeleteModalTarget(null);
    setDeleteBlockedCount(0);
    setDeleteConfirmText("");
    setToast("Empreendimento excluído com sucesso.");
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <AppShell title="Empreendimentos" subtitle="Gestão de condomínios e lançamentos">
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => {
            window.location.href = "/empreendimentos/novo";
          }}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-95"
        >
          <Plus size={16} className="mr-2" />
          Novo empreendimento
        </button>
      </div>
      {publicationQueued ? (
        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Empreendimento enviado para publicação. Vamos processar em segundo plano.
        </div>
      ) : null}
      {toast ? (
        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {toast}
        </div>
      ) : null}

      <Card className="!border-slate-200 !bg-white !text-slate-900">
        {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <input
            value={quickQuery}
            onChange={(event) => {
              setQuickQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Busca rápida: nome, bairro, logradouro, cidade"
            className="min-w-72 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <select
            value={quickFase}
            onChange={(event) => {
              setQuickFase(event.target.value);
              setPage(1);
            }}
            className="h-11 min-w-48 rounded-lg border border-slate-200 bg-white px-4 py-2 pr-10 text-sm font-medium"
          >
            <option value="">Fases (todas)</option>
            {availableFases.map((fase) => (
              <option key={fase} value={fase}>
                {fase}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(true)}
            className="inline-flex h-11 items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            <FunnelSimple size={16} />
            Busca avançada
            {advancedCidade ||
            advancedBairro ||
            advancedStatus ||
            advancedTipoUso ||
            advancedCategoria ||
            advancedConstrutora ||
            advancedAnoMin ||
            advancedAnoMax !== DEFAULT_ADVANCED_ANO_MAX ||
            advancedMinImoveis ||
            advancedCaracteristicas.length > 0 ? (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] text-rose-700">
                ativa
              </span>
            ) : null}
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">{filteredAndSorted.length} empreendimento(s) encontrado(s)</p>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="NOME_ASC">Nome (A-Z)</option>
            <option value="NOME_DESC">Nome (Z-A)</option>
            <option value="CREATED_DESC">Data criação (mais recente)</option>
            <option value="CREATED_ASC">Data criação (mais antiga)</option>
            <option value="UPDATED_DESC">Data atualização (mais recente)</option>
            <option value="UPDATED_ASC">Data atualização (mais antiga)</option>
          </select>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {currentItems.map((item) => {
            const summary = mediaByEmpreendimento[item.id];
            const images = summary?.images ?? [];
            const totalSlides = Math.max(1, images.length);
            const activeSlide = Math.min(carouselByEmpreendimento[item.id] ?? 0, totalSlides - 1);
            const caracteristicasCount = Array.isArray(item.caracteristica_ids)
              ? item.caracteristica_ids.length
              : Array.isArray(item.caracteristicas)
                ? item.caracteristicas.length
                : 0;
            const canViewPublic = item.status === "PUBLICADO" && profileNickname;
            const editHref = item.status === "RASCUNHO"
              ? `/empreendimentos/novo?empreendimento=${item.id}`
              : `/empreendimentos/${item.id}`;
            const canOpenEditor = EDITOR_ALLOWED_STATUSES.has(item.status);
            const statusLabel = item.status === "RASCUNHO"
              ? "Rascunho"
              : item.status === "PAUSADO"
                ? "Pausado"
                : item.status === "INATIVO"
                  ? "Inativo"
                  : item.status;

            return (
              <article key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="relative aspect-[16/9] bg-slate-100">
                  {images.length > 0 ? (
                    <img
                      src={images[activeSlide]}
                      alt={item.nome}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      {loadingMediaIds[item.id] ? "Carregando mídias..." : "Sem imagens"}
                    </div>
                  )}

                  {images.length > 1 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => moveCarousel(item.id, images.length, "prev")}
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1 text-slate-700 shadow"
                        aria-label="Slide anterior"
                      >
                        <CaretLeft size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveCarousel(item.id, images.length, "next")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1 text-slate-700 shadow"
                        aria-label="Próximo slide"
                      >
                        <CaretRight size={16} />
                      </button>
                      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-slate-900/55 px-2 py-1">
                        {images.map((_, index) => (
                          <button
                            key={`${item.id}-bullet-${index}`}
                            type="button"
                            onClick={() =>
                              setCarouselByEmpreendimento((current) => ({ ...current, [item.id]: index }))
                            }
                            className={`h-1.5 w-1.5 rounded-full ${index === activeSlide ? "bg-white" : "bg-white/45"}`}
                            aria-label={`Ir para slide ${index + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={editHref}
                      className="truncate text-base font-semibold text-slate-900 hover:text-[var(--primary-scarlet)]"
                    >
                      {item.nome}
                    </Link>
                    <div className="relative shrink-0" data-empreendimento-actions-menu>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenActionsMenuId((current) => (current === item.id ? null : item.id))
                        }
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-2 py-1.5 text-slate-600 hover:bg-slate-100"
                        aria-label="Mais ações"
                      >
                        <DotsThreeVertical size={16} />
                      </button>

                      {openActionsMenuId === item.id ? (
                        <div className="absolute right-0 top-10 z-10 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                          <Link
                            href={editHref}
                            className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-100"
                            onClick={() => setOpenActionsMenuId(null)}
                          >
                            <PencilSimple size={14} />
                            {canOpenEditor ? "Editar" : "Continuar cadastro"}
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenActionsMenuId(null);
                              handleRequestDelete(item);
                            }}
                            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
                          >
                            <Trash size={14} />
                            Excluir
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">{buildAddress(item)}</p>
                  <p className="text-xs text-slate-500">Características: {caracteristicasCount}</p>
                  <p className="text-xs text-slate-500">
                    Mídias: {summary?.total ?? 0} (Fotos {summary?.photos ?? 0} / Vídeos {summary?.videos ?? 0})
                  </p>
                  <p className="text-xs text-slate-500">Imóveis disponíveis: {imoveisDisponiveisByEmpreendimento[item.id] ?? 0}</p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    {canViewPublic ? (
                      <Link
                        href={`/${profileNickname}/${item.slug_publico}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700 hover:bg-emerald-100"
                      >
                        <Eye size={14} />
                        Visualizar
                      </Link>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {statusLabel}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {currentItems.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Nenhum empreendimento encontrado para os filtros aplicados.</p>
        ) : null}

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </div>
      </Card>

      {showAdvancedFilters ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Busca avançada</h3>
                <p className="text-sm text-slate-500">Filtre por características, cidade e bairro.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvancedFilters(false)}
                className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm text-slate-700">Cidade</span>
                <select
                  value={advancedCidade}
                  onChange={(event) => {
                    setAdvancedCidade(event.target.value);
                    setAdvancedBairro("");
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Todas as cidades</option>
                  {availableCidades.map((cidade) => (
                    <option key={cidade} value={cidade}>
                      {cidade}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-slate-700">Bairro</span>
                <select
                  value={advancedBairro}
                  onChange={(event) => {
                    setAdvancedBairro(event.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Todos os bairros</option>
                  {availableBairros.map((bairro) => (
                    <option key={bairro} value={bairro}>
                      {bairro}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-sm text-slate-700">Status publicação</span>
                <select
                  value={advancedStatus}
                  onChange={(event) => {
                    setAdvancedStatus(event.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Todos</option>
                  <option value="RASCUNHO">Rascunho</option>
                  <option value="PUBLICADO">Publicado</option>
                  <option value="PAUSADO">Pausado</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-slate-700">Tipo de uso</span>
                <select
                  value={advancedTipoUso}
                  onChange={(event) => {
                    setAdvancedTipoUso(event.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Todos</option>
                  <option value="RESIDENCIAL">Residencial</option>
                  <option value="COMERCIAL">Comercial</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-slate-700">Categoria</span>
                <input
                  value={advancedCategoria}
                  onChange={(event) => {
                    setAdvancedCategoria(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Ex.: APARTAMENTO"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-sm text-slate-700">Construtora</span>
                <input
                  value={advancedConstrutora}
                  onChange={(event) => {
                    setAdvancedConstrutora(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Ex.: Cyrela"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-slate-700">Ano construção (de)</span>
                <input
                  type="number"
                  min={1900}
                  max={Number(DEFAULT_ADVANCED_ANO_MAX)}
                  value={advancedAnoMin}
                  onChange={(event) => {
                    setAdvancedAnoMin(event.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-slate-700">Ano construção (até)</span>
                <input
                  type="number"
                  min={1900}
                  max={Number(DEFAULT_ADVANCED_ANO_MAX)}
                  value={advancedAnoMax}
                  onChange={(event) => {
                    setAdvancedAnoMax(event.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-4">
              <label className="block">
                <span className="mb-1 block text-sm text-slate-700">Características</span>
                <input
                  value={advancedCaracteristicaQuery}
                  onChange={(event) => setAdvancedCaracteristicaQuery(event.target.value)}
                  placeholder="Buscar característica"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <div className="mt-2 max-h-52 overflow-auto rounded-lg border border-slate-200 p-2">
                {filteredCaracteristicas.map((item) => (
                  <label key={item.chave} className="flex cursor-pointer items-center gap-2 px-1 py-1 text-sm">
                    <input
                      type="checkbox"
                      checked={advancedCaracteristicas.includes(item.chave)}
                      onChange={() => {
                        toggleAdvancedCaracteristica(item.chave);
                        setPage(1);
                      }}
                    />
                    {item.label_pt}
                  </label>
                ))}
                {filteredCaracteristicas.length === 0 ? (
                  <p className="px-1 py-2 text-xs text-slate-500">Nenhuma característica encontrada.</p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm text-slate-700">Imóveis disponíveis (mínimo)</span>
                <input
                  type="number"
                  min={0}
                  value={advancedMinImoveis}
                  onChange={(event) => {
                    setAdvancedMinImoveis(event.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setAdvancedCidade("");
                  setAdvancedBairro("");
                  setAdvancedStatus("");
                  setAdvancedTipoUso("");
                  setAdvancedCategoria("");
                  setAdvancedConstrutora("");
                  setAdvancedAnoMin("");
                  setAdvancedAnoMax(DEFAULT_ADVANCED_ANO_MAX);
                  setAdvancedMinImoveis("");
                  setAdvancedCaracteristicas([]);
                  setAdvancedCaracteristicaQuery("");
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              >
                Limpar filtros
              </button>
              <button
                type="button"
                onClick={() => setShowAdvancedFilters(false)}
                className="rounded-lg bg-[var(--primary-scarlet)] px-3 py-1.5 text-sm text-white"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteModalTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            {deleteBlockedCount > 0 ? (
              <>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Não foi possível excluir</h3>
                    <p className="mt-1 text-sm text-slate-600">{deleteModalTarget.nome}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteModalTarget(null);
                      setDeleteBlockedCount(0);
                      setDeleteConfirmText("");
                    }}
                    className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                  Não é possível excluir esse empreendimento porque existem{" "}
                  <strong>{deleteBlockedCount}</strong> imóvel(is) associado(s). Exclua esses imóveis
                  ou desvincule-os deste empreendimento.
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteModalTarget(null);
                      setDeleteBlockedCount(0);
                      setDeleteConfirmText("");
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    Entendi
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Confirmar exclusão</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Para excluir <strong>{deleteModalTarget.nome}</strong>, digite{" "}
                      <strong>excluir</strong>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteModalTarget(null);
                      setDeleteBlockedCount(0);
                      setDeleteConfirmText("");
                    }}
                    className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
                  >
                    <X size={16} />
                  </button>
                </div>

                <input
                  value={deleteConfirmText}
                  onChange={(event) => setDeleteConfirmText(event.target.value)}
                  placeholder='Digite "excluir"'
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteModalTarget(null);
                      setDeleteBlockedCount(0);
                      setDeleteConfirmText("");
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={deleteLoading || deleteConfirmText.trim().toLowerCase() !== "excluir"}
                    onClick={() => void handleConfirmDelete()}
                    className="inline-flex items-center rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {deleteLoading ? "Excluindo..." : "Excluir empreendimento"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {openDraftModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Rascunhos de empreendimento</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Você pode manter até {MAX_RASCUNHOS} rascunhos em andamento.
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-100"
                onClick={() => setOpenDraftModal(false)}
              >
                Fechar
              </button>
            </div>

            {draftError ? <p className="mb-3 text-sm text-rose-600">{draftError}</p> : null}

            <div className="space-y-2">
              {draftsLoading ? (
                <p className="text-sm text-slate-500">Carregando rascunhos...</p>
              ) : drafts.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum rascunho encontrado.</p>
              ) : (
                drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3"
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 cursor-pointer text-left"
                      onClick={() => {
                        window.location.href = `/empreendimentos/novo?draft=${draft.id}`;
                      }}
                    >
                      <p className="truncate text-sm font-medium">
                        {draft.titulo?.trim() || "Novo empreendimento (sem título)"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Etapa {draft.etapa_atual} • Atualizado em {" "}
                        {new Date(draft.updated_at).toLocaleString("pt-BR")}
                      </p>
                    </button>
                    <button
                      type="button"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
                      disabled={draftActionLoadingId === draft.id}
                      onClick={() => void handleDeleteDraft(draft.id)}
                    >
                      <Trash size={14} />
                      Excluir
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500">
                {drafts.length}/{MAX_RASCUNHOS} rascunhos usados
              </p>
              <button
                type="button"
                disabled={creatingDraft || drafts.length >= MAX_RASCUNHOS}
                onClick={() => void handleCreateDraft()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingDraft ? (
                  <>
                    <ClockCounterClockwise size={16} />
                    Criando...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Criar novo rascunho
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
