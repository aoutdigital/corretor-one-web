import type { User } from "@supabase/supabase-js";

import { fail, ok, type ApiResult } from "@/lib/api/result";
import { ensureProfileNicknameLogos } from "@/lib/branding/profile-logo";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UpdateProfileInput } from "@/lib/validation/profile";

type DbErrorLike = {
  code?: string;
  message: string;
  details?: string | null;
  hint?: string | null;
};

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
type UfEnum = Database["public"]["Enums"]["uf"];

const UF_LIST = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

const UF_VALUES = new Set<UfEnum>(UF_LIST);

type OwnProfile = Pick<
  ProfileRow,
  | "id"
  | "email"
  | "primeiro_nome"
  | "sobrenome"
  | "nickname"
  | "genero"
  | "telefone"
  | "whatsapp_verificado_em"
  | "whatsapp"
  | "bio"
  | "uf"
  | "cidades_foco"
  | "cidades_foco_json"
  | "imoveis_residenciais"
  | "imoveis_comerciais"
  | "imoveis_industriais"
  | "imoveis_alto_padrao"
  | "imoveis_luxo"
  | "imoveis_medio_padrao"
  | "imoveis_baixa_renda"
  | "creci_uf"
  | "creci_numero"
  | "creci_sufixo"
  | "creci_documento_midia_id"
  | "creci_aprovacao"
  | "plano_id"
  | "avatar_url"
  | "imagem_capa_url"
  | "frase_impacto"
  | "logo_nickname_url"
  | "logo_nickname_white_url"
  | "instagram"
  | "linkedin"
  | "pinterest"
  | "tiktok"
  | "twitter"
  | "youtube"
  | "created_at"
  | "updated_at"
>;

function mapDbError<T>(error: DbErrorLike): ApiResult<T> {
  if (error.code === "23505") {
    return fail("CONFLICT", error.message, { details: error.details, hint: error.hint });
  }

  if (error.code === "23514" || error.code === "P0001") {
    return fail("VALIDATION_ERROR", error.message, {
      details: error.details,
      hint: error.hint,
    });
  }

  return fail("DATABASE_ERROR", error.message, { details: error.details, hint: error.hint });
}

function extractNameParts(user: User): { primeiroNome: string; sobrenome: string } {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;

  const firstName =
    (typeof metadata?.first_name === "string" && metadata.first_name) ||
    (typeof metadata?.given_name === "string" && metadata.given_name) ||
    "";

  const lastName =
    (typeof metadata?.last_name === "string" && metadata.last_name) ||
    (typeof metadata?.family_name === "string" && metadata.family_name) ||
    "";

  if (firstName || lastName) {
    return { primeiroNome: firstName, sobrenome: lastName };
  }

  const fullName =
    (typeof metadata?.name === "string" && metadata.name) ||
    (typeof metadata?.full_name === "string" && metadata.full_name) ||
    "";

  if (!fullName.trim()) {
    return { primeiroNome: "", sobrenome: "" };
  }

  const parts = fullName.trim().split(/\s+/);
  return {
    primeiroNome: parts[0] ?? "",
    sobrenome: parts.slice(1).join(" "),
  };
}

function extractCreciMetadata(user: User): {
  creciUf?: UfEnum;
  creciNumero?: string;
  creciSufixo?: "F";
} {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const creciUfRaw = typeof metadata?.creci_uf === "string" ? metadata.creci_uf.toUpperCase() : null;
  const creciNumeroRaw = typeof metadata?.creci_numero === "string" ? metadata.creci_numero.trim() : null;
  const creciSufixoRaw = typeof metadata?.creci_sufixo === "string" ? metadata.creci_sufixo.toUpperCase() : "F";

  if (!creciUfRaw || !UF_VALUES.has(creciUfRaw as UfEnum)) {
    return {};
  }

  if (!creciNumeroRaw || !/^[0-9]{1,6}$/.test(creciNumeroRaw)) {
    return {};
  }

  if (creciSufixoRaw !== "F") {
    return {};
  }

  return {
    creciUf: creciUfRaw as UfEnum,
    creciNumero: creciNumeroRaw,
    creciSufixo: "F",
  };
}

async function authenticate(accessToken: string) {
  const client = createSupabaseServerClient(accessToken);
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    return fail<{ user: User; client: typeof client }>(
      "UNAUTHORIZED",
      "Invalid or missing access token",
    );
  }

  return ok({ user: data.user, client });
}

export async function ensureProfileOnFirstLogin(
  accessToken: string,
): Promise<ApiResult<{ id: string; created: boolean }>> {
  const auth = await authenticate(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;

  if (!user.email) {
    return fail("VALIDATION_ERROR", "Authenticated user has no e-mail");
  }

  const existingProfile = await client
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle<{ id: string }>();

  if (existingProfile.error) {
    return mapDbError(existingProfile.error);
  }

  if (existingProfile.data) {
    return ok({ id: user.id, created: false });
  }

  const names = extractNameParts(user);
  const creci = extractCreciMetadata(user);
  const insertProfile = await client.from("profiles").insert({
    id: user.id,
    email: user.email,
    primeiro_nome: names.primeiroNome,
    sobrenome: names.sobrenome,
    creci_uf: creci.creciUf ?? null,
    creci_numero: creci.creciNumero ?? null,
    creci_sufixo: creci.creciSufixo ?? "F",
  });

  if (insertProfile.error) {
    return mapDbError(insertProfile.error);
  }

  return ok({ id: user.id, created: true });
}

export async function getOwnProfile(accessToken: string): Promise<ApiResult<OwnProfile>> {
  const auth = await authenticate(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;

  const result = await client
    .from("profiles")
    .select(
      "id,email,primeiro_nome,sobrenome,nickname,genero,telefone,whatsapp_verificado_em,whatsapp,bio,uf,cidades_foco,cidades_foco_json,imoveis_residenciais,imoveis_comerciais,imoveis_industriais,imoveis_alto_padrao,imoveis_luxo,imoveis_medio_padrao,imoveis_baixa_renda,creci_uf,creci_numero,creci_sufixo,creci_documento_midia_id,creci_aprovacao,plano_id,avatar_url,imagem_capa_url,frase_impacto,logo_nickname_url,logo_nickname_white_url,instagram,linkedin,pinterest,tiktok,twitter,youtube,created_at,updated_at",
    )
    .eq("id", user.id)
    .maybeSingle<OwnProfile>();

  if (result.error) {
    return mapDbError(result.error);
  }

  if (!result.data) {
    return fail("NOT_FOUND", "Profile not found");
  }

  return ok(result.data);
}

export async function updateOwnProfile(
  accessToken: string,
  patch: UpdateProfileInput,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticate(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;

  if (Object.keys(patch).length === 0) {
    return fail("VALIDATION_ERROR", "No fields provided to update");
  }

  const dbPatch = patch as ProfileUpdate;

  const result = await client
    .from("profiles")
    .update(dbPatch)
    .eq("id", user.id)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (result.error) {
    return mapDbError(result.error);
  }

  if (!result.data) {
    return fail("NOT_FOUND", "Profile not found");
  }

  const hasPlanoPatch =
    Object.prototype.hasOwnProperty.call(patch, "plano_id") &&
    typeof patch.plano_id === "string" &&
    patch.plano_id.trim().length > 0;
  const hasNicknamePatch =
    Object.prototype.hasOwnProperty.call(patch, "nickname") &&
    typeof patch.nickname === "string" &&
    patch.nickname.trim().length > 0;
  const shouldGenerateNicknameLogos = hasPlanoPatch || hasNicknamePatch;

  if (shouldGenerateNicknameLogos) {
    const logoResult = await ensureProfileNicknameLogos(user.id, {
      force: hasNicknamePatch,
    });
    if (!logoResult.ok) {
      console.error("[updateOwnProfile] failed to ensure nickname logos", {
        ownerId: user.id,
        code: logoResult.error.code,
        message: logoResult.error.message,
      });
    }
  }

  return ok({ id: result.data.id });
}
