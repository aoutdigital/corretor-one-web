import { NextResponse } from "next/server";

import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DashboardSummary = {
  leads: number;
  imoveis: number;
  empreendimentos: number;
  visualizacoes_portal: number;
  seguidores: number;
  verificacao: {
    creci_aprovado: boolean;
    avatar: boolean;
    telefone_verificado: boolean;
    email_verificado: boolean;
  };
};

type ProfileStatus = {
  id: string;
  creci_aprovacao: boolean;
  avatar_url: string | null;
  whatsapp_verificado_em: string | null;
  email_verificado_em: string | null;
};

async function countByOwner(
  client: ReturnType<typeof createSupabaseServerClient>,
  table: "leads" | "imoveis" | "empreendimentos",
  ownerId: string,
) {
  const result = await client
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId);

  if (result.error) return 0;
  return result.count ?? 0;
}

export async function GET(request: Request) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Missing bearer token" } },
      { status: 401 },
    );
  }

  const client = createSupabaseServerClient(accessToken);
  const auth = await client.auth.getUser();
  if (!auth.data.user) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Invalid access token" } },
      { status: 401 },
    );
  }

  const ownerId = auth.data.user.id;

  const [leads, imoveis, empreendimentos] = await Promise.all([
    countByOwner(client, "leads", ownerId),
    countByOwner(client, "imoveis", ownerId),
    countByOwner(client, "empreendimentos", ownerId),
  ]);

  const [viewsResult, followersResult, profileResult] = await Promise.all([
    client.from("imoveis").select("views_count").eq("owner_id", ownerId),
    client.from("user_follows").select("id", { count: "exact", head: true }).eq("corretor_id", ownerId),
    client
      .from("profiles")
      .select("id,creci_aprovacao,avatar_url,whatsapp_verificado_em,email_verificado_em")
      .eq("id", ownerId)
      .maybeSingle<ProfileStatus>(),
  ]);

  const visualizacoesPortal = viewsResult.error
    ? 0
    : (viewsResult.data ?? []).reduce((acc, item) => acc + Number(item.views_count ?? 0), 0);

  const summary: DashboardSummary = {
    leads,
    imoveis,
    empreendimentos,
    visualizacoes_portal: visualizacoesPortal,
    seguidores: followersResult.error ? 0 : (followersResult.count ?? 0),
    verificacao: {
      creci_aprovado: profileResult.data?.creci_aprovacao ?? false,
      avatar: Boolean(profileResult.data?.avatar_url),
      telefone_verificado: Boolean(profileResult.data?.whatsapp_verificado_em),
      email_verificado: Boolean(profileResult.data?.email_verificado_em),
    },
  };

  return NextResponse.json({ ok: true, data: summary }, { status: 200 });
}

