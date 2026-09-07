"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/app/_components/app-shell";
import { apiFetchWithAuth } from "@/lib/client/auth-api";
import { LANDING_PAGE_TYPE_OPTIONS, slugifyLandingPage, type LandingPageType } from "@/lib/landing-pages/content";

export default function NewLandingPage() {
  const router = useRouter(); const [title, setTitle] = useState(""); const [type, setType] = useState<LandingPageType>("PRE_LANCAMENTO"); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  async function create() { setSaving(true); setError(null); const result = await apiFetchWithAuth<{ id: string }>("/api/paginas-captura", { method: "POST", body: JSON.stringify({ titulo: title, nome_interno: title, slug: slugifyLandingPage(title), tipo: type }) }); if (result.ok) router.push(`/paginas-captura/${result.data.id}`); else { setError(result.error); setSaving(false); } }
  return <AppShell title="Nova página de captura" subtitle="Escolha o objetivo; criaremos uma estrutura inicial que poderá ser personalizada."><section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="space-y-5">{error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}<label className="grid gap-1 text-sm font-medium">Nome da campanha<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="Ex.: Lista VIP Vila Mariana" className="rounded-xl border border-slate-200 px-4 py-3 text-lg outline-none focus:border-slate-400"/></label><label className="grid gap-1 text-sm font-medium">Tipo<select value={type} onChange={(event) => setType(event.target.value as LandingPageType)} className="rounded-xl border border-slate-200 bg-white px-4 py-3">{LANDING_PAGE_TYPE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><button type="button" disabled={saving || title.trim().length < 3} onClick={() => void create()} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">{saving ? "Criando..." : "Criar e abrir editor"}</button></div></section></AppShell>;
}
