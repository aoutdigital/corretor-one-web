"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { CoreNav } from "@/app/_components/core-nav";
import { apiFetchWithAuth } from "@/lib/client/auth-api";

type Imovel = {
  id: string;
  codigo: string;
  slug_publico: string;
  titulo: string;
  status: string;
  tipo: string;
  finalidade: string;
  cidade: string;
  estado: string;
  created_at: string;
  updated_at: string;
};

export default function ImovelDetalhePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [item, setItem] = useState<Imovel | null>(null);
  const [titulo, setTitulo] = useState("");
  const [status, setStatus] = useState("RASCUNHO");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const result = await apiFetchWithAuth<Imovel>(`/api/imoveis/${id}`);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setItem(result.data);
      setTitulo(result.data.titulo);
      setStatus(result.data.status);
    }

    if (id) load();
  }, [id]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const result = await apiFetchWithAuth<{ id: string }>(`/api/imoveis/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ titulo, status }),
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setMessage("Imovel atualizado.");
  }

  if (!item) {
    return <main style={{ padding: 20 }}>Carregando imovel...</main>;
  }

  return (
    <main style={{ maxWidth: 820, margin: "32px auto", padding: 20 }}>
      <CoreNav />
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Editar imovel</h1>

      <section style={{ border: "1px solid #2f3542", borderRadius: 10, padding: 12, marginBottom: 16 }}>
        <h2 style={{ marginBottom: 6 }}>Preview rapido</h2>
        <p>
          <strong>{item.titulo}</strong>
        </p>
        <p>
          {item.tipo} - {item.finalidade}
        </p>
        <p>
          {item.cidade}/{item.estado} - {item.status}
        </p>
        <p>
          Slug: <code>{item.slug_publico}</code>
        </p>
        <p>
          URL publica esperada: <code>/{"{nickname}"}/imoveis/{item.slug_publico}</code>
        </p>
      </section>

      <form onSubmit={handleSave} style={{ display: "grid", gap: 10 }}>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required />

        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="RASCUNHO">RASCUNHO</option>
          <option value="PUBLICADO">PUBLICADO</option>
          <option value="PAUSADO">PAUSADO</option>
          <option value="VENDIDO">VENDIDO</option>
          <option value="ALUGADO">ALUGADO</option>
          <option value="INATIVO">INATIVO</option>
        </select>

        <button type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar alteracoes"}
        </button>
      </form>

      <p style={{ marginTop: 14 }}>
        <Link href="/imoveis">Voltar para lista</Link>
      </p>

      {error ? <p style={{ color: "#ff6b6b" }}>{error}</p> : null}
      {message ? <p style={{ color: "#7bed9f" }}>{message}</p> : null}
    </main>
  );
}
