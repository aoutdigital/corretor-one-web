"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowSquareOut, DotsSixVertical, ImageSquare, NotePencil, Plus, Trash } from "@phosphor-icons/react";

import { AppShell } from "@/app/_components/app-shell";
import { ARTIGO_CATEGORIAS, type ArtigosOrdenacao } from "@/lib/artigos/content";
import { apiFetchWithAuth } from "@/lib/client/auth-api";

type ArtigoRow = {
  id: string;
  status: "RASCUNHO" | "PUBLICADO" | "ARQUIVADO";
  categoria: string;
  titulo: string;
  slug: string;
  capa_url: string | null;
  resumo: string | null;
  leitura_minutos: number;
  ordem_manual: number;
  publicado_em: string | null;
  updated_at: string;
};

type ArtigosResponse = {
  items: ArtigoRow[];
  config: { ordenacao_publica: ArtigosOrdenacao };
};

type ProfileData = {
  nickname?: string | null;
};

export default function ArtigosPage() {
  const [items, setItems] = useState<ArtigoRow[]>([]);
  const [nickname, setNickname] = useState<string | null>(null);
  const [ordenacao, setOrdenacao] = useState<ArtigosOrdenacao>("PUBLICACAO_DESC");
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      const [artigosResult, profileResult] = await fetchArtigosPageData();
      if (!active) return;

      if (artigosResult.ok) {
        setItems(artigosResult.data.items);
        setOrdenacao(artigosResult.data.config.ordenacao_publica);
      } else {
        setError(artigosResult.error);
      }
      if (profileResult.ok) setNickname(profileResult.data.nickname ?? null);
      setLoading(false);
    }

    void loadInitial();

    return () => {
      active = false;
    };
  }, []);

  async function load() {
    setLoading(true);
    const [artigosResult, profileResult] = await fetchArtigosPageData();

    if (artigosResult.ok) {
      setItems(artigosResult.data.items);
      setOrdenacao(artigosResult.data.config.ordenacao_publica);
    } else {
      setError(artigosResult.error);
    }
    if (profileResult.ok) setNickname(profileResult.data.nickname ?? null);
    setLoading(false);
  }

  async function handleConfigChange(value: ArtigosOrdenacao) {
    setOrdenacao(value);
    setSavingConfig(true);
    const result = await apiFetchWithAuth<{ ordenacao_publica: ArtigosOrdenacao }>("/api/artigos", {
      method: "PATCH",
      body: JSON.stringify({ ordenacao_publica: value }),
    });
    if (!result.ok) setError(result.error);
    setSavingConfig(false);
  }

  async function handleCreate() {
    setCreating(true);
    setError(null);
    const result = await apiFetchWithAuth<ArtigoRow>("/api/artigos", {
      method: "POST",
      body: JSON.stringify({
        titulo: "",
        resumo: "",
        categoria: "MERCADO_IMOBILIARIO",
        status: "RASCUNHO",
        conteudo_blocos: { version: 1, blocks: [] },
      }),
    });

    if (result.ok) {
      window.location.href = `/artigos/${result.data.id}`;
      return;
    }
    setError(result.error);
    setCreating(false);
  }

  async function persistManualOrder(orderedItems: ArtigoRow[]) {
    setSavingOrder(true);
    const result = await apiFetchWithAuth<{ ordered_ids: string[] }>("/api/artigos", {
      method: "PATCH",
      body: JSON.stringify({ action: "REORDER", ordered_ids: orderedItems.map((item) => item.id) }),
    });
    if (!result.ok) {
      setError(result.error);
      void load();
    }
    setSavingOrder(false);
  }

  function handleDrop(targetId: string) {
    if (!draggedId || draggedId === targetId || ordenacao !== "MANUAL") return;

    const orderedItems = orderItemsForDisplay(items, ordenacao);
    const fromIndex = orderedItems.findIndex((item) => item.id === draggedId);
    const toIndex = orderedItems.findIndex((item) => item.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const nextItems = [...orderedItems];
    const [movedItem] = nextItems.splice(fromIndex, 1);
    nextItems.splice(toIndex, 0, movedItem);

    const reindexedItems = nextItems.map((item, index) => ({ ...item, ordem_manual: index + 1 }));
    setItems(reindexedItems);
    setDraggedId(null);
    void persistManualOrder(reindexedItems);
  }

  async function handleDelete(item: ArtigoRow) {
    const confirmed = window.confirm(`Remover o artigo "${item.titulo}"?`);
    if (!confirmed) return;

    const result = await apiFetchWithAuth<{ id: string }>(`/api/artigos/${item.id}`, { method: "DELETE" });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setItems((current) => current.filter((row) => row.id !== item.id));
  }

  const categoryMap = useMemo(
    () => Object.fromEntries(ARTIGO_CATEGORIAS.map((category) => [category.value, category.label])),
    [],
  );
  const orderedItems = useMemo(() => orderItemsForDisplay(items, ordenacao), [items, ordenacao]);
  const isManualOrder = ordenacao === "MANUAL";

  return (
    <AppShell
      title="Artigos"
      subtitle="Crie conteúdo orgânico com blocos seguros, SEO e CTAs do Corretor.one."
      rightSlot={
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary-scarlet)] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-95 disabled:cursor-wait disabled:opacity-70"
        >
          <Plus size={18} />
          Novo artigo
        </button>
      }
    >
      <div className="space-y-5">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Listagem pública</p>
              <h2 className="mt-2 text-2xl font-light text-slate-950">Como os artigos aparecem no perfil</h2>
            </div>
            <label className="grid gap-1 text-sm font-medium text-slate-600">
              Ordem da listagem
              <select
                value={ordenacao}
                onChange={(event) => void handleConfigChange(event.target.value as ArtigosOrdenacao)}
                className="min-w-72 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
              >
                <option value="PUBLICACAO_DESC">Publicação mais recente</option>
                <option value="ATUALIZACAO_DESC">Edição mais recente</option>
                <option value="MANUAL">Ordem manual</option>
              </select>
              {savingConfig ? <span className="text-xs text-slate-400">Salvando preferência...</span> : null}
              {isManualOrder ? (
                <span className="text-xs text-slate-400">Arraste os cards abaixo para ajustar a ordem pública.</span>
              ) : null}
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-slate-500">Carregando artigos...</div>
          ) : items.length === 0 ? (
            <div className="grid place-items-center gap-3 p-12 text-center">
              <NotePencil size={42} className="text-slate-300" />
              <p className="text-xl font-light text-slate-950">Nenhum artigo criado ainda.</p>
              <p className="max-w-xl text-sm leading-6 text-slate-500">
                Comece com um rascunho simples. A estrutura por blocos evita HTML livre e mantém o visual do Corretor.one.
              </p>
            </div>
          ) : (
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3 px-1 text-xs font-medium text-slate-400">
                <span>{orderedItems.length} artigo(s)</span>
                {savingOrder ? <span>Salvando ordem...</span> : null}
              </div>
              {orderedItems.map((item) => (
                <article
                  key={item.id}
                  draggable={isManualOrder}
                  onDragStart={(event) => {
                    if (!isManualOrder) return;
                    event.dataTransfer.effectAllowed = "move";
                    setDraggedId(item.id);
                  }}
                  onDragEnd={() => setDraggedId(null)}
                  onDragOver={(event) => {
                    if (!isManualOrder) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleDrop(item.id);
                  }}
                  className={`grid gap-4 rounded-2xl border bg-white p-3 shadow-sm transition ${
                    isManualOrder ? "md:grid-cols-[auto_168px_minmax(0,1fr)_auto]" : "md:grid-cols-[168px_minmax(0,1fr)_auto]"
                  } md:items-center ${
                    draggedId === item.id
                      ? "cursor-grabbing border-[var(--grey-olive)] opacity-60"
                      : `${isManualOrder ? "cursor-move" : ""} border-slate-200 hover:border-slate-300`
                  }`}
                >
                  {isManualOrder ? (
                    <button
                      type="button"
                      title="Mover artigo"
                      className="hidden h-11 w-11 cursor-move items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600 active:cursor-grabbing md:inline-flex"
                      aria-label={`Arrastar ${item.titulo}`}
                    >
                      <DotsSixVertical size={22} weight="bold" />
                    </button>
                  ) : null}

                  <div
                    className="flex aspect-[4/3] min-h-[132px] items-center justify-center overflow-hidden rounded-xl bg-slate-100 bg-cover bg-center text-slate-300 md:h-[112px] md:min-h-0"
                    style={item.capa_url ? { backgroundImage: `url(${item.capa_url})` } : undefined}
                    aria-label={item.capa_url ? `Capa de ${item.titulo}` : undefined}
                    role={item.capa_url ? "img" : undefined}
                  >
                    {!item.capa_url ? <ImageSquare size={34} /> : null}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--grey-olive)]">
                        {categoryMap[item.categoria] ?? item.categoria}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${statusBadgeClass(item.status)}`}>
                        {statusLabel(item.status)}
                      </span>
                      <span className="text-xs text-slate-400">{item.leitura_minutos} min de leitura</span>
                      {isManualOrder ? <span className="text-xs text-slate-400">Ordem {item.ordem_manual || "-"}</span> : null}
                    </div>
                    <h3 className="mt-3 line-clamp-2 text-xl font-light text-slate-950">{item.titulo || "Artigo sem título"}</h3>
                    {item.resumo ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{item.resumo}</p> : null}
                  </div>

                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {nickname && item.status === "PUBLICADO" ? (
                      <Link
                        href={`/${nickname}/artigos/${item.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                      >
                        <ArrowSquareOut size={16} />
                        Ver
                      </Link>
                    ) : null}
                    <Link
                      href={`/artigos/${item.id}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <NotePencil size={16} />
                      Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item)}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                    >
                      <Trash size={16} />
                      Remover
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function orderItemsForDisplay(items: ArtigoRow[], ordenacao: ArtigosOrdenacao) {
  return [...items].sort((a, b) => {
    if (ordenacao === "MANUAL") {
      return (a.ordem_manual ?? 0) - (b.ordem_manual ?? 0) || a.titulo.localeCompare(b.titulo);
    }
    if (ordenacao === "PUBLICACAO_DESC") {
      return dateValue(b.publicado_em ?? b.updated_at) - dateValue(a.publicado_em ?? a.updated_at);
    }
    return dateValue(b.updated_at) - dateValue(a.updated_at);
  });
}

function fetchArtigosPageData() {
  return Promise.all([
    apiFetchWithAuth<ArtigosResponse>("/api/artigos"),
    apiFetchWithAuth<ProfileData>("/api/profile"),
  ]);
}

function dateValue(value: string | null) {
  return value ? new Date(value).getTime() : 0;
}

function statusLabel(status: ArtigoRow["status"]) {
  if (status === "PUBLICADO") return "Publicado";
  if (status === "ARQUIVADO") return "Arquivado";
  return "Rascunho";
}

function statusBadgeClass(status: ArtigoRow["status"]) {
  if (status === "PUBLICADO") return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "ARQUIVADO") return "border border-amber-200 bg-amber-50 text-amber-700";
  return "border border-slate-200 bg-slate-100 text-slate-500";
}
