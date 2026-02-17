"use client";

import { FormEvent, useEffect, useState } from "react";

import { CoreNav } from "@/app/_components/core-nav";
import { apiFetchWithAuth } from "@/lib/client/auth-api";

type Atividade = {
  id: string;
  lead_id: string;
  tipo: string;
  titulo: string;
  status: string;
  quando_em: string | null;
};

export default function NegociosAtividadesPage() {
  const [items, setItems] = useState<Atividade[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [leadId, setLeadId] = useState("");
  const [tipo, setTipo] = useState("LIGACAO");
  const [titulo, setTitulo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function run() {
      const result = await apiFetchWithAuth<Atividade[]>("/api/atividades");
      if (!active) return;

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setItems(result.data);
    }

    void run();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const result = await apiFetchWithAuth<{ id: string }>("/api/atividades", {
      method: "POST",
      body: JSON.stringify({ lead_id: leadId, tipo, titulo }),
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setLeadId("");
    setTitulo("");

    const refreshed = await apiFetchWithAuth<Atividade[]>("/api/atividades");
    if (!refreshed.ok) {
      setError(refreshed.error);
      return;
    }
    setItems(refreshed.data);
  }

  return (
    <main style={{ maxWidth: 980, margin: "32px auto", padding: 20 }}>
      <CoreNav />
      <h1 style={{ fontSize: 28 }}>Atividades</h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10, marginTop: 16, marginBottom: 20 }}>
        <input value={leadId} onChange={(event) => setLeadId(event.target.value)} placeholder="Lead ID" required />
        <select value={tipo} onChange={(event) => setTipo(event.target.value)}>
          <option value="LIGACAO">LIGACAO</option>
          <option value="WHATSAPP">WHATSAPP</option>
          <option value="EMAIL">EMAIL</option>
          <option value="VISITA">VISITA</option>
          <option value="TAREFA">TAREFA</option>
          <option value="OUTRO">OUTRO</option>
        </select>
        <input value={titulo} onChange={(event) => setTitulo(event.target.value)} placeholder="Titulo" required />
        <button type="submit" disabled={saving}>
          {saving ? "Criando..." : "Criar atividade"}
        </button>
      </form>

      {error ? <p style={{ color: "#ff6b6b" }}>{error}</p> : null}

      <div style={{ display: "grid", gap: 10 }}>
        {items.map((item) => (
          <div key={item.id} style={{ border: "1px solid #2f3542", borderRadius: 10, padding: 12 }}>
            <strong>{item.titulo}</strong>
            <p>
              {item.tipo} - {item.status}
            </p>
            <p>Lead: {item.lead_id}</p>
          </div>
        ))}

        {items.length === 0 ? <p>Nenhuma atividade cadastrada.</p> : null}
      </div>
    </main>
  );
}
