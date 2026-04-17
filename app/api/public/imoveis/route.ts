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
    .from("imoveis")
    .select("id, slug_publico, titulo, finalidade, tipo, status, cidade, bairro, estado, preco_venda, preco_locacao, owner_id")
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

  const imoveis = (result.data ?? []) as Array<{
    id: string;
    slug_publico: string | null;
    titulo: string;
    finalidade: string;
    tipo: string;
    status: string;
    cidade: string;
    bairro: string;
    estado: string;
    preco_venda: number | null;
    preco_locacao: number | null;
    owner_id: string;
  }>;

  const imovelIds = imoveis.map((item) => item.id).filter((value) => typeof value === "string" && value.length > 0);
  const publicImagesByImovel = new Map<
    string,
    Array<{ midia_id: string; indice_publico: number; ordem: number; url: string }>
  >();

  if (imovelIds.length > 0) {
    const midiasPublicasResult = await (supabase as unknown as {
      from: (table: "imovel_midia_publica") => {
        select: (columns: "imovel_id,midia_id,indice_publico,ordem,url") => {
          in: (
            column: "imovel_id",
            values: string[],
          ) => Promise<{
            data: Array<{
              imovel_id: string;
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
      .from("imovel_midia_publica")
      .select("imovel_id,midia_id,indice_publico,ordem,url")
      .in("imovel_id", imovelIds);

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
      if (a.imovel_id !== b.imovel_id) return a.imovel_id.localeCompare(b.imovel_id);
      if (a.indice_publico !== b.indice_publico) return a.indice_publico - b.indice_publico;
      return a.ordem - b.ordem;
    });

    for (const row of rows) {
      const current = publicImagesByImovel.get(row.imovel_id) ?? [];
      current.push({
        midia_id: row.midia_id,
        indice_publico: row.indice_publico,
        ordem: row.ordem,
        url: row.url,
      });
      publicImagesByImovel.set(row.imovel_id, current);
    }
  }

  return NextResponse.json({
    ok: true,
    data: imoveis.map((item) => {
      const imagens_publicas = publicImagesByImovel.get(item.id) ?? [];
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
