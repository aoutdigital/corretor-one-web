import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { listCaracteristicasCatalogo } from "@/lib/db/caracteristicas";
import { getBearerTokenFromRequest } from "@/lib/http/auth";

function unauthorizedResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Missing bearer token",
      },
    },
    { status: 401 },
  );
}

export async function GET(request: Request) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

  const url = new URL(request.url);
  const escopo = (url.searchParams.get("escopo") ?? "EMPREENDIMENTO").toUpperCase();
  const tipoUso = (url.searchParams.get("tipo_uso") ?? "").toUpperCase();
  const tipoImovel = (url.searchParams.get("tipo_imovel") ?? "").toUpperCase();
  const subtipoImovel = (url.searchParams.get("subtipo_imovel") ?? "").toUpperCase();

  const result = await listCaracteristicasCatalogo(accessToken);
  if (!result.ok) {
    return NextResponse.json(result, {
      status: statusFromErrorCode(result.error.code),
    });
  }

  const filtered = result.data.filter((item) => {
    const byEscopo = item.escopos.includes(escopo);
    const byTipoUso = !tipoUso || item.tipos_uso.includes(tipoUso);
    const byTipoImovel =
      !tipoImovel || (item.tipos_imovel?.length ?? 0) === 0 || item.tipos_imovel.includes(tipoImovel);
    const bySubtipoImovel =
      !subtipoImovel ||
      (item.subtipos_imovel?.length ?? 0) === 0 ||
      item.subtipos_imovel.includes(subtipoImovel);
    return byEscopo && byTipoUso && byTipoImovel && bySubtipoImovel;
  });

  filtered.sort((a, b) => {
    const catA = (a.categoria_empreendimento ?? "").toLocaleLowerCase("pt-BR");
    const catB = (b.categoria_empreendimento ?? "").toLocaleLowerCase("pt-BR");
    if (catA !== catB) return catA.localeCompare(catB, "pt-BR");
    return a.label_pt.localeCompare(b.label_pt, "pt-BR");
  });

  return NextResponse.json(
    {
      ok: true,
      data: filtered,
    },
    { status: 200 },
  );
}
