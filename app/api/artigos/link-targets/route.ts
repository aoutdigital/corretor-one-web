import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { authenticateByAccessToken } from "@/lib/db/_auth";
import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { buildImovelHeaderTitle } from "@/lib/imoveis/display-title";

type AnyDb = {
  from: (table: string) => any;
};

type LinkTarget = {
  id: string;
  type: "imovel" | "empreendimento" | "artigo";
  label: string;
  description: string;
  href: string;
  status: string | null;
};

type ImovelLinkRow = {
  id: string;
  codigo: string | null;
  status: string | null;
  slug_publico: string | null;
  finalidade: string | null;
  tipo_negociacao: string | null;
  tipo: string | null;
  subtipo: string | null;
  area_util: number | null;
  area_terreno: number | null;
  dormitorios: number | null;
  suites: number | null;
  salas: number | null;
  vagas: number | null;
  bairro_comercial: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
};

type EmpreendimentoLinkRow = {
  id: string;
  nome: string | null;
  status: string | null;
  slug_publico: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
};

type ArtigoLinkRow = {
  id: string;
  titulo: string | null;
  status: string | null;
  slug: string | null;
  categoria: string | null;
};

function unauthorizedResponse() {
  return NextResponse.json(
    { ok: false, error: { code: "UNAUTHORIZED", message: "Missing bearer token" } },
    { status: 401 },
  );
}

export async function GET(request: Request) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return NextResponse.json(auth, { status: statusFromErrorCode(auth.error.code) });

  const db = auth.data.client as unknown as AnyDb;
  const url = new URL(request.url);
  const query = normalizeSearch(url.searchParams.get("q"));

  const profileResult = await db.from("profiles").select("nickname").eq("id", auth.data.user.id).maybeSingle();
  const nickname = String(profileResult.data?.nickname ?? "").trim();
  if (!nickname) return NextResponse.json({ ok: true, data: { items: [] } });

  const [imoveisResult, empreendimentosResult, artigosResult] = await Promise.all([
    db
      .from("imoveis")
      .select("id,codigo,status,slug_publico,finalidade,tipo_negociacao,tipo,subtipo,area_util,area_terreno,dormitorios,suites,salas,vagas,bairro_comercial,bairro,cidade,estado")
      .eq("owner_id", auth.data.user.id)
      .eq("status", "PUBLICADO")
      .order("updated_at", { ascending: false })
      .limit(30),
    db
      .from("empreendimentos")
      .select("id,nome,status,slug_publico,bairro,cidade,estado")
      .eq("owner_id", auth.data.user.id)
      .eq("status", "PUBLICADO")
      .order("updated_at", { ascending: false })
      .limit(30),
    db
      .from("artigos")
      .select("id,titulo,status,slug,categoria")
      .eq("owner_id", auth.data.user.id)
      .eq("status", "PUBLICADO")
      .order("updated_at", { ascending: false })
      .limit(30),
  ]);

  const imoveis = ((imoveisResult.data ?? []) as ImovelLinkRow[])
    .filter((item) => Boolean(item.slug_publico))
    .filter((item) => matchesQuery(query, item.codigo, item.tipo, item.bairro_comercial, item.bairro, item.cidade, item.estado))
    .map<LinkTarget>((item) => {
      const label = buildImovelHeaderTitle(item);
      const operation = getOperationPath(item);
      return {
        id: item.id,
        type: "imovel",
        label,
        description: [item.codigo ? `Código ${item.codigo}` : "Imóvel", item.bairro_comercial || item.bairro, item.cidade].filter(Boolean).join(" · "),
        href: `/${nickname}/${operation}/${item.slug_publico}`,
        status: item.status,
      };
    });

  const empreendimentos = ((empreendimentosResult.data ?? []) as EmpreendimentoLinkRow[])
    .filter((item) => Boolean(item.slug_publico))
    .filter((item) => matchesQuery(query, item.nome, item.bairro, item.cidade, item.estado))
    .map<LinkTarget>((item) => ({
      id: item.id,
      type: "empreendimento",
      label: item.nome?.trim() || "Empreendimento",
      description: ["Empreendimento", item.bairro, item.cidade].filter(Boolean).join(" · "),
      href: `/${nickname}/${item.slug_publico}`,
      status: item.status,
    }));

  const artigos = ((artigosResult.data ?? []) as ArtigoLinkRow[])
    .filter((item) => Boolean(item.slug))
    .filter((item) => matchesQuery(query, item.titulo, item.categoria))
    .map<LinkTarget>((item) => ({
      id: item.id,
      type: "artigo",
      label: item.titulo?.trim() || "Artigo",
      description: ["Artigo", item.categoria].filter(Boolean).join(" · "),
      href: `/${nickname}/artigos/${item.slug}`,
      status: item.status,
    }));

  return NextResponse.json({ ok: true, data: { items: [...imoveis, ...empreendimentos, ...artigos].slice(0, 24) } });
}

function getOperationPath(item: Pick<ImovelLinkRow, "tipo_negociacao" | "finalidade">) {
  const negociacao = String(item.tipo_negociacao ?? "").toUpperCase();
  const finalidade = String(item.finalidade ?? "").toUpperCase();
  if (negociacao === "ALUGUEL" || finalidade === "ALUGAR") return "aluguel";
  return "venda";
}

function normalizeSearch(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function matchesQuery(query: string, ...values: Array<string | null | undefined>) {
  if (!query) return true;
  return values.some((value) => normalizeSearch(value).includes(query));
}
