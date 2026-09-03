"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowSquareOut, NotePencil, Plus, Trash } from "@phosphor-icons/react";

import { AppShell } from "@/app/_components/app-shell";
import { ARTIGO_CATEGORIAS, type ArtigosOrdenacao } from "@/lib/artigos/content";
import { apiFetchWithAuth } from "@/lib/client/auth-api";

type ArtigoRow = {
  id: string;
  status: "RASCUNHO" | "PUBLICADO" | "ARQUIVADO";
  categoria: string;
  titulo: string;
  slug: string;
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
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const [artigosResult, profileResult] = await Promise.all([
      apiFetchWithAuth<ArtigosResponse>("/api/artigos"),
      apiFetchWithAuth<ProfileData>("/api/profile"),
    ]);

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
            <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <article key={item.id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--grey-olive)]">
                        {categoryMap[item.categoria] ?? item.categoria}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        {item.status}
                      </span>
                      <span className="text-xs text-slate-400">{item.leitura_minutos} min de leitura</span>
                    </div>
                    <h3 className="mt-3 truncate text-xl font-light text-slate-950">{item.titulo}</h3>
                    {item.resumo ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{item.resumo}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
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
