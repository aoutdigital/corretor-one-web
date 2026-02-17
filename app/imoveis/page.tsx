"use client";

import Link from "next/link";
import { Badge, Button, Card, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import { useEffect, useState } from "react";

import { AppShell } from "@/app/_components/app-shell";
import { apiFetchWithAuth } from "@/lib/client/auth-api";

type Imovel = {
  id: string;
  codigo: string;
  titulo: string;
  status: string;
  cidade: string;
  estado: string;
  created_at: string;
};

export default function ImoveisPage() {
  const [items, setItems] = useState<Imovel[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const result = await apiFetchWithAuth<Imovel[]>("/api/imoveis");
      if (!active) return;

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setItems(result.data);
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <AppShell
      title="Imoveis"
      subtitle="Gestao do estoque de anuncios"
      rightSlot={
        <Button as={Link} href="/imoveis/novo" color="blue" size="sm">
          Novo imovel
        </Button>
      }
    >
      <Card>
        {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}

        <div className="overflow-x-auto">
          <Table hoverable>
            <TableHead>
              <TableHeadCell>Titulo</TableHeadCell>
              <TableHeadCell>Codigo</TableHeadCell>
              <TableHeadCell>Local</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Acoes</TableHeadCell>
            </TableHead>
            <TableBody className="divide-y">
              {items.map((item) => (
                <TableRow key={item.id} className="bg-white">
                  <TableCell>{item.titulo}</TableCell>
                  <TableCell>{item.codigo}</TableCell>
                  <TableCell>
                    {item.cidade}/{item.estado}
                  </TableCell>
                  <TableCell>
                    <Badge color={item.status === "PUBLICADO" ? "success" : "gray"}>{item.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/imoveis/${item.id}`} className="text-blue-700 hover:underline">
                      Editar
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {items.length === 0 ? <p className="mt-3 text-sm text-slate-500">Nenhum imovel cadastrado.</p> : null}
      </Card>
    </AppShell>
  );
}
