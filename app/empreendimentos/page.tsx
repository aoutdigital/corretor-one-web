"use client";

import Link from "next/link";
import { Button, Card } from "flowbite-react";
import { useEffect, useState } from "react";

import { AppShell } from "@/app/_components/app-shell";
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
    <AppShell
      title="Empreendimentos"
      subtitle="Gestão de condomínios e lançamentos"
      rightSlot={
        <Button as={Link} href="/empreendimentos/novo" color="blue" size="sm">
          Novo empreendimento
        </Button>
      }
    >
      <Card>
        {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
        <div className="grid gap-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/empreendimentos/${item.id}`}
              className="rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50"
            >
              <p className="text-base">{item.nome}</p>
              <p className="text-sm text-slate-500">
                {item.cidade}/{item.estado} • {item.status}
              </p>
            </Link>
          ))}
          {items.length === 0 ? <p className="text-sm text-slate-500">Nenhum empreendimento cadastrado.</p> : null}
        </div>
      </Card>
    </AppShell>
  );
}
