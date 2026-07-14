"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/app/_components/app-shell";
import { apiFetchWithAuth } from "@/lib/client/auth-api";

type ArtigoRow = {
  id: string;
};

export default function NovoArtigoPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function createDraft() {
      const result = await apiFetchWithAuth<ArtigoRow>("/api/artigos", {
        method: "POST",
        body: JSON.stringify({
          titulo: "Novo artigo do corretor",
          slug: `novo-artigo-${Date.now()}`,
          categoria: "MERCADO_IMOBILIARIO",
          status: "RASCUNHO",
          conteudo_blocos: { version: 1, blocks: [] },
        }),
      });

      if (result.ok) {
        window.location.replace(`/artigos/${result.data.id}`);
        return;
      }
      setError(result.error);
    }

    void createDraft();
  }, []);

  return (
    <AppShell title="Novo artigo" subtitle="Preparando um rascunho seguro para edição.">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : (
          <p className="text-slate-500">Criando rascunho...</p>
        )}
      </div>
    </AppShell>
  );
}
