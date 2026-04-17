import { NextResponse } from "next/server";

import { buildSupabaseRenderImageUrl } from "@/lib/media/render-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PUBLIC_IMAGE_WEBP_OPTIONS = {
  width: 1920,
  quality: 82,
  format: "webp",
} as const;

const PUBLIC_IMAGE_THUMB_WEBP_OPTIONS = {
  width: 960,
  height: 640,
  quality: 76,
  resize: "cover",
  format: "webp",
} as const;

export async function GET() {
  const supabase = createSupabaseServerClient();

  const result = await supabase
    .from("empreendimentos")
    .select("id, slug_publico, nome, descricao, cidade, estado, status, owner_id, publicado_em")
    .eq("status", "PUBLICADO")
    .order("publicado_em", { ascending: false });

  if (result.error) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "DATABASE_ERROR", message: result.error.message },
      },
      { status: 500 },
    );
  }

  const empreendimentos = (result.data ?? []) as Array<{
    id: string;
    slug_publico: string | null;
    nome: string;
    descricao: string | null;
    cidade: string;
    estado: string;
    status: string;
    owner_id: string;
    publicado_em: string | null;
  }>;

  const empreendimentoIds = empreendimentos
    .map((item) => item.id)
    .filter((value) => typeof value === "string" && value.length > 0);

  const publicImagesByEmpreendimento = new Map<
    string,
    Array<{ midia_id: string; indice_publico: number; ordem: number; url: string }>
  >();

  if (empreendimentoIds.length > 0) {
    const midiasPublicasResult = await (supabase as unknown as {
      from: (table: "empreendimento_midia_publica") => {
        select: (columns: "empreendimento_id,midia_id,indice_publico,ordem,url") => {
          in: (
            column: "empreendimento_id",
            values: string[],
          ) => Promise<{
            data: Array<{
              empreendimento_id: string;
              midia_id: string;
              indice_publico: number;
              ordem: number;
              url: string;
            }> | null;
            error: { message: string } | null;
          }>;
        };
      };
    })
      .from("empreendimento_midia_publica")
      .select("empreendimento_id,midia_id,indice_publico,ordem,url")
      .in("empreendimento_id", empreendimentoIds);

    if (midiasPublicasResult.error) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "DATABASE_ERROR", message: midiasPublicasResult.error.message },
        },
        { status: 500 },
      );
    }

    const rows = (midiasPublicasResult.data ?? []).sort((a, b) => {
      if (a.empreendimento_id !== b.empreendimento_id) {
        return a.empreendimento_id.localeCompare(b.empreendimento_id);
      }
      if (a.indice_publico !== b.indice_publico) return a.indice_publico - b.indice_publico;
      return a.ordem - b.ordem;
    });

    for (const row of rows) {
      const current = publicImagesByEmpreendimento.get(row.empreendimento_id) ?? [];
      current.push({
        midia_id: row.midia_id,
        indice_publico: row.indice_publico,
        ordem: row.ordem,
        url: row.url,
      });
      publicImagesByEmpreendimento.set(row.empreendimento_id, current);
    }
  }

  return NextResponse.json({
    ok: true,
    data: empreendimentos.map((item) => {
      const imagens_publicas = publicImagesByEmpreendimento.get(item.id) ?? [];
      const imagens_publicas_transformadas = imagens_publicas.map((imageItem) => ({
        ...imageItem,
        url_webp: buildSupabaseRenderImageUrl(imageItem.url, PUBLIC_IMAGE_WEBP_OPTIONS) ?? imageItem.url,
        url_thumb_webp:
          buildSupabaseRenderImageUrl(imageItem.url, PUBLIC_IMAGE_THUMB_WEBP_OPTIONS) ?? imageItem.url,
      }));

      const capaOriginal = imagens_publicas[0]?.url ?? null;
      const capaWebp = capaOriginal
        ? buildSupabaseRenderImageUrl(capaOriginal, PUBLIC_IMAGE_WEBP_OPTIONS) ?? capaOriginal
        : null;
      const capaThumbWebp = capaOriginal
        ? buildSupabaseRenderImageUrl(capaOriginal, PUBLIC_IMAGE_THUMB_WEBP_OPTIONS) ?? capaOriginal
        : null;

      return {
        ...item,
        capa_url_publica: capaOriginal,
        capa_url_publica_webp: capaWebp,
        capa_url_publica_thumb_webp: capaThumbWebp,
        imagens_publicas: imagens_publicas_transformadas,
      };
    }),
  });
}
