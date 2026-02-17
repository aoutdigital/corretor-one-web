"use client";

import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  Label,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  TextInput,
} from "flowbite-react";
import { FormEvent, useEffect, useState } from "react";

import { AppShell } from "@/app/_components/app-shell";
import { apiFetchWithAuth } from "@/lib/client/auth-api";

type Negocio = {
  id: string;
  lead_id: string;
  titulo: string | null;
  etapa: string;
  valor_estimado: number | null;
  created_at: string;
};

export default function NegociosPage() {
  const [items, setItems] = useState<Negocio[]>([]);
  const [leadId, setLeadId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [etapa, setEtapa] = useState("NOVO");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function run() {
      const result = await apiFetchWithAuth<Negocio[]>("/api/negocios");
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

    const result = await apiFetchWithAuth<{ id: string }>("/api/negocios", {
      method: "POST",
      body: JSON.stringify({
        lead_id: leadId,
        titulo: titulo || null,
        etapa,
      }),
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setLeadId("");
    setTitulo("");

    const refreshed = await apiFetchWithAuth<Negocio[]>("/api/negocios");
    if (!refreshed.ok) {
      setError(refreshed.error);
      return;
    }
    setItems(refreshed.data);
  }

  return (
    <AppShell
      title="Negocios"
      subtitle="Pipeline comercial com foco em conversao"
      rightSlot={
        <Button as={Link} href="/negocios/atividades" color="light" size="sm">
          Ver atividades
        </Button>
      }
    >
      <div className="space-y-4">
        <Card>
          <h3 className="mb-3 text-lg font-semibold">Novo negocio</h3>
          <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-3">
            <div>
              <Label htmlFor="lead-id" value="Lead ID" />
              <TextInput
                id="lead-id"
                value={leadId}
                onChange={(event) => setLeadId(event.target.value)}
                placeholder="UUID do lead"
                required
              />
            </div>

            <div>
              <Label htmlFor="titulo" value="Titulo" />
              <TextInput
                id="titulo"
                value={titulo}
                onChange={(event) => setTitulo(event.target.value)}
                placeholder="Ex: Compra apto Centro"
              />
            </div>

            <div>
              <Label htmlFor="etapa" value="Etapa" />
              <Select id="etapa" value={etapa} onChange={(event) => setEtapa(event.target.value)}>
                <option value="NOVO">NOVO</option>
                <option value="CONTATO">CONTATO</option>
                <option value="VISITA">VISITA</option>
                <option value="PROPOSTA">PROPOSTA</option>
                <option value="GANHO">GANHO</option>
                <option value="PERDIDO">PERDIDO</option>
              </Select>
            </div>

            <div className="md:col-span-3">
              <Button type="submit" color="blue" isProcessing={saving}>
                Criar negocio
              </Button>
            </div>
          </form>
          {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        </Card>

        <Card>
          <h3 className="mb-3 text-lg font-semibold">Pipeline</h3>
          <div className="overflow-x-auto">
            <Table hoverable>
              <TableHead>
                <TableHeadCell>Titulo</TableHeadCell>
                <TableHeadCell>Etapa</TableHeadCell>
                <TableHeadCell>Lead</TableHeadCell>
                <TableHeadCell>Valor</TableHeadCell>
                <TableHeadCell>Acoes</TableHeadCell>
              </TableHead>
              <TableBody className="divide-y">
                {items.map((item) => (
                  <TableRow key={item.id} className="bg-white">
                    <TableCell>{item.titulo ?? "Sem titulo"}</TableCell>
                    <TableCell>
                      <Badge color="info">{item.etapa}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">{item.lead_id}</TableCell>
                    <TableCell>{item.valor_estimado ?? "-"}</TableCell>
                    <TableCell>
                      <Link href={`/lead/${item.lead_id}`} className="text-blue-700 hover:underline">
                        Abrir lead
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {items.length === 0 ? <p className="mt-3 text-sm text-slate-500">Nenhum negocio cadastrado.</p> : null}
        </Card>
      </div>
    </AppShell>
  );
}
