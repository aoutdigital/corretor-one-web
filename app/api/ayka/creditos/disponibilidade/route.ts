import { NextResponse } from "next/server";

import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AssinaturaAtivaRow = {
  id: string;
  owner_id: string;
  plano_id: string;
  inicio_em: string;
  fim_em: string | null;
  stripe_current_period_end: string | null;
};

type PlanoRow = {
  id: string;
  ayka_franquia_mensal: number;
};

type AykaCustoRow = {
  acao_codigo: string;
  modelo: string;
  modelo_api: string;
  custo_creditos: number;
  ativo: boolean;
};

type AykaFranquiaCicloRow = {
  id: string;
  owner_id: string;
  assinatura_id: string;
  plano_id: string;
  ciclo_inicio: string;
  ciclo_fim: string;
  creditos: number;
};

type AykaLoteRow = {
  id: string;
  owner_id: string;
  creditos_disponiveis: number;
  expira_em: string | null;
};

function unauthorizedResponse() {
  return NextResponse.json(
    { ok: false, error: { code: "UNAUTHORIZED", message: "Missing bearer token" } },
    { status: 401 },
  );
}

function normalizeToken(value: string | null, fallback: string) {
  const trimmed = value?.trim().toUpperCase() ?? "";
  return trimmed.length > 0 ? trimmed : fallback;
}

function resolveCicloFim(assinatura: AssinaturaAtivaRow, now: Date) {
  const stripeEnd = assinatura.stripe_current_period_end
    ? new Date(assinatura.stripe_current_period_end)
    : null;

  if (stripeEnd && Number.isFinite(stripeEnd.getTime()) && stripeEnd.getTime() > now.getTime()) {
    return stripeEnd;
  }

  const fimEm = assinatura.fim_em ? new Date(assinatura.fim_em) : null;
  if (fimEm && Number.isFinite(fimEm.getTime()) && fimEm.getTime() > now.getTime()) {
    return fimEm;
  }

  return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
}

export async function GET(request: Request) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

  const authClient = createSupabaseServerClient(accessToken);
  const authResult = await authClient.auth.getUser();
  if (!authResult.data.user) return unauthorizedResponse();

  const userId = authResult.data.user.id;

  const { searchParams } = new URL(request.url);
  const acao = normalizeToken(
    searchParams.get("acao"),
    "CRIAR_DESCRICAO_EMPREENDIMENTO",
  );

  const admin = createSupabaseAdminClient();

  const aykaCostClient = admin as unknown as {
    from: (table: "ayka_custos_acoes") => {
      select: (columns: string) => {
        eq: (column: "acao_codigo", value: string) => {
          eq: (column: "ativo", value: boolean) => {
            order: (
              column: "updated_at",
              options: { ascending: boolean },
            ) => {
              limit: (value: number) => {
                maybeSingle: () => Promise<{
                  data: AykaCustoRow | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        };
      };
    };
  };

  const custoResult = await aykaCostClient
    .from("ayka_custos_acoes")
    .select("acao_codigo,modelo,modelo_api,custo_creditos,ativo")
    .eq("acao_codigo", acao)
    .eq("ativo", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (custoResult.error || !custoResult.data) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "ACTION_NOT_CONFIGURED",
          message: "Ação AYKA não configurada para este modelo.",
        },
      },
      { status: 404 },
    );
  }

  const custoCreditos = Number(custoResult.data.custo_creditos ?? 0);
  const modelo = custoResult.data.modelo;

  const assinaturaResult = await admin
    .from("assinaturas")
    .select("id,owner_id,plano_id,inicio_em,fim_em,stripe_current_period_end")
    .eq("owner_id", userId)
    .eq("status", "ATIVA")
    .maybeSingle<AssinaturaAtivaRow>();

  if (assinaturaResult.error) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "DATABASE_ERROR", message: assinaturaResult.error.message },
      },
      { status: 500 },
    );
  }

  if (!assinaturaResult.data) {
    return NextResponse.json(
      {
        ok: true,
        data: {
          acao,
          modelo,
          modelo_api: custoCreditos ? custoResult.data.modelo_api : null,
          assinatura_ativa: false,
          custo_creditos: custoCreditos,
          creditos_disponiveis: 0,
          pode_executar: false,
          detalhe: "Este recurso AYKA está disponível apenas para clientes com assinatura ativa.",
        },
      },
      { status: 200 },
    );
  }

  const assinatura = assinaturaResult.data;

  const planoResult = await admin
    .from("planos")
    .select("id,ayka_franquia_mensal")
    .eq("id", assinatura.plano_id)
    .maybeSingle<PlanoRow>();

  if (planoResult.error || !planoResult.data) {
    return NextResponse.json(
      {
        ok: true,
        data: {
          acao,
          modelo,
          modelo_api: custoResult.data.modelo_api,
          assinatura_ativa: true,
          custo_creditos: custoCreditos,
          creditos_disponiveis: 0,
          pode_executar: false,
          detalhe: "Plano da assinatura não encontrado para cálculo da franquia AYKA.",
        },
      },
      { status: 200 },
    );
  }

  const creditosFranquiaPlano = Math.max(0, Number(planoResult.data.ayka_franquia_mensal ?? 0));
  const now = new Date();

  if (creditosFranquiaPlano > 0) {
    const aykaCiclosClient = admin as unknown as {
      from: (table: "ayka_franquia_ciclos") => {
        select: (columns: string) => {
          eq: (column: "owner_id", value: string) => {
            eq: (column: "assinatura_id", value: string) => {
              order: (
                column: "ciclo_inicio",
                options: { ascending: boolean },
              ) => {
                limit: (value: number) => Promise<{
                  data: AykaFranquiaCicloRow[] | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        };
        upsert: (
          values: {
            owner_id: string;
            assinatura_id: string;
            plano_id: string;
            ciclo_inicio: string;
            ciclo_fim: string;
            creditos: number;
          },
          options: { onConflict: string },
        ) => {
          select: (columns: string) => {
            single: () => Promise<{
              data: AykaFranquiaCicloRow | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };

    const ciclosResult = await aykaCiclosClient
      .from("ayka_franquia_ciclos")
      .select("id,owner_id,assinatura_id,plano_id,ciclo_inicio,ciclo_fim,creditos")
      .eq("owner_id", userId)
      .eq("assinatura_id", assinatura.id)
      .order("ciclo_inicio", { ascending: false })
      .limit(20);

    if (ciclosResult.error) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "DATABASE_ERROR", message: ciclosResult.error.message },
        },
        { status: 500 },
      );
    }

    const ciclos = ciclosResult.data ?? [];
    const nowMs = now.getTime();

    let cicloAtual = ciclos.find((item) => {
      const inicioMs = new Date(item.ciclo_inicio).getTime();
      const fimMs = new Date(item.ciclo_fim).getTime();
      return Number.isFinite(inicioMs) && Number.isFinite(fimMs) && nowMs >= inicioMs && nowMs < fimMs;
    });

    if (!cicloAtual) {
      const cicloFim = resolveCicloFim(assinatura, now);
      const cicloFimMs = cicloFim.getTime();

      const ultimoCicloEncerrado = ciclos.find((item) => {
        const fimMs = new Date(item.ciclo_fim).getTime();
        return Number.isFinite(fimMs) && fimMs <= nowMs;
      });

      let cicloInicio = ultimoCicloEncerrado?.ciclo_fim ?? assinatura.inicio_em;
      const inicioMs = new Date(cicloInicio).getTime();

      if (!Number.isFinite(inicioMs) || inicioMs >= cicloFimMs) {
        cicloInicio = new Date(cicloFimMs - 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      const upsertCicloResult = await aykaCiclosClient
        .from("ayka_franquia_ciclos")
        .upsert(
          {
            owner_id: userId,
            assinatura_id: assinatura.id,
            plano_id: assinatura.plano_id,
            ciclo_inicio: cicloInicio,
            ciclo_fim: cicloFim.toISOString(),
            creditos: creditosFranquiaPlano,
          },
          { onConflict: "owner_id,assinatura_id,ciclo_inicio" },
        )
        .select("id,owner_id,assinatura_id,plano_id,ciclo_inicio,ciclo_fim,creditos")
        .single();

      if (upsertCicloResult.error || !upsertCicloResult.data) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: "DATABASE_ERROR",
              message: upsertCicloResult.error?.message ?? "Falha ao garantir ciclo de franquia AYKA.",
            },
          },
          { status: 500 },
        );
      }

      cicloAtual = upsertCicloResult.data;

      const aykaLotesUpsertClient = admin as unknown as {
        from: (table: "ayka_creditos_lotes") => {
          upsert: (
            values: {
              owner_id: string;
              origem: "FRANQUIA";
              creditos_total: number;
              creditos_disponiveis: number;
              expira_em: string;
              franquia_ciclo_id: string;
            },
            options: { onConflict: string },
          ) => {
            select: (columns: string) => {
              single: () => Promise<{
                data: { id: string } | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };

      const upsertLoteResult = await aykaLotesUpsertClient
        .from("ayka_creditos_lotes")
        .upsert(
          {
            owner_id: userId,
            origem: "FRANQUIA",
            creditos_total: creditosFranquiaPlano,
            creditos_disponiveis: creditosFranquiaPlano,
            expira_em: cicloAtual.ciclo_fim,
            franquia_ciclo_id: cicloAtual.id,
          },
          { onConflict: "franquia_ciclo_id" },
        )
        .select("id")
        .single();

      if (upsertLoteResult.error || !upsertLoteResult.data) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: "DATABASE_ERROR",
              message: upsertLoteResult.error?.message ?? "Falha ao garantir lote de franquia AYKA.",
            },
          },
          { status: 500 },
        );
      }
    }
  }

  const aykaLotesClient = admin as unknown as {
    from: (table: "ayka_creditos_lotes") => {
      select: (columns: string) => {
        eq: (column: "owner_id", value: string) => {
          gt: (column: "creditos_disponiveis", value: number) => Promise<{
            data: AykaLoteRow[] | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };

  const lotesResult = await aykaLotesClient
    .from("ayka_creditos_lotes")
    .select("id,owner_id,creditos_disponiveis,expira_em")
    .eq("owner_id", userId)
    .gt("creditos_disponiveis", 0);

  if (lotesResult.error) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "DATABASE_ERROR", message: lotesResult.error.message },
      },
      { status: 500 },
    );
  }

  const lotesValidos = (lotesResult.data ?? []).filter((item) => {
    if (!item.expira_em) return true;
    const expiraMs = new Date(item.expira_em).getTime();
    return Number.isFinite(expiraMs) && expiraMs > now.getTime();
  });

  const creditosDisponiveis = lotesValidos.reduce(
    (acc, item) => acc + Number(item.creditos_disponiveis ?? 0),
    0,
  );
  const podeExecutar = creditosDisponiveis >= custoCreditos;

  return NextResponse.json(
    {
      ok: true,
      data: {
        acao,
        modelo,
        modelo_api: custoResult.data.modelo_api,
        assinatura_ativa: true,
        custo_creditos: custoCreditos,
        creditos_disponiveis: creditosDisponiveis,
        pode_executar: podeExecutar,
        detalhe: podeExecutar
          ? "Créditos suficientes para executar a ação AYKA."
          : `Você precisa de ${custoCreditos} créditos para esta ação. Saldo atual: ${creditosDisponiveis}.`,
      },
    },
    { status: 200 },
  );
}
