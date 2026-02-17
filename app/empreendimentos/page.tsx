"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CoreNav } from "@/app/_components/core-nav";
import { apiFetchWithAuth } from "@/lib/client/auth-api";

type Empreendimento = {
  id: string;
  slug_publico: string;
  nome: string;
  status: string;
  cidade: string;
  estado: string;
};

export default function EmpreendimentosPage() {
  const [items, setItems] = useState<Empreendimento[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const result = await apiFetchWithAuth<Empreendimento[]>("/api/empreendimentos");
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setItems(result.data);
    }

    load();
  }, []);

  return (
    <main style={{ maxWidth: 960, margin: "32px auto", padding: 20 }}>
      <CoreNav />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 28 }}>Empreendimentos</h1>
        <Link href="/empreendimentos/novo">Novo empreendimento</Link>
      </div>

      {error ? <p style={{ color: "#ff6b6b" }}>{error}</p> : null}

      <div style={{ marginTop: 20, display: "grid", gap: 10 }}>
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/empreendimentos/${item.id}`}
            style={{ border: "1px solid #2f3542", borderRadius: 10, padding: 12, textDecoration: "none" }}
          >
            <strong>{item.nome}</strong>
            <p>
              {item.cidade}/{item.estado} - {item.status}
            </p>
          </Link>
        ))}

        {items.length === 0 ? <p>Nenhum empreendimento cadastrado.</p> : null}
      </div>
    </main>
  );
}
