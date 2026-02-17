"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { CoreNav } from "@/app/_components/core-nav";
import { apiFetchWithAuth } from "@/lib/client/auth-api";

type Proposta = {
  id: string;
  titulo: string;
  tipo: string;
  status: string;
  valor: number | null;
};

type Atividade = {
  id: string;
  titulo: string;
  tipo: string;
  status: string;
};

type TimelineEvento = {
  id: string;
  tipo: string;
  titulo: string;
  created_at: string;
};

export default function LeadDetalhePage() {
  const params = useParams<{ id: string }>();
  const leadId = params.id;

  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvento[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [propostaTitulo, setPropostaTitulo] = useState("");
  const [propostaTipo, setPropostaTipo] = useState("COMPRA");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!leadId) return;

    let active = true;

    async function run() {
      const [propostasResult, atividadesResult, timelineResult] = await Promise.all([
        apiFetchWithAuth<Proposta[]>(`/api/propostas?lead_id=${leadId}`),
        apiFetchWithAuth<Atividade[]>(`/api/atividades?lead_id=${leadId}`),
        apiFetchWithAuth<TimelineEvento[]>(`/api/timeline?lead_id=${leadId}`),
      ]);

      if (!active) return;

      if (!propostasResult.ok) {
        setError(propostasResult.error);
        return;
      }
      if (!atividadesResult.ok) {
        setError(atividadesResult.error);
        return;
      }
      if (!timelineResult.ok) {
        setError(timelineResult.error);
        return;
      }

      setPropostas(propostasResult.data);
      setAtividades(atividadesResult.data);
      setTimeline(timelineResult.data);
    }

    void run();
    return () => {
      active = false;
    };
  }, [leadId]);

  async function handleCreateProposta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const result = await apiFetchWithAuth<{ id: string }>("/api/propostas", {
      method: "POST",
      body: JSON.stringify({
        lead_id: leadId,
        titulo: propostaTitulo,
        tipo: propostaTipo,
      }),
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setPropostaTitulo("");

    const refreshed = await apiFetchWithAuth<Proposta[]>(`/api/propostas?lead_id=${leadId}`);
    if (!refreshed.ok) {
      setError(refreshed.error);
      return;
    }
    setPropostas(refreshed.data);
  }

  return (
    <main style={{ maxWidth: 980, margin: "32px auto", padding: 20 }}>
      <CoreNav />
      <h1 style={{ fontSize: 28, marginBottom: 10 }}>Lead {leadId}</h1>

      <form onSubmit={handleCreateProposta} style={{ display: "grid", gap: 10, marginBottom: 18 }}>
        <h2>Criar proposta</h2>
        <input
          value={propostaTitulo}
          onChange={(event) => setPropostaTitulo(event.target.value)}
          placeholder="Titulo da proposta"
          required
        />
        <select value={propostaTipo} onChange={(event) => setPropostaTipo(event.target.value)}>
          <option value="COMPRA">COMPRA</option>
          <option value="LOCACAO">LOCACAO</option>
          <option value="OUTRO">OUTRO</option>
        </select>
        <button type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Criar proposta"}
        </button>
      </form>

      {error ? <p style={{ color: "#ff6b6b" }}>{error}</p> : null}

      <section style={{ marginBottom: 16 }}>
        <h2>Propostas</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {propostas.map((proposta) => (
            <Link key={proposta.id} href={`/lead/${leadId}/propostas/${proposta.id}`}>
              {proposta.titulo} - {proposta.status}
            </Link>
          ))}
          {propostas.length === 0 ? <p>Sem propostas.</p> : null}
        </div>
      </section>

      <section style={{ marginBottom: 16 }}>
        <h2>Atividades</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {atividades.map((atividade) => (
            <p key={atividade.id}>
              {atividade.titulo} - {atividade.tipo} ({atividade.status})
            </p>
          ))}
          {atividades.length === 0 ? <p>Sem atividades.</p> : null}
        </div>
      </section>

      <section>
        <h2>Timeline</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {timeline.map((evento) => (
            <p key={evento.id}>
              {evento.titulo} - {evento.tipo}
            </p>
          ))}
          {timeline.length === 0 ? <p>Sem eventos.</p> : null}
        </div>
      </section>
    </main>
  );
}
