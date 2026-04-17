import { fail, ok, type ApiResult } from "@/lib/api/result";
import { authenticateByAccessToken } from "@/lib/db/_auth";
import { mapDbError } from "@/lib/db/_errors";
import type { Atividade, Negocio, Proposta, TimelineEvento } from "@/lib/db/crm-types";
import { buildImovelHeaderTitle } from "@/lib/imoveis/display-title";
import type { Database } from "@/lib/supabase/database.types";

type NegocioInsert = Database["public"]["Tables"]["negocios"]["Insert"];
type NegocioUpdate = Database["public"]["Tables"]["negocios"]["Update"];
type NegocioParteRow = Database["public"]["Tables"]["negocio_partes"]["Row"];
type NegocioPartePessoaRow = Database["public"]["Tables"]["negocio_parte_pessoas"]["Row"];
type NegocioCorretorRow = Database["public"]["Tables"]["negocio_corretores"]["Row"];
type NegocioParteInsert = Database["public"]["Tables"]["negocio_partes"]["Insert"];
type NegocioParteUpdate = Database["public"]["Tables"]["negocio_partes"]["Update"];
type NegocioPartePessoaInsert = Database["public"]["Tables"]["negocio_parte_pessoas"]["Insert"];
type NegocioPartePessoaUpdate = Database["public"]["Tables"]["negocio_parte_pessoas"]["Update"];
type NegocioCorretorInsert = Database["public"]["Tables"]["negocio_corretores"]["Insert"];
type NegocioCorretorUpdate = Database["public"]["Tables"]["negocio_corretores"]["Update"];

export type NegocioWorkspaceLead = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: Database["public"]["Enums"]["uf"] | null;
  pais: string | null;
  status: Database["public"]["Enums"]["status_lead"];
  origem: Database["public"]["Enums"]["origem_lead"];
  mensagem: string | null;
};

export type NegocioWorkspaceImovel = {
  id: string;
  codigo: string | null;
  titulo: string;
  finalidade: Database["public"]["Enums"]["finalidade"];
  tipo: Database["public"]["Enums"]["tipo_imovel"];
  subtipo: string | null;
  tipo_negociacao: string | null;
  area_util: number | null;
  area_terreno: number | null;
  dormitorios: number | null;
  salas: number | null;
  suites: number | null;
  vagas: number | null;
  bairro_comercial: string | null;
  bairro: string | null;
  cidade: string;
  estado: string;
  logradouro: string | null;
  numero: string | null;
  preco_venda: number | null;
  preco_locacao: number | null;
  comissao_venda_percentual: number | null;
  veio_do_bolsao: boolean;
  captacao_corretor_parceiro: boolean;
  corretor_parceiro_nome: string | null;
  corretor_parceiro_email: string | null;
  corretor_parceiro_telefone: string | null;
  status: Database["public"]["Enums"]["status_imovel"];
  foto_url: string | null;
  headline: string;
};

export type NegocioWorkspacePartePessoa = NegocioPartePessoaRow;
export type NegocioWorkspaceCorretor = NegocioCorretorRow;

export type NegocioWorkspaceParte = NegocioParteRow & {
  pessoas: NegocioWorkspacePartePessoa[];
};

export type NegocioWorkspace = {
  negocio: Negocio;
  lead: NegocioWorkspaceLead;
  imovel: NegocioWorkspaceImovel | null;
  propostas: Proposta[];
  atividades: Atividade[];
  timeline: TimelineEvento[];
  partes: NegocioWorkspaceParte[];
  corretores: NegocioWorkspaceCorretor[];
};

export type CreateNegocioInput = {
  lead_id: string;
  titulo?: string | null;
  modalidade?: Negocio["modalidade"];
  fase?: Negocio["fase"];
  subfase_juridica?: Negocio["subfase_juridica"];
  valor?: number | null;
  comissaopercentual?: number | null;
  comissaovalor?: number | null;
  financiamentovalor?: number | null;
  recursopropriovalor?: number | null;
  fgtsvalor?: number | null;
  outrosrecursosvalor?: number | null;
  observacoes?: string | null;
  perdido_em?: string | null;
  ganho_em?: string | null;
  etapa?: Negocio["etapa"];
  valor_estimado?: number | null;
  finalidade?: Negocio["finalidade"];
  imovel_id?: string | null;
  empreendimento_id?: string | null;
  lista_id?: string | null;
  notas?: string | null;
  proxima_acao_em?: string | null;
  fechado_em?: string | null;
};

export type UpdateNegocioInput = Partial<
  Omit<CreateNegocioInput, "lead_id"> & {
    fechado_em: string | null;
  }
>;

export type CreateNegocioParteInput = Omit<NegocioParteInsert, "id" | "owner_id" | "negocio_id" | "created_at" | "updated_at">;
export type UpdateNegocioParteInput = Omit<NegocioParteUpdate, "id" | "owner_id" | "negocio_id" | "created_at" | "updated_at">;

export type CreateNegocioPartePessoaInput = Omit<
  NegocioPartePessoaInsert,
  "id" | "owner_id" | "negocio_parte_id" | "created_at" | "updated_at"
>;
export type UpdateNegocioPartePessoaInput = Omit<
  NegocioPartePessoaUpdate,
  "id" | "owner_id" | "negocio_parte_id" | "created_at" | "updated_at"
>;

export type CreateNegocioCorretorInput = Omit<
  NegocioCorretorInsert,
  "id" | "owner_id" | "negocio_id" | "created_at" | "updated_at"
>;
export type UpdateNegocioCorretorInput = Omit<
  NegocioCorretorUpdate,
  "id" | "owner_id" | "negocio_id" | "created_at" | "updated_at"
>;

export async function listNegocios(accessToken: string): Promise<ApiResult<Negocio[]>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const result = await client
    .from("negocios")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (result.error) return mapDbError(result.error);
  return ok((result.data ?? []) as Negocio[]);
}

export async function getNegocioWorkspace(
  accessToken: string,
  negocioId: string,
): Promise<ApiResult<NegocioWorkspace>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;

  const negocioResult = await client
    .from("negocios")
    .select("*")
    .eq("id", negocioId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (negocioResult.error) return mapDbError(negocioResult.error);
  if (!negocioResult.data) return fail("NOT_FOUND", "Negocio not found");

  const negocio = negocioResult.data as Negocio;

  const [leadResult, imovelResult, imovelMidiaResult, propostasResult, atividadesResult, timelineResult, partesResult, corretoresResult] =
    await Promise.all([
    client
      .from("leads")
      .select("id,nome,email,telefone,cep,endereco,numero,complemento,bairro,cidade,uf,pais,status,origem,mensagem")
      .eq("id", negocio.lead_id)
      .eq("owner_id", user.id)
      .maybeSingle(),
    negocio.imovel_id
      ? client
          .from("imoveis")
          .select(
            "id,codigo,titulo,finalidade,tipo,subtipo,tipo_negociacao,area_util,area_terreno,dormitorios,salas,suites,vagas,bairro_comercial,bairro,cidade,estado,logradouro,numero,preco_venda,preco_locacao,comissao_venda_percentual,veio_do_bolsao,captacao_corretor_parceiro,corretor_parceiro_nome,corretor_parceiro_email,corretor_parceiro_telefone,status",
          )
          .eq("id", negocio.imovel_id)
          .eq("owner_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    negocio.imovel_id
      ? client
          .from("imovel_midia_publica")
          .select("url")
          .eq("imovel_id", negocio.imovel_id)
          .order("ordem", { ascending: true })
          .limit(1)
      : Promise.resolve({ data: [], error: null }),
    client
      .from("propostas")
      .select("*")
      .eq("owner_id", user.id)
      .eq("negocio_id", negocio.id)
      .order("created_at", { ascending: false }),
    client
      .from("atividades")
      .select("*")
      .eq("owner_id", user.id)
      .eq("negocio_id", negocio.id)
      .order("created_at", { ascending: false }),
    client
      .from("timeline_eventos")
      .select("*")
      .eq("owner_id", user.id)
      .eq("negocio_id", negocio.id)
      .order("created_at", { ascending: false }),
    client
      .from("negocio_partes")
      .select("*")
      .eq("owner_id", user.id)
      .eq("negocio_id", negocio.id)
      .order("created_at", { ascending: true }),
    client
      .from("negocio_corretores")
      .select("*")
      .eq("owner_id", user.id)
      .eq("negocio_id", negocio.id)
      .order("created_at", { ascending: true }),
  ]);

  if (leadResult.error) return mapDbError(leadResult.error);
  if (!leadResult.data) return fail("NOT_FOUND", "Lead not found");
  if (imovelResult && "error" in imovelResult && imovelResult.error) return mapDbError(imovelResult.error);
  if (imovelMidiaResult.error) return mapDbError(imovelMidiaResult.error);
  if (propostasResult.error) return mapDbError(propostasResult.error);
  if (atividadesResult.error) return mapDbError(atividadesResult.error);
  if (timelineResult.error) return mapDbError(timelineResult.error);
  if (partesResult.error) return mapDbError(partesResult.error);
  if (corretoresResult.error) return mapDbError(corretoresResult.error);

  const partes = (partesResult.data ?? []) as NegocioParteRow[];
  const parteIds = partes.map((item) => item.id);

  const pessoasResult =
    parteIds.length > 0
      ? await client
          .from("negocio_parte_pessoas")
          .select("*")
          .eq("owner_id", user.id)
          .in("negocio_parte_id", parteIds)
          .order("created_at", { ascending: true })
      : { data: [], error: null };

  if (pessoasResult.error) return mapDbError(pessoasResult.error);

  const pessoasByParteId = new Map<string, NegocioWorkspacePartePessoa[]>();
  for (const pessoa of (pessoasResult.data ?? []) as NegocioWorkspacePartePessoa[]) {
    const current = pessoasByParteId.get(pessoa.negocio_parte_id) ?? [];
    current.push(pessoa);
    pessoasByParteId.set(pessoa.negocio_parte_id, current);
  }

  const imovelData = imovelResult && "data" in imovelResult ? imovelResult.data : null;
  const firstPhotoUrl =
    imovelMidiaResult.data && imovelMidiaResult.data.length > 0 ? (imovelMidiaResult.data[0]?.url as string | null) : null;

  return ok({
    negocio,
    lead: leadResult.data as NegocioWorkspaceLead,
    imovel: imovelData
      ? {
          ...(imovelData as Omit<NegocioWorkspaceImovel, "headline" | "foto_url">),
          foto_url: firstPhotoUrl,
          headline: buildImovelHeaderTitle({
            titulo: imovelData.titulo,
            codigo: imovelData.codigo,
            finalidade: imovelData.finalidade,
            tipo: imovelData.tipo,
            subtipo: imovelData.subtipo,
            tipo_negociacao: imovelData.tipo_negociacao,
            area_util: imovelData.area_util,
            area_terreno: imovelData.area_terreno,
            dormitorios: imovelData.dormitorios,
            suites: imovelData.suites,
            salas: imovelData.salas,
            vagas: imovelData.vagas,
            bairro_comercial: imovelData.bairro_comercial,
            bairro: imovelData.bairro,
            cidade: imovelData.cidade,
            estado: imovelData.estado,
          }),
        }
      : null,
    propostas: (propostasResult.data ?? []) as Proposta[],
    atividades: (atividadesResult.data ?? []) as Atividade[],
    timeline: (timelineResult.data ?? []) as TimelineEvento[],
    partes: partes.map((parte) => ({
      ...parte,
      pessoas: pessoasByParteId.get(parte.id) ?? [],
    })),
    corretores: (corretoresResult.data ?? []) as NegocioWorkspaceCorretor[],
  });
}

export async function createNegocio(
  accessToken: string,
  input: CreateNegocioInput,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  if (!input.lead_id) return fail("VALIDATION_ERROR", "lead_id is required");

  const { user, client } = auth.data;
  const payload: NegocioInsert = {
    owner_id: user.id,
    ...input,
  };

  const result = await client
    .from("negocios")
    .insert(payload)
    .select("id")
    .single();

  if (result.error) return mapDbError(result.error);
  return ok({ id: result.data.id as string });
}

export async function updateNegocio(
  accessToken: string,
  negocioId: string,
  patch: UpdateNegocioInput,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  if (Object.keys(patch).length === 0) {
    return fail("VALIDATION_ERROR", "No fields provided to update");
  }

  const { user, client } = auth.data;
  const payload: NegocioUpdate = patch;

  const result = await client
    .from("negocios")
    .update(payload)
    .eq("id", negocioId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Negocio not found");
  return ok({ id: result.data.id as string });
}

export async function deleteNegocio(
  accessToken: string,
  negocioId: string,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;

  const result = await client
    .from("negocios")
    .delete()
    .eq("id", negocioId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Negocio not found");
  return ok({ id: result.data.id as string });
}

async function ensureNegocioOwnership(params: {
  accessToken: string;
  negocioId: string;
}): Promise<ApiResult<{ ownerId: string }>> {
  const auth = await authenticateByAccessToken(params.accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const negocioResult = await client
    .from("negocios")
    .select("id")
    .eq("id", params.negocioId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (negocioResult.error) return mapDbError(negocioResult.error);
  if (!negocioResult.data) return fail("NOT_FOUND", "Negocio not found");

  return ok({ ownerId: user.id });
}

async function ensureParteBelongsToNegocio(params: {
  accessToken: string;
  negocioId: string;
  parteId: string;
}): Promise<ApiResult<{ ownerId: string }>> {
  const auth = await authenticateByAccessToken(params.accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const parteResult = await client
    .from("negocio_partes")
    .select("id")
    .eq("id", params.parteId)
    .eq("owner_id", user.id)
    .eq("negocio_id", params.negocioId)
    .maybeSingle();

  if (parteResult.error) return mapDbError(parteResult.error);
  if (!parteResult.data) return fail("NOT_FOUND", "Negocio parte not found");

  return ok({ ownerId: user.id });
}

export async function createNegocioParte(
  accessToken: string,
  negocioId: string,
  input: CreateNegocioParteInput,
): Promise<ApiResult<NegocioParteRow>> {
  const ownershipResult = await ensureNegocioOwnership({ accessToken, negocioId });
  if (!ownershipResult.ok) return ownershipResult;

  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { ownerId } = ownershipResult.data;
  const { client } = auth.data;
  const payload: NegocioParteInsert = {
    owner_id: ownerId,
    negocio_id: negocioId,
    ...input,
  };

  const result = await client
    .from("negocio_partes")
    .insert(payload)
    .select("*")
    .single();

  if (result.error) return mapDbError(result.error);
  return ok(result.data as NegocioParteRow);
}

export async function updateNegocioParte(
  accessToken: string,
  negocioId: string,
  parteId: string,
  patch: UpdateNegocioParteInput,
): Promise<ApiResult<NegocioParteRow>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  if (Object.keys(patch).length === 0) {
    return fail("VALIDATION_ERROR", "No fields provided to update");
  }

  const { user, client } = auth.data;
  const currentParteResult = await client
    .from("negocio_partes")
    .select("*")
    .eq("id", parteId)
    .eq("owner_id", user.id)
    .eq("negocio_id", negocioId)
    .maybeSingle();

  if (currentParteResult.error) return mapDbError(currentParteResult.error);
  if (!currentParteResult.data) return fail("NOT_FOUND", "Negocio parte not found");

  const currentParte = currentParteResult.data as NegocioParteRow;
  const nextTipoPessoa = patch.tipo_pessoa ?? currentParte.tipo_pessoa;
  const payload: NegocioParteUpdate = {
    ...patch,
    ...(nextTipoPessoa === "FISICA" ? { razao_social: null, cnpj: null } : {}),
  };

  const nextRazaoSocial = (payload.razao_social ?? currentParte.razao_social)?.trim() ?? null;
  const nextCnpj = (payload.cnpj ?? currentParte.cnpj)?.trim() ?? null;

  if (nextTipoPessoa === "JURIDICA" && (!nextRazaoSocial || !nextCnpj)) {
    return fail("VALIDATION_ERROR", "razao_social and cnpj are required for tipo_pessoa JURIDICA");
  }

  if (nextTipoPessoa === "FISICA") {
    const pessoasCountResult = await client
      .from("negocio_parte_pessoas")
      .select("id", { head: true, count: "exact" })
      .eq("owner_id", user.id)
      .eq("negocio_parte_id", parteId);

    if (pessoasCountResult.error) return mapDbError(pessoasCountResult.error);
    if ((pessoasCountResult.count ?? 0) <= 0) {
      return fail("VALIDATION_ERROR", "Partes de pessoa física precisam ter ao menos uma pessoa vinculada");
    }
  }

  const result = await client
    .from("negocio_partes")
    .update(payload)
    .eq("id", parteId)
    .eq("owner_id", user.id)
    .eq("negocio_id", negocioId)
    .select("*")
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Negocio parte not found");
  return ok(result.data as NegocioParteRow);
}

export async function deleteNegocioParte(
  accessToken: string,
  negocioId: string,
  parteId: string,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const result = await client
    .from("negocio_partes")
    .delete()
    .eq("id", parteId)
    .eq("owner_id", user.id)
    .eq("negocio_id", negocioId)
    .select("id")
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Negocio parte not found");
  return ok({ id: result.data.id as string });
}

export async function createNegocioPartePessoa(
  accessToken: string,
  negocioId: string,
  parteId: string,
  input: CreateNegocioPartePessoaInput,
): Promise<ApiResult<NegocioPartePessoaRow>> {
  const parteResult = await ensureParteBelongsToNegocio({
    accessToken,
    negocioId,
    parteId,
  });
  if (!parteResult.ok) return parteResult;

  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { ownerId } = parteResult.data;
  const { client } = auth.data;
  const payload: NegocioPartePessoaInsert = {
    owner_id: ownerId,
    negocio_parte_id: parteId,
    ...input,
  };

  const result = await client
    .from("negocio_parte_pessoas")
    .insert(payload)
    .select("*")
    .single();

  if (result.error) return mapDbError(result.error);
  return ok(result.data as NegocioPartePessoaRow);
}

export async function updateNegocioPartePessoa(
  accessToken: string,
  negocioId: string,
  parteId: string,
  pessoaId: string,
  patch: UpdateNegocioPartePessoaInput,
): Promise<ApiResult<NegocioPartePessoaRow>> {
  const parteResult = await ensureParteBelongsToNegocio({
    accessToken,
    negocioId,
    parteId,
  });
  if (!parteResult.ok) return parteResult;

  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;
  if (Object.keys(patch).length === 0) {
    return fail("VALIDATION_ERROR", "No fields provided to update");
  }

  const { ownerId } = parteResult.data;
  const { client } = auth.data;
  const payload: NegocioPartePessoaUpdate = patch;

  const result = await client
    .from("negocio_parte_pessoas")
    .update(payload)
    .eq("id", pessoaId)
    .eq("owner_id", ownerId)
    .eq("negocio_parte_id", parteId)
    .select("*")
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Negocio parte pessoa not found");
  return ok(result.data as NegocioPartePessoaRow);
}

export async function deleteNegocioPartePessoa(
  accessToken: string,
  negocioId: string,
  parteId: string,
  pessoaId: string,
): Promise<ApiResult<{ id: string }>> {
  const parteResult = await ensureParteBelongsToNegocio({
    accessToken,
    negocioId,
    parteId,
  });
  if (!parteResult.ok) return parteResult;

  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { ownerId } = parteResult.data;
  const { client } = auth.data;

  const parteTipoResult = await client
    .from("negocio_partes")
    .select("tipo_pessoa")
    .eq("id", parteId)
    .eq("owner_id", ownerId)
    .eq("negocio_id", negocioId)
    .maybeSingle();

  if (parteTipoResult.error) return mapDbError(parteTipoResult.error);
  if (!parteTipoResult.data) return fail("NOT_FOUND", "Negocio parte not found");

  if (parteTipoResult.data.tipo_pessoa === "FISICA") {
    const pessoasCountResult = await client
      .from("negocio_parte_pessoas")
      .select("id", { head: true, count: "exact" })
      .eq("owner_id", ownerId)
      .eq("negocio_parte_id", parteId);

    if (pessoasCountResult.error) return mapDbError(pessoasCountResult.error);
    if ((pessoasCountResult.count ?? 0) <= 1) {
      return fail("VALIDATION_ERROR", "Partes de pessoa física precisam manter ao menos uma pessoa vinculada");
    }
  }

  const result = await client
    .from("negocio_parte_pessoas")
    .delete()
    .eq("id", pessoaId)
    .eq("owner_id", ownerId)
    .eq("negocio_parte_id", parteId)
    .select("id")
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Negocio parte pessoa not found");
  return ok({ id: result.data.id as string });
}

export async function createNegocioCorretor(
  accessToken: string,
  negocioId: string,
  input: CreateNegocioCorretorInput,
): Promise<ApiResult<NegocioCorretorRow>> {
  const ownershipResult = await ensureNegocioOwnership({ accessToken, negocioId });
  if (!ownershipResult.ok) return ownershipResult;

  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { ownerId } = ownershipResult.data;
  const { client } = auth.data;
  const payload: NegocioCorretorInsert = {
    owner_id: ownerId,
    negocio_id: negocioId,
    ...input,
  };

  const result = await client
    .from("negocio_corretores")
    .insert(payload)
    .select("*")
    .single();

  if (result.error) return mapDbError(result.error);
  return ok(result.data as NegocioCorretorRow);
}

export async function updateNegocioCorretor(
  accessToken: string,
  negocioId: string,
  corretorId: string,
  patch: UpdateNegocioCorretorInput,
): Promise<ApiResult<NegocioCorretorRow>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  if (Object.keys(patch).length === 0) {
    return fail("VALIDATION_ERROR", "No fields provided to update");
  }

  const { user, client } = auth.data;
  const payload: NegocioCorretorUpdate = patch;

  const result = await client
    .from("negocio_corretores")
    .update(payload)
    .eq("id", corretorId)
    .eq("owner_id", user.id)
    .eq("negocio_id", negocioId)
    .select("*")
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Negocio corretor not found");
  return ok(result.data as NegocioCorretorRow);
}

export async function deleteNegocioCorretor(
  accessToken: string,
  negocioId: string,
  corretorId: string,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;

  const result = await client
    .from("negocio_corretores")
    .delete()
    .eq("id", corretorId)
    .eq("owner_id", user.id)
    .eq("negocio_id", negocioId)
    .select("id")
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Negocio corretor not found");
  return ok({ id: result.data.id as string });
}
