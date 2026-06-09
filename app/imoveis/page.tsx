"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CaretLeft,
  CaretRight,
  ClockCounterClockwise,
  Plus,
  Trash,
  X,
} from "@phosphor-icons/react";
import { Card } from "flowbite-react";
import { Suspense, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/app/_components/app-shell";
import { apiFetchWithAuth } from "@/lib/client/auth-api";

type Imovel = {
  id: string;
  codigo: string;
  titulo: string;
  status: string;
  step_rascunho?: number | null;
  tipo?: string | null;
  finalidade?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade: string;
  estado: string;
  created_at: string;
  updated_at: string;
};

const PAGE_SIZE = 9;
const MAX_RASCUNHOS = 5;

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase().trim();
}

function formatAddress(item: Imovel) {
  const rua = [item.logradouro?.trim(), item.numero?.trim()].filter(Boolean).join(", ");
  const local = [item.bairro?.trim(), [item.cidade?.trim(), item.estado?.trim()].filter(Boolean).join("/")]
    .filter(Boolean)
    .join(" - ");
  const full = [rua, local].filter(Boolean).join(" • ");
  return full || "Endereço não informado";
}

function formatEnumLabel(value: string | null | undefined) {
  if (!value) return "-";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ImoveisContent() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Imovel[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [quickQuery, setQuickQuery] = useState("");
  const [quickStatus, setQuickStatus] = useState("");
  const [sortBy, setSortBy] = useState("UPDATED_DESC");
  const [page, setPage] = useState(1);

  const [openDraftModal, setOpenDraftModal] = useState(false);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftActionLoadingId, setDraftActionLoadingId] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const deleteQueued = searchParams.get("exclusao_agendada") === "1";

  useEffect(() => {
    async function loadImoveis() {
      setLoading(true);
      const result = await apiFetchWithAuth<Imovel[]>("/api/imoveis");
      setLoading(false);

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setItems(result.data);
    }

    void loadImoveis();
  }, []);

  const availableStatuses = useMemo(
    () =>
      Array.from(new Set(items.map((item) => item.status).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [items],
  );

  const filteredAndSorted = useMemo(() => {
    const query = normalizeText(quickQuery);
    const filtered = items.filter((item) => {
      if (quickStatus && item.status !== quickStatus) return false;

      if (!query) return true;
      const haystack = [
        item.titulo,
        item.codigo,
        item.logradouro,
        item.bairro,
        item.cidade,
        item.estado,
        item.tipo,
      ]
        .map((value) => normalizeText(value))
        .join(" ");
      return haystack.includes(query);
    });

    const sorted = [...filtered];
    if (sortBy === "TITULO_ASC") sorted.sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
    if (sortBy === "TITULO_DESC") sorted.sort((a, b) => b.titulo.localeCompare(a.titulo, "pt-BR"));
    if (sortBy === "CREATED_DESC") sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (sortBy === "CREATED_ASC") sorted.sort((a, b) => a.created_at.localeCompare(b.created_at));
    if (sortBy === "UPDATED_DESC") sorted.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    if (sortBy === "UPDATED_ASC") sorted.sort((a, b) => a.updated_at.localeCompare(b.updated_at));

    return sorted;
  }, [items, quickQuery, quickStatus, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAndSorted.slice(start, start + PAGE_SIZE);
  }, [filteredAndSorted, currentPage]);

  const drafts = useMemo(
    () =>
      items
        .filter((item) => item.status === "RASCUNHO")
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [items],
  );

  async function reloadItems() {
    const result = await apiFetchWithAuth<Imovel[]>("/api/imoveis");
    if (!result.ok) {
      setDraftError(result.error);
      return;
    }
    setItems(result.data);
  }

  async function handleOpenDraftModal() {
    setOpenDraftModal(true);
    setDraftError(null);
    setDraftsLoading(true);
    await reloadItems();
    setDraftsLoading(false);
  }

  async function handleCreateDraft() {
    setCreatingDraft(true);
    setDraftError(null);
    const result = await apiFetchWithAuth<{ id: string }>("/api/imoveis", {
      method: "POST",
      body: JSON.stringify({}),
    });
    setCreatingDraft(false);

    if (!result.ok) {
      setDraftError(result.error);
      return;
    }

    window.location.href = `/imoveis/novo?imovel=${result.data.id}`;
  }

  async function handleDeleteDraft(imovelId: string) {
    setDraftActionLoadingId(imovelId);
    setDraftError(null);
    const result = await apiFetchWithAuth<{ id: string }>(`/api/imoveis/${imovelId}`, {
      method: "DELETE",
    });
    setDraftActionLoadingId(null);
    if (!result.ok) {
      setDraftError(result.error);
      return;
    }
    await reloadItems();
  }

  return (
    <AppShell title="Imóveis" subtitle="Gestão do estoque de anúncios">
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => void handleOpenDraftModal()}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-95"
        >
          <Plus size={16} className="mr-2" />
          Novo imóvel
        </button>
      </div>

      {deleteQueued ? (
        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Exclusão agendada. O imóvel já saiu da listagem e a limpeza restante será concluída em segundo plano.
        </div>
      ) : null}

      <Card className="!border-slate-200 !bg-white !text-slate-900">
        {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
        {loading ? <p className="mb-3 text-sm text-slate-500">Carregando imóveis...</p> : null}

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <input
            value={quickQuery}
            onChange={(event) => {
              setQuickQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Busca rápida: título, código, endereço, cidade"
            className="min-w-72 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <select
            value={quickStatus}
            onChange={(event) => {
              setQuickStatus(event.target.value);
              setPage(1);
            }}
            className="h-11 min-w-48 rounded-lg border border-slate-200 bg-white px-4 py-2 pr-10 text-sm font-medium"
          >
            <option value="">Status (todos)</option>
            {availableStatuses.map((status) => (
              <option key={status} value={status}>
                {formatEnumLabel(status)}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">{filteredAndSorted.length} imóvel(is) encontrado(s)</p>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="UPDATED_DESC">Atualização (mais recente)</option>
            <option value="UPDATED_ASC">Atualização (mais antiga)</option>
            <option value="CREATED_DESC">Criação (mais recente)</option>
            <option value="CREATED_ASC">Criação (mais antiga)</option>
            <option value="TITULO_ASC">Título (A-Z)</option>
            <option value="TITULO_DESC">Título (Z-A)</option>
          </select>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {currentItems.map((item) => {
            const editHref =
              item.status === "RASCUNHO"
                ? `/imoveis/novo?imovel=${item.id}&step=${Math.max(1, Math.min(11, item.step_rascunho ?? 1))}`
                : `/imoveis/${item.id}`;
            return (
              <article key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={editHref}
                      className="line-clamp-2 text-base font-semibold text-slate-900 hover:text-[var(--primary-scarlet)]"
                    >
                      {item.titulo || "Imóvel sem título"}
                    </Link>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        item.status === "PUBLICADO"
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                          : item.status === "RASCUNHO"
                            ? "border border-amber-200 bg-amber-50 text-amber-700"
                            : "border border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {formatEnumLabel(item.status)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">Código: {item.codigo || "-"}</p>
                  <p className="text-sm text-slate-600">{formatAddress(item)}</p>
                  <p className="text-xs text-slate-500">
                    Tipo: {formatEnumLabel(item.tipo)} • Finalidade: {formatEnumLabel(item.finalidade)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Atualizado em {new Date(item.updated_at).toLocaleString("pt-BR")}
                  </p>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Link
                      href={editHref}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      {item.status === "RASCUNHO" ? "Continuar cadastro" : "Editar"}
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {filteredAndSorted.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Nenhum imóvel cadastrado.</p>
        ) : null}

        {totalPages > 1 ? (
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CaretLeft size={14} />
              Anterior
            </button>
            <span className="text-xs text-slate-500">
              Página {currentPage} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Próxima
              <CaretRight size={14} />
            </button>
          </div>
        ) : null}
      </Card>

      {openDraftModal ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 px-4"
          onClick={() => {
            setOpenDraftModal(false);
            setDraftError(null);
          }}
        >
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Rascunhos de imóveis</h2>
                <p className="text-sm text-slate-500">
                  Você pode manter até {MAX_RASCUNHOS} rascunhos em andamento.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpenDraftModal(false);
                  setDraftError(null);
                }}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={16} />
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
                  <article key={draft.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          window.location.href = `/imoveis/novo?imovel=${draft.id}&step=${Math.max(1, Math.min(11, draft.step_rascunho ?? 1))}`;
                        }}
                        className="text-left"
                      >
                        <p className="text-sm font-semibold text-slate-900">{draft.titulo || "Novo imóvel (sem título)"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          <ClockCounterClockwise size={14} className="mr-1 inline-block" />
                          Atualizado em {new Date(draft.updated_at).toLocaleString("pt-BR")}
                        </p>
                      </button>

                      <button
                        type="button"
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                        disabled={draftActionLoadingId === draft.id}
                        onClick={() => void handleDeleteDraft(draft.id)}
                      >
                        <Trash size={14} />
                        Excluir
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {drafts.length}/{MAX_RASCUNHOS} rascunhos usados
              </p>
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={creatingDraft || drafts.length >= MAX_RASCUNHOS}
                onClick={() => void handleCreateDraft()}
              >
                <Plus size={16} />
                {creatingDraft ? "Criando..." : "Criar novo rascunho"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

export default function ImoveisPage() {
  return (
    <Suspense fallback={<main className="min-h-screen px-6 py-12">Carregando imóveis...</main>}>
      <ImoveisContent />
    </Suspense>
  );
}
