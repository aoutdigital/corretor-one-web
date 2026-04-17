import { NextResponse } from "next/server";

import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type GenerateBody = {
  prompt?: unknown;
  acao?: unknown;
};

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

type AykaDescricaoJson = {
  headline?: string;
  descricao_html?: string;
  resumo_curto?: string;
  seo_title?: string;
  seo_description?: string;
  keywords?: string[];
};

type ProfileRow = {
  nickname: string | null;
  primeiro_nome: string | null;
  sobrenome: string | null;
};

function unauthorizedResponse() {
  return NextResponse.json(
    { ok: false, error: { code: "UNAUTHORIZED", message: "Missing bearer token" } },
    { status: 401 },
  );
}

function cleanCodeFences(value: string) {
  const trimmed = value.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (!fenceMatch) return trimmed;
  return fenceMatch[1]?.trim() ?? trimmed;
}

function extractFirstJsonObject(value: string): string | null {
  const text = cleanCodeFences(value);
  const start = text.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

function normalizeKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0)
    .slice(0, 12);
}

function buildCorretorName(profile: ProfileRow | null, email: string) {
  const primeiroNome = profile?.primeiro_nome?.trim() ?? "";
  const sobrenome = profile?.sobrenome?.trim() ?? "";
  const nome = [primeiroNome, sobrenome].filter(Boolean).join(" ").trim();
  if (nome) return nome;
  const emailName = email.split("@")[0]?.trim() ?? "";
  return emailName || "Corretor";
}

function buildFinalKeywords(
  generated: string[],
  corretorNome: string,
  nickname: string,
) {
  const forced = [corretorNome, nickname].filter(Boolean);
  const fallback = [
    `${corretorNome} corretor`,
    `${nickname} corretor`,
    "Corretor.one",
    "empreendimento",
  ];
  const source = [...forced, ...generated, ...fallback];
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of source) {
    const value = item.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(value);
    if (normalized.length >= 6) break;
  }

  return normalized.slice(0, 6);
}

function parseAykaPayload(rawText: string): AykaDescricaoJson | null {
  const jsonSlice = extractFirstJsonObject(rawText);
  if (!jsonSlice) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonSlice);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;

  const data = parsed as Record<string, unknown>;
  return {
    headline: typeof data.headline === "string" ? data.headline : undefined,
    descricao_html: typeof data.descricao_html === "string" ? data.descricao_html : undefined,
    resumo_curto: typeof data.resumo_curto === "string" ? data.resumo_curto : undefined,
    seo_title: typeof data.seo_title === "string" ? data.seo_title : undefined,
    seo_description: typeof data.seo_description === "string" ? data.seo_description : undefined,
    keywords: normalizeKeywords(data.keywords),
  };
}

export async function POST(request: Request) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

  const authClient = createSupabaseServerClient(accessToken);
  const authResult = await authClient.auth.getUser();
  if (!authResult.data.user) return unauthorizedResponse();
  const user = authResult.data.user;

  let body: GenerateBody;
  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const acao = typeof body.acao === "string" && body.acao.trim().length > 0
    ? body.acao.trim().toUpperCase()
    : "CRIAR_DESCRICAO_EMPREENDIMENTO";
  if (prompt.length < 20) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Prompt inválido para geração AYKA." } },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "CONFIG_ERROR",
          message: "GEMINI_API_KEY não configurada no servidor.",
        },
      },
      { status: 500 },
    );
  }

  const authDb = createSupabaseServerClient(accessToken) as unknown as {
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
                  data: { acao_codigo: string; modelo_api: string; ativo: boolean } | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        };
      };
    };
  };

  const custoConfig = await authDb
    .from("ayka_custos_acoes")
    .select("acao_codigo,modelo_api,ativo")
    .eq("acao_codigo", acao)
    .eq("ativo", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (custoConfig.error || !custoConfig.data?.modelo_api) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "ACTION_NOT_CONFIGURED",
          message: "Ação AYKA sem modelo_api ativo configurado no banco.",
        },
      },
      { status: 404 },
    );
  }

  const model = custoConfig.data.modelo_api.trim();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const geminiResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    }),
  });

  if (!geminiResponse.ok) {
    const raw = await geminiResponse.text().catch(() => "");
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "GEMINI_ERROR",
          message: `Gemini retornou erro (${geminiResponse.status}). ${raw.slice(0, 240)}`,
        },
      },
      { status: 502 },
    );
  }

  let geminiPayload: GeminiGenerateResponse;
  try {
    geminiPayload = (await geminiResponse.json()) as GeminiGenerateResponse;
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "GEMINI_ERROR", message: "Resposta inválida do Gemini." } },
      { status: 502 },
    );
  }

  const rawText =
    geminiPayload.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text)
      .find((value): value is string => typeof value === "string" && value.trim().length > 0) ?? "";

  if (!rawText) {
    return NextResponse.json(
      { ok: false, error: { code: "GEMINI_EMPTY", message: "Gemini não retornou conteúdo textual." } },
      { status: 502 },
    );
  }

  const parsed = parseAykaPayload(rawText);
  if (!parsed || !parsed.descricao_html) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "GEMINI_PARSE_ERROR",
          message: "Não foi possível extrair JSON válido da resposta do Gemini.",
        },
      },
      { status: 502 },
    );
  }

  const profileResult = await authClient
    .from("profiles")
    .select("nickname,primeiro_nome,sobrenome")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  const nickname = profileResult.data?.nickname?.trim() || user.id.slice(0, 8);
  const corretorNome = buildCorretorName(profileResult.data ?? null, user.email ?? "");
  parsed.keywords = buildFinalKeywords(parsed.keywords ?? [], corretorNome, nickname);

  return NextResponse.json({
    ok: true,
    data: {
      model,
      raw_text: rawText,
      parsed,
    },
  });
}
