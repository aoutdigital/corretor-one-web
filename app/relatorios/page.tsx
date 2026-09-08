"use client";

import { ArrowClockwise, ChartLineUp, CursorClick, EnvelopeSimple, Eye, Path, TrendUp, Users, WhatsappLogo } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { AppShell } from "@/app/_components/app-shell";
import { apiFetchWithAuth } from "@/lib/client/auth-api";

type ChannelRow = { key: string; label: string; visitors: number; sessions: number; touchpoints: number; first_touch_leads: number; attributed_leads: number; assisted_leads: number };
type CampaignRow = Omit<ChannelRow, "touchpoints">;
type ResourceRow = { type: string; label: string; views: number; visitors: number; conversions: number };
type TrafficReport = {
  period_days: number;
  summary: { visitors: number; sessions: number; views: number; conversions: number; conversion_rate: number; assisted_conversions: number; average_days_to_convert: number };
  channels: ChannelRow[];
  campaigns: CampaignRow[];
  resources: ResourceRow[];
};

const EMPTY: TrafficReport = { period_days: 30, summary: { visitors: 0, sessions: 0, views: 0, conversions: 0, conversion_rate: 0, assisted_conversions: 0, average_days_to_convert: 0 }, channels: [], campaigns: [], resources: [] };
const number = new Intl.NumberFormat("pt-BR");

export default function ReportsPage() {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<TrafficReport>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true; setLoading(true); setError(null);
    apiFetchWithAuth<TrafficReport>(`/api/marketing/reports/traffic?days=${days}`).then((result) => {
      if (!active) return;
      if (result.ok) setReport(result.data); else setError(result.error);
      setLoading(false);
    });
    return () => { active = false; };
  }, [days]);

  const cards = [
    { label: "Visitantes", value: number.format(report.summary.visitors), detail: "Pessoas identificadas", icon: Users },
    { label: "Sessões", value: number.format(report.summary.sessions), detail: "Jornadas de navegação", icon: Path },
    { label: "Visualizações", value: number.format(report.summary.views), detail: "Em conteúdos públicos", icon: Eye },
    { label: "Leads atribuídos", value: number.format(report.summary.conversions), detail: `${report.summary.conversion_rate.toLocaleString("pt-BR")}% dos visitantes`, icon: TrendUp },
    { label: "Com assistência", value: number.format(report.summary.assisted_conversions), detail: "Mais de um contato", icon: CursorClick },
  ];

  return (
    <AppShell title="Relatórios" subtitle="Entenda quais canais e conteúdos participam da geração dos seus leads.">
      <div className="space-y-5">
        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2" role="tablist" aria-label="Tipo de relatório">
            <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white" aria-selected="true"><ChartLineUp size={18}/>Tráfego</button>
            <button type="button" disabled className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm text-slate-400"><EnvelopeSimple size={18}/>E-mail <span className="text-[10px] uppercase">Em breve</span></button>
            <button type="button" disabled className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm text-slate-400"><WhatsappLogo size={18}/>WhatsApp <span className="text-[10px] uppercase">Em breve</span></button>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-500">Período<select value={days} onChange={(event) => setDays(Number(event.target.value))} className="min-w-36 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-[var(--blue-slate)]"><option value={7}>7 dias</option><option value={30}>30 dias</option><option value={90}>90 dias</option><option value={180}>180 dias</option></select></label>
        </section>

        {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {loading ? <div className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500"><ArrowClockwise className="mr-2 animate-spin"/>Carregando relatório...</div> : <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map((item) => { const Icon=item.icon; return <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="inline-flex rounded-xl bg-slate-100 p-2.5 text-[var(--blue-slate)]"><Icon size={20}/></span><p className="mt-4 text-3xl font-light tracking-tight text-slate-950">{item.value}</p><p className="mt-1 text-sm font-semibold text-slate-700">{item.label}</p><p className="mt-1 text-xs text-slate-400">{item.detail}</p></article>; })}</div>

          <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
            <ReportSection title="Canais de aquisição" subtitle="First touch mostra quem iniciou a jornada; atribuição usa o último contato não direto.">
              <ReportTable rows={report.channels}/>
            </ReportSection>
            <ReportSection title="Conteúdos públicos" subtitle="Onde sua audiência está consumindo informação.">
              <div className="space-y-3">{report.resources.length ? report.resources.map((item) => <div key={item.type} className="rounded-xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-center justify-between"><p className="font-semibold text-slate-800">{item.label}</p><p className="text-sm text-slate-500">{number.format(item.views)} views</p></div><div className="mt-2 flex gap-4 text-xs text-slate-500"><span>{number.format(item.visitors)} visitantes</span><span>{number.format(item.conversions)} conversões</span></div></div>) : <Empty/>}</div>
            </ReportSection>
          </div>

          <ReportSection title="Campanhas e fontes" subtitle="As assistências reconhecem campanhas que participaram do caminho mesmo sem fechar a conversão.">
            <ReportTable rows={report.campaigns}/>
          </ReportSection>

          <p className="px-1 text-xs leading-5 text-slate-400">Janela de atribuição: 180 dias. Acesso direto aparece na jornada, mas não apaga a última fonte conhecida. Tempo médio até a conversão no período: {report.summary.average_days_to_convert} dia(s).</p>
        </>}
      </div>
    </AppShell>
  );
}

function ReportSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><header className="border-b border-slate-100 px-5 py-4"><h2 className="text-lg font-semibold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></header><div className="p-5">{children}</div></section>; }
function Empty() { return <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">Ainda não há dados neste período.</div>; }
function ReportTable({ rows }: { rows: Array<ChannelRow | CampaignRow> }) { if (!rows.length) return <Empty/>; return <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="text-xs uppercase tracking-wide text-slate-400"><th className="pb-3 font-medium">Origem</th><th className="pb-3 text-right font-medium">Visitantes</th><th className="pb-3 text-right font-medium">Sessões</th><th className="pb-3 text-right font-medium">First touch</th><th className="pb-3 text-right font-medium">Atribuídos</th><th className="pb-3 text-right font-medium">Auxiliares</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((item) => <tr key={item.key}><td className="py-3.5 font-medium text-slate-800">{item.label}</td><td className="py-3.5 text-right text-slate-600">{number.format(item.visitors)}</td><td className="py-3.5 text-right text-slate-600">{number.format(item.sessions)}</td><td className="py-3.5 text-right text-slate-600">{number.format(item.first_touch_leads)}</td><td className="py-3.5 text-right font-semibold text-slate-900">{number.format(item.attributed_leads)}</td><td className="py-3.5 text-right text-slate-600">{number.format(item.assisted_leads)}</td></tr>)}</tbody></table></div>; }
