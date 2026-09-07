"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowSquareOut, FilePlus, NotePencil, Trash } from "@phosphor-icons/react";
import { AppShell } from "@/app/_components/app-shell";
import { apiFetchWithAuth } from "@/lib/client/auth-api";
import { LANDING_PAGE_TYPE_OPTIONS, type LandingPageStatus, type LandingPageType } from "@/lib/landing-pages/content";

type Item = { id: string; nome_interno: string; titulo: string; slug: string; tipo: LandingPageType; status: LandingPageStatus; updated_at: string; metrics:{views:number;visitors:number;submissions:number;conversion_rate:number} };
type Profile = { nickname?: string | null };

export default function LandingPagesListPage() {
  const [items, setItems] = useState<Item[]>([]); const [nickname, setNickname] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let active = true; Promise.all([apiFetchWithAuth<{ items: Item[] }>("/api/paginas-captura"), apiFetchWithAuth<Profile>("/api/profile")]).then(([pages, profile]) => { if (!active) return; if (pages.ok) setItems(pages.data.items); else setError(pages.error); if (profile.ok) setNickname(profile.data.nickname ?? null); setLoading(false); }); return () => { active = false; }; }, []);
  async function remove(item: Item) { if (!window.confirm(`Remover a página "${item.nome_interno}"?`)) return; const result = await apiFetchWithAuth(`/api/paginas-captura/${item.id}`, { method: "DELETE" }); if (result.ok) setItems((current) => current.filter((row) => row.id !== item.id)); else setError(result.error); }
  return <AppShell title="Páginas de Captura" subtitle="Crie páginas focadas em campanhas e conversão de leads." rightSlot={<Link href="/paginas-captura/nova" className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary-scarlet)] px-4 py-2.5 text-sm font-bold text-white"><FilePlus size={18}/>Nova página</Link>}>
    {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {loading ? <p className="p-6 text-slate-500">Carregando páginas...</p> : items.length === 0 ? <div className="p-12 text-center"><p className="text-2xl font-light">Nenhuma página de captura ainda.</p><Link href="/paginas-captura/nova" className="mt-5 inline-flex rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white">Criar primeira página</Link></div> : <div className="space-y-3">{items.map((item) => <article key={item.id} className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center">
        <div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-stone-100 px-2 py-1 text-[11px] font-bold uppercase text-[var(--grey-olive)]">{LANDING_PAGE_TYPE_OPTIONS.find((type) => type.value === item.tipo)?.label}</span><span className={`rounded-full px-2 py-1 text-[11px] font-bold uppercase ${item.status === "PUBLICADO" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{item.status}</span></div><h2 className="mt-2 text-xl font-light">{item.nome_interno}</h2><p className="truncate text-sm text-slate-500">/{nickname ?? "nickname"}/{item.slug}</p><p className="mt-2 text-xs text-slate-400">{item.metrics.views} visualizações · {item.metrics.visitors} visitantes · {item.metrics.submissions} envios · {item.metrics.conversion_rate}% conversão</p></div>
        <div className="flex gap-2">{nickname && item.status === "PUBLICADO" ? <Link target="_blank" href={`/${nickname}/${item.slug}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"><ArrowSquareOut size={16}/>Ver</Link> : null}<Link href={`/paginas-captura/${item.id}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"><NotePencil size={16}/>Editar</Link><button type="button" onClick={() => void remove(item)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600"><Trash size={16}/>Remover</button></div>
      </article>)}</div>}
    </section>
  </AppShell>;
}
