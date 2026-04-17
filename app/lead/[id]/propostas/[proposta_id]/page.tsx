"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { CoreNav } from "@/app/_components/core-nav";
import { apiFetchWithAuth } from "@/lib/client/auth-api";

type Proposta = {
  id: string;
  titulo: string;
  status: string;
  valor: number | null;
  tipo: string;
};

export default function PropostaDetalhePage() {
  const params = useParams<{ id: string; proposta_id: string }>();
  const leadId = params.id;
  const propostaId = params.proposta_id;

  const [proposta, setProposta] = useState<Proposta | null>(null);
  const [titulo, setTitulo] = useState("");
  const [status, setStatus] = useState("RASCUNHO");
  const [valor, setValor] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const result = await apiFetchWithAuth<Proposta[]>(`/api/propostas?lead_id=${leadId}`);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      const current = result.data.find((item) => item.id === propostaId);
      if (!current) {
        setError("Proposta nao encontrada para este lead.");
        return;
      }

      setProposta(current);
      setTitulo(current.titulo);
      setStatus(current.status);
      setValor(current.valor?.toString() ?? "");
    }

    if (leadId && propostaId) load();
  }, [leadId, propostaId]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const result = await apiFetchWithAuth<{ id: string }>(`/api/propostas/${propostaId}`, {
      method: "PATCH",
      body: JSON.stringify({
        titulo,
        status,
        valor: valor ? Number(valor) : null,
      }),
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setMessage("Proposta atualizada.");
  }

  if (!proposta) {
    return <main style={{ padding: 20 }}>Carregando proposta...</main>;
  }

  return (
    <main style={{ maxWidth: 760, margin: "32px auto", padding: 20 }}>
      <CoreNav />
      <h1 style={{ fontSize: 28, marginBottom: 10 }}>Proposta {propostaId}</h1>
      <p style={{ marginBottom: 14 }}>Lead: {leadId}</p>

      <form onSubmit={handleSave} style={{ display: "grid", gap: 10 }}>
        <input value={titulo} onChange={(event) => setTitulo(event.target.value)} required />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="RASCUNHO">RASCUNHO</option>
          <option value="ENVIADA">ENVIADA</option>
          <option value="ACEITA">ACEITA</option>
          <option value="RECUSADA">RECUSADA</option>
          <option value="EXPIRADA">EXPIRADA</option>
        </select>
        <input
          type="number"
          value={valor}
          onChange={(event) => setValor(event.target.value)}
          placeholder="Valor"
        />
        <button type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar proposta"}
        </button>
      </form>

      <p style={{ marginTop: 14 }}>
        <Link href={`/lead/${leadId}`}>Voltar para lead</Link>
      </p>

      {error ? <p style={{ color: "#ff6b6b" }}>{error}</p> : null}
      {message ? <p style={{ color: "#7bed9f" }}>{message}</p> : null}
    </main>
  );
}
