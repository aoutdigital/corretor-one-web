"use client";

import Link from "next/link";
import { ArrowRight, Buildings, ChartLine, Eye, House, Plus, UserPlus, Users } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/app/_components/app-shell";
import { apiFetchWithAuth } from "@/lib/client/auth-api";

type DashboardSummary = {
  leads: number;
  imoveis: number;
  empreendimentos: number;
  visualizacoes_portal: number;
  seguidores: number;
  verificacao: {
    creci_aprovado: boolean;
    avatar: boolean;
    telefone_verificado: boolean;
    email_verificado: boolean;
  };
};

const EMPTY_SUMMARY: DashboardSummary = {
  leads: 0,
  imoveis: 0,
  empreendimentos: 0,
  visualizacoes_portal: 0,
  seguidores: 0,
  verificacao: {
    creci_aprovado: false,
    avatar: false,
    telefone_verificado: false,
    email_verificado: false,
  },
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary>(EMPTY_SUMMARY);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiFetchWithAuth<DashboardSummary>("/api/dashboard/summary").then((result) => {
      if (!active) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSummary(result.data);
    });
    return () => {
      active = false;
    };
  }, []);

  const verificationItems = useMemo(
    () => [
      { label: "CRECI aprovado", done: summary.verificacao.creci_aprovado },
      { label: "Avatar", done: summary.verificacao.avatar },
      { label: "Telefone verificado", done: summary.verificacao.telefone_verificado },
      { label: "E-mail verificado", done: summary.verificacao.email_verificado },
    ],
    [summary.verificacao],
  );

  const metricCards = [
    { title: "Leads", value: summary.leads, icon: Users },
    { title: "Imóveis", value: summary.imoveis, icon: House },
    { title: "Empreendimentos", value: summary.empreendimentos, icon: Buildings },
    { title: "Visualizações no Portal", value: summary.visualizacoes_portal, icon: Eye },
    { title: "Seguidores", value: summary.seguidores, icon: UserPlus },
  ];

  const totalAssets = Math.max(1, summary.imoveis + summary.empreendimentos);
  const imoveisPercent = Math.round((summary.imoveis / totalAssets) * 100);
  const emprePercent = 100 - imoveisPercent;

  return (
    <AppShell title="Olá!" subtitle="Veja como está seu desempenho hoje.">
      <div className="space-y-5">
        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {metricCards.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-2 inline-flex rounded-lg bg-slate-100 p-2 text-[var(--blue-slate)]">
                  <Icon size={20} />
                </div>
                <p className="text-2xl">{item.value}</p>
                <p className="text-sm text-slate-500">{item.title}</p>
              </article>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg">Resumo do portfólio</h2>
              <ChartLine size={18} className="text-slate-500" />
            </div>

            <div className="space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>Imóveis</span>
                  <span>{imoveisPercent}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-[var(--primary-scarlet)]"
                    style={{ width: `${imoveisPercent}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>Empreendimentos</span>
                  <span>{emprePercent}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-[var(--blue-slate)]"
                    style={{ width: `${emprePercent}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg">Links rápidos</h2>
            <div className="mt-3 grid gap-2">
              <Link
                href="/imoveis/novo"
                className="inline-flex items-center justify-between rounded-lg bg-[var(--primary-scarlet)] px-3 py-2 text-sm text-white"
              >
                <span className="inline-flex items-center gap-2">
                  <Plus size={16} />
                  Cadastrar imóvel
                </span>
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/empreendimentos/novo"
                className="inline-flex items-center justify-between rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
              >
                <span className="inline-flex items-center gap-2">
                  <Plus size={16} />
                  Cadastrar empreendimento
                </span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg">Status de verificação do perfil</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {verificationItems.map((item) => (
              <div
                key={item.label}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  item.done
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                {item.done ? "✓ " : "• "}
                {item.label}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

