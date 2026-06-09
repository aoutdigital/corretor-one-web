import { NextResponse } from "next/server";

import { statusFromErrorCode, fail, ok, type ApiResult } from "@/lib/api/result";
import { authenticateByAccessToken } from "@/lib/db/_auth";
import type { Proposta } from "@/lib/db/crm-types";
import { uploadMidia } from "@/lib/db/midia";
import { getNegocioWorkspace, type NegocioWorkspace } from "@/lib/db/negocios";
import { getPropostaById, updateProposta } from "@/lib/db/propostas";
import { getBearerTokenFromRequest } from "@/lib/http/auth";
import type { Json } from "@/lib/supabase/database.types";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

type PropostaDocumentoSnapshot = {
  generated_at: string;
  proposta: {
    id: string;
    titulo: string;
    tipo: string;
    status: string;
    valor: number | null;
    vencimento_em: string | null;
    created_at: string;
  };
  oportunidade: {
    id: string;
    titulo: string | null;
    fase: string;
    subfase_juridica: string | null;
    valor: number | null;
    comissaopercentual: number | null;
    comissaovalor: number | null;
    observacoes: string | null;
  };
  lead: {
    nome: string;
    email: string | null;
    telefone: string | null;
    endereco: {
      cep: string | null;
      endereco: string | null;
      numero: string | null;
      complemento: string | null;
      bairro: string | null;
      cidade: string | null;
      uf: string | null;
      pais: string | null;
    };
  };
  imovel: {
    headline: string;
    codigo: string | null;
    finalidade: string | null;
    tipo: string | null;
    subtipo: string | null;
    valor_referencia: number | null;
    localizacao: {
      logradouro: string | null;
      numero: string | null;
      bairro: string | null;
      cidade: string | null;
      uf: string | null;
    };
  } | null;
  condicoes_pagamento: {
    recursopropriovalor: number | null;
    financiamentovalor: number | null;
    fgtsvalor: number | null;
    outrosrecursosvalor: number | null;
  };
  partes: Array<{
    papel: string;
    tipo_pessoa: string;
    razao_social: string | null;
    cnpj: string | null;
    pessoas: Array<{
      nome_completo: string;
      email: string;
      telefone: string | null;
      cpf: string;
      endereco: {
        cep: string;
        endereco: string;
        numero: string;
        complemento: string | null;
        bairro: string;
        cidade: string;
        uf: string;
        pais: string;
      };
    }>;
  }>;
  corretores: Array<{
    nome: string;
    email: string | null;
    telefone: string | null;
    percentual_comissao: number | null;
    valor_comissao: number | null;
    vinculado_corretor_parceiro: boolean;
  }>;
};

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

export async function GET(request: Request, { params }: Params) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

  const { id } = await params;
  const propostaResult = await getPropostaById(accessToken, id);
  if (!propostaResult.ok) {
    return NextResponse.json(propostaResult, {
      status: statusFromErrorCode(propostaResult.error.code),
    });
  }

  const proposta = propostaResult.data;
  if (!proposta.arquivo_midia_id) {
    return NextResponse.json(
      ok({
        proposta_id: proposta.id,
        arquivo_midia_id: null,
        arquivo_url: null as string | null,
      }),
    );
  }

  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) {
    return NextResponse.json(auth, {
      status: statusFromErrorCode(auth.error.code),
    });
  }

  const { user, client } = auth.data;
  const midiaResult = await client
    .from("midia")
    .select("id,url")
    .eq("id", proposta.arquivo_midia_id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (midiaResult.error) {
    return NextResponse.json(
      fail("DATABASE_ERROR", midiaResult.error.message),
      {
        status: 500,
      },
    );
  }

  return NextResponse.json(
    ok({
      proposta_id: proposta.id,
      arquivo_midia_id: proposta.arquivo_midia_id,
      arquivo_url: (midiaResult.data?.url as string | null) ?? null,
    }),
  );
}

function normalizeText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Não informado";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Não informado";
  const rounded = Math.round(value * 100) / 100;
  return `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(rounded)}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Não informado";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(parsed);
}

function normalizeDigits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function formatCpf(value: string | null | undefined) {
  const digits = normalizeDigits(value);
  if (digits.length !== 11) return value?.trim() || "Não informado";
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

function formatPhone(value: string | null | undefined) {
  const digits = normalizeDigits(value);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }
  return normalizeText(value) ?? "Não informado";
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildAddressLine(parts: Array<string | null | undefined>, fallback = "Não informado") {
  const merged = parts
    .map((value) => normalizeText(value))
    .filter((value): value is string => Boolean(value))
    .join(" • ");
  return merged.length > 0 ? merged : fallback;
}

function buildSnapshot(accessedAtIso: string, data: NegocioWorkspace, proposta: Proposta): PropostaDocumentoSnapshot {
  return {
    generated_at: accessedAtIso,
    proposta: {
      id: proposta.id,
      titulo: proposta.titulo,
      tipo: proposta.tipo,
      status: proposta.status,
      valor: proposta.valor,
      vencimento_em: proposta.vencimento_em,
      created_at: proposta.created_at,
    },
    oportunidade: {
      id: data.negocio.id,
      titulo: data.negocio.titulo,
      fase: data.negocio.fase,
      subfase_juridica: data.negocio.subfase_juridica,
      valor: data.negocio.valor,
      comissaopercentual: data.negocio.comissaopercentual,
      comissaovalor: data.negocio.comissaovalor,
      observacoes: data.negocio.observacoes,
    },
    lead: {
      nome: data.lead.nome || "Lead sem nome",
      email: data.lead.email,
      telefone: data.lead.telefone,
      endereco: {
        cep: data.lead.cep,
        endereco: data.lead.endereco,
        numero: data.lead.numero,
        complemento: data.lead.complemento,
        bairro: data.lead.bairro,
        cidade: data.lead.cidade,
        uf: data.lead.uf,
        pais: data.lead.pais,
      },
    },
    imovel: data.imovel
      ? {
          headline: data.imovel.headline,
          codigo: data.imovel.codigo,
          finalidade: data.imovel.finalidade,
          tipo: data.imovel.tipo,
          subtipo: data.imovel.subtipo,
          valor_referencia: data.imovel.preco_venda ?? data.imovel.preco_locacao,
          localizacao: {
            logradouro: data.imovel.logradouro,
            numero: data.imovel.numero,
            bairro: data.imovel.bairro,
            cidade: data.imovel.cidade,
            uf: data.imovel.estado,
          },
        }
      : null,
    condicoes_pagamento: {
      recursopropriovalor: data.negocio.recursopropriovalor,
      financiamentovalor: data.negocio.financiamentovalor,
      fgtsvalor: data.negocio.fgtsvalor,
      outrosrecursosvalor: data.negocio.outrosrecursosvalor,
    },
    partes: data.partes.map((parte) => ({
      papel: parte.papel,
      tipo_pessoa: parte.tipo_pessoa,
      razao_social: parte.razao_social,
      cnpj: parte.cnpj,
      pessoas: parte.pessoas.map((pessoa) => ({
        nome_completo: pessoa.nome_completo,
        email: pessoa.email,
        telefone: pessoa.telefone,
        cpf: pessoa.cpf,
        endereco: {
          cep: pessoa.cep,
          endereco: pessoa.endereco,
          numero: pessoa.numero,
          complemento: pessoa.complemento,
          bairro: pessoa.bairro,
          cidade: pessoa.cidade,
          uf: pessoa.uf,
          pais: pessoa.pais,
        },
      })),
    })),
    corretores: data.corretores.map((corretor) => ({
      nome: corretor.nome,
      email: corretor.email,
      telefone: corretor.telefone,
      percentual_comissao: corretor.percentual_comissao,
      valor_comissao: corretor.valor_comissao,
      vinculado_corretor_parceiro: corretor.vinculado_corretor_parceiro,
    })),
  };
}

function renderPropostaHtml(snapshot: PropostaDocumentoSnapshot) {
  const partesHtml = snapshot.partes
    .map((parte) => {
      const pessoas = parte.pessoas
        .map(
          (pessoa) => `
            <tr>
              <td>${escapeHtml(pessoa.nome_completo)}</td>
              <td>${escapeHtml(formatCpf(pessoa.cpf))}</td>
              <td>${escapeHtml(normalizeText(pessoa.email) ?? "Não informado")}</td>
              <td>${escapeHtml(formatPhone(pessoa.telefone))}</td>
              <td>${escapeHtml(
                buildAddressLine(
                  [
                    pessoa.endereco.cep,
                    pessoa.endereco.endereco,
                    pessoa.endereco.numero,
                    pessoa.endereco.complemento,
                    pessoa.endereco.bairro,
                    pessoa.endereco.cidade,
                    pessoa.endereco.uf,
                    pessoa.endereco.pais,
                  ],
                  "Não informado",
                ),
              )}</td>
            </tr>
          `,
        )
        .join("");

      return `
        <section class="box">
          <h3>${escapeHtml(parte.papel === "COMPRADOR" ? "Compradores" : "Vendedores")} • ${escapeHtml(
            parte.tipo_pessoa === "JURIDICA" ? "Pessoa jurídica" : "Pessoa física",
          )}</h3>
          <p class="muted">Identificação: ${escapeHtml(
            normalizeText(parte.razao_social) ?? normalizeText(parte.cnpj) ?? normalizeText(parte.pessoas[0]?.nome_completo) ?? "Não informado",
          )}</p>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th>Endereço</th>
              </tr>
            </thead>
            <tbody>
              ${pessoas || `<tr><td colspan="5">Sem pessoas vinculadas.</td></tr>`}
            </tbody>
          </table>
        </section>
      `;
    })
    .join("");

  const corretoresHtml =
    snapshot.corretores.length > 0
      ? snapshot.corretores
          .map(
            (corretor) => `
            <tr>
              <td>${escapeHtml(corretor.nome)}</td>
              <td>${escapeHtml(normalizeText(corretor.email) ?? "Não informado")}</td>
              <td>${escapeHtml(formatPhone(corretor.telefone))}</td>
              <td>${escapeHtml(formatPercent(corretor.percentual_comissao))}</td>
              <td>${escapeHtml(formatCurrency(corretor.valor_comissao))}</td>
              <td>${escapeHtml(corretor.vinculado_corretor_parceiro ? "Parceiro" : "Divisão de comissão")}</td>
            </tr>
          `,
          )
          .join("")
      : `<tr><td colspan="6">Nenhum corretor cadastrado para divisão de comissão.</td></tr>`;

  return `
  <!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(snapshot.proposta.titulo)}</title>
      <style>
        @page { size: A4; margin: 14mm 12mm; }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          color: #0f172a;
          font-family: "Helvetica Neue", Arial, sans-serif;
          font-size: 11px;
          line-height: 1.45;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .header {
          border: 1px solid #dbe3ef;
          border-radius: 12px;
          padding: 14px;
          background: #f8fafc;
        }
        .title {
          margin: 0;
          font-size: 19px;
          line-height: 1.15;
        }
        .subtitle {
          margin-top: 6px;
          color: #475569;
          font-size: 12px;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 10px;
        }
        .box {
          border: 1px solid #dbe3ef;
          border-radius: 10px;
          padding: 10px;
          background: #ffffff;
          margin-top: 10px;
        }
        .box h2,
        .box h3 {
          margin: 0;
          font-size: 12px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #334155;
        }
        .box p {
          margin: 5px 0 0;
        }
        .muted {
          color: #64748b;
        }
        .tokens {
          margin-top: 8px;
          display: grid;
          gap: 6px;
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
        .token {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 8px;
          padding: 8px;
        }
        .token .k {
          font-size: 9px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .token .v {
          margin-top: 3px;
          font-size: 12px;
          font-weight: 600;
          color: #0f172a;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }
        th, td {
          border: 1px solid #e2e8f0;
          padding: 6px;
          text-align: left;
          vertical-align: top;
        }
        th {
          font-size: 9px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #475569;
          background: #f8fafc;
        }
        .sign-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px 14px;
          margin-top: 16px;
          page-break-inside: avoid;
        }
        .sign {
          border-top: 1px solid #0f172a;
          padding-top: 6px;
          min-height: 42px;
        }
        .footer {
          margin-top: 12px;
          color: #64748b;
          font-size: 10px;
          text-align: right;
        }
      </style>
    </head>
    <body>
      <header class="header">
        <h1 class="title">${escapeHtml(snapshot.proposta.titulo)}</h1>
        <p class="subtitle">Documento comercial da oportunidade • Gerado em ${escapeHtml(formatDate(snapshot.generated_at))}</p>
        <div class="grid-2">
          <div>
            <p><strong>Status:</strong> ${escapeHtml(snapshot.proposta.status)}</p>
            <p><strong>Tipo:</strong> ${escapeHtml(snapshot.proposta.tipo)}</p>
            <p><strong>Vencimento:</strong> ${escapeHtml(formatDate(snapshot.proposta.vencimento_em))}</p>
          </div>
          <div>
            <p><strong>Valor da proposta:</strong> ${escapeHtml(formatCurrency(snapshot.proposta.valor ?? snapshot.oportunidade.valor))}</p>
            <p><strong>Comissão:</strong> ${escapeHtml(formatCurrency(snapshot.oportunidade.comissaovalor))} (${escapeHtml(
    formatPercent(snapshot.oportunidade.comissaopercentual),
  )})</p>
            <p><strong>Fase:</strong> ${escapeHtml(snapshot.oportunidade.fase)}</p>
          </div>
        </div>
      </header>

      <section class="grid-2">
        <article class="box">
          <h2>Lead associado</h2>
          <p><strong>Nome:</strong> ${escapeHtml(snapshot.lead.nome)}</p>
          <p><strong>Contato:</strong> ${escapeHtml(
            [normalizeText(snapshot.lead.email), formatPhone(snapshot.lead.telefone)]
              .filter(Boolean)
              .join(" • ") || "Não informado",
          )}</p>
          <p><strong>Endereço:</strong> ${escapeHtml(
            buildAddressLine(
              [
                snapshot.lead.endereco.cep,
                snapshot.lead.endereco.endereco,
                snapshot.lead.endereco.numero,
                snapshot.lead.endereco.complemento,
                snapshot.lead.endereco.bairro,
                snapshot.lead.endereco.cidade,
                snapshot.lead.endereco.uf,
                snapshot.lead.endereco.pais,
              ],
              "Não informado",
            ),
          )}</p>
        </article>
        <article class="box">
          <h2>Imóvel associado</h2>
          ${
            snapshot.imovel
              ? `
                <p><strong>Título:</strong> ${escapeHtml(snapshot.imovel.headline)}</p>
                <p><strong>Código:</strong> ${escapeHtml(normalizeText(snapshot.imovel.codigo) ?? "Não informado")}</p>
                <p><strong>Tipo:</strong> ${escapeHtml(
                  [normalizeText(snapshot.imovel.finalidade), normalizeText(snapshot.imovel.tipo), normalizeText(snapshot.imovel.subtipo)]
                    .filter(Boolean)
                    .join(" • ") || "Não informado",
                )}</p>
                <p><strong>Valor de referência:</strong> ${escapeHtml(formatCurrency(snapshot.imovel.valor_referencia))}</p>
                <p><strong>Localização:</strong> ${escapeHtml(
                  buildAddressLine(
                    [
                      snapshot.imovel.localizacao.logradouro,
                      snapshot.imovel.localizacao.numero,
                      snapshot.imovel.localizacao.bairro,
                      snapshot.imovel.localizacao.cidade,
                      snapshot.imovel.localizacao.uf,
                    ],
                    "Não informado",
                  ),
                )}</p>
              `
              : `<p>Sem imóvel associado.</p>`
          }
        </article>
      </section>

      <section class="box">
        <h2>Condições de pagamento</h2>
        <div class="tokens">
          <div class="token"><div class="k">Recursos próprios</div><div class="v">${escapeHtml(
            formatCurrency(snapshot.condicoes_pagamento.recursopropriovalor),
          )}</div></div>
          <div class="token"><div class="k">Financiamento</div><div class="v">${escapeHtml(
            formatCurrency(snapshot.condicoes_pagamento.financiamentovalor),
          )}</div></div>
          <div class="token"><div class="k">FGTS</div><div class="v">${escapeHtml(
            formatCurrency(snapshot.condicoes_pagamento.fgtsvalor),
          )}</div></div>
          <div class="token"><div class="k">Outros recursos</div><div class="v">${escapeHtml(
            formatCurrency(snapshot.condicoes_pagamento.outrosrecursosvalor),
          )}</div></div>
        </div>
      </section>

      ${partesHtml}

      <section class="box">
        <h2>Corretores e comissão</h2>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Telefone</th>
              <th>% comissão</th>
              <th>Valor comissão</th>
              <th>Origem</th>
            </tr>
          </thead>
          <tbody>
            ${corretoresHtml}
          </tbody>
        </table>
      </section>

      <section class="box">
        <h2>Observações</h2>
        <p>${escapeHtml(normalizeText(snapshot.oportunidade.observacoes) ?? "Sem observações registradas.")}</p>
      </section>

      <section class="sign-grid">
        <div class="sign">Comprador(a)</div>
        <div class="sign">Vendedor(a)</div>
        <div class="sign">Corretor(a) responsável</div>
        <div class="sign">Corretor(a) parceiro(a) / Testemunha</div>
      </section>

      <p class="footer">Proposta ${escapeHtml(snapshot.proposta.id)} • Documento gerado automaticamente pelo Corretor.one</p>
    </body>
  </html>
  `;
}

async function renderPdfFromHtml(html: string): Promise<ApiResult<Buffer>> {
  try {
    const puppeteer = await import("puppeteer");
    const defaultArgs = ["--no-sandbox", "--disable-setuid-sandbox"];
    const attempts: Array<{
      headless: boolean;
      args: string[];
      channel?: "chrome";
      executablePath?: string;
    }> = [];

    const explicitExecutablePath = normalizeText(process.env.PUPPETEER_EXECUTABLE_PATH);
    if (explicitExecutablePath) {
      attempts.push({
        headless: true,
        args: defaultArgs,
        executablePath: explicitExecutablePath,
      });
    }

    attempts.push(
      { headless: true, args: defaultArgs, channel: "chrome" },
      { headless: true, args: defaultArgs },
    );

    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
    for (const options of attempts) {
      try {
        browser = await puppeteer.launch(options);
        break;
      } catch {
        // tenta próximo launcher
      }
    }

    if (!browser) {
      return fail("INTERNAL_ERROR", "Não foi possível inicializar o gerador de PDF.");
    }

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "14mm",
          right: "12mm",
          bottom: "14mm",
          left: "12mm",
        },
      });
      await page.close();
      return ok(Buffer.from(pdf));
    } finally {
      await browser.close();
    }
  } catch (error) {
    return fail("INTERNAL_ERROR", "Falha ao renderizar PDF", {
      message: (error as Error).message,
    });
  }
}

export async function POST(request: Request, { params }: Params) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

  const { id } = await params;

  const propostaResult = await getPropostaById(accessToken, id);
  if (!propostaResult.ok) {
    return NextResponse.json(propostaResult, {
      status: statusFromErrorCode(propostaResult.error.code),
    });
  }

  const proposta = propostaResult.data;
  if (!proposta.negocio_id) {
    return NextResponse.json(
      fail("VALIDATION_ERROR", "A proposta precisa estar vinculada a uma oportunidade para gerar PDF."),
      { status: 400 },
    );
  }

  const workspaceResult = await getNegocioWorkspace(accessToken, proposta.negocio_id);
  if (!workspaceResult.ok) {
    return NextResponse.json(workspaceResult, {
      status: statusFromErrorCode(workspaceResult.error.code),
    });
  }

  const workspace = workspaceResult.data;
  const nowIso = new Date().toISOString();
  const snapshot = buildSnapshot(nowIso, workspace, proposta);
  const html = renderPropostaHtml(snapshot);
  const pdfResult = await renderPdfFromHtml(html);
  if (!pdfResult.ok) {
    return NextResponse.json(pdfResult, {
      status: statusFromErrorCode(pdfResult.error.code),
    });
  }

  const slug = slugify(proposta.titulo) || proposta.id.slice(0, 8);
  const fileName = `${slug}-${nowIso.slice(0, 10)}.pdf`;
  const pdfArrayBuffer = new ArrayBuffer(pdfResult.data.byteLength);
  new Uint8Array(pdfArrayBuffer).set(pdfResult.data);
  const uploadResult = await uploadMidia(accessToken, {
    file: new File([pdfArrayBuffer], fileName, { type: "application/pdf" }),
    ref_tipo: "OUTRO",
    ref_id: proposta.id,
    grupo: "PROPOSTA_NEGOCIO",
    titulo: `Proposta - ${proposta.titulo}`,
    legenda: `Gerado em ${formatDate(nowIso)}`,
  });
  if (!uploadResult.ok) {
    return NextResponse.json(uploadResult, {
      status: statusFromErrorCode(uploadResult.error.code),
    });
  }

  const updateResult = await updateProposta(accessToken, proposta.id, {
    arquivo_midia_id: uploadResult.data.id,
    conteudo: snapshot as Json,
  });
  if (!updateResult.ok) {
    return NextResponse.json(updateResult, {
      status: statusFromErrorCode(updateResult.error.code),
    });
  }

  return NextResponse.json(
    ok({
      proposta_id: proposta.id,
      arquivo_midia_id: uploadResult.data.id,
      arquivo_url: uploadResult.data.url,
      conteudo: snapshot,
      generated_at: nowIso,
    }),
  );
}
