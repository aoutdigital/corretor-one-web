"use client";

import Link from "next/link";
import { ArrowRight, ChartLine, Waveform } from "@phosphor-icons/react";

import { AppShell } from "@/app/_components/app-shell";

export default function NegociosFunilPage() {
  return (
    <AppShell
      title="Funil de Negócios"
      subtitle="O pipeline dedicado vai ganhar uma experiência própria, separada da lista de leads."
      rightSlot={
        <Link
          href="/negocios"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Voltar para leads
          <ArrowRight size={14} />
        </Link>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(24,62,110,0.10),transparent_38%),linear-gradient(135deg,#ffffff,#f8fafc)] p-6">
          <div className="inline-flex rounded-2xl bg-[var(--blue-slate)]/10 p-3 text-[var(--blue-slate)]">
            <Waveform size={24} />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-slate-900">Próxima evolução do CRM</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Esta rota será a leitura visual do pipeline comercial: colunas, prioridade, próximas ações,
            conversão por etapa e movimentação direta dos negócios.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white bg-white/90 p-4">
              <p className="text-sm font-semibold text-slate-900">Etapas claras</p>
              <p className="mt-1 text-sm text-slate-500">Visão de entrada, qualificação, oportunidade e fechamento.</p>
            </div>
            <div className="rounded-2xl border border-white bg-white/90 p-4">
              <p className="text-sm font-semibold text-slate-900">Ação operacional</p>
              <p className="mt-1 text-sm text-slate-500">Próximas atividades e contexto do lead dentro do próprio card.</p>
            </div>
            <div className="rounded-2xl border border-white bg-white/90 p-4">
              <p className="text-sm font-semibold text-slate-900">Leitura de receita</p>
              <p className="mt-1 text-sm text-slate-500">Valor estimado, gargalos e avanço real do funil.</p>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6">
          <div className="inline-flex rounded-2xl bg-slate-100 p-3 text-[var(--blue-slate)]">
            <ChartLine size={24} />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">O que já está pronto</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              Lista de leads com busca, filtros, paginação e seleção em lote.
            </li>
            <li className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              Cards com contexto de interesse, atividades, valor e status comercial.
            </li>
            <li className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              Criação manual de lead já integrada ao CRM.
            </li>
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
