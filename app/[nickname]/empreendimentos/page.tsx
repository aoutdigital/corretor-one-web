import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Buildings } from "@phosphor-icons/react/dist/ssr";

import { BrokerPublicFooter } from "@/app/[nickname]/_components/broker-public-footer";
import { PublicBrokerHeader } from "@/app/[nickname]/_components/public-broker-header";
import { PublicEmpreendimentoCard } from "@/app/[nickname]/_components/public-empreendimento-card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type PageProps = {
  params: Promise<{ nickname: string }>;
};

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  | "id"
  | "nickname"
  | "primeiro_nome"
  | "sobrenome"
  | "email"
  | "telefone"
  | "whatsapp"
  | "avatar_url"
  | "imagem_capa_url"
  | "logo_nickname_url"
  | "logo_nickname_white_url"
  | "creci_uf"
  | "creci_numero"
  | "creci_sufixo"
  | "status"
>;
type EmpreendimentoRow = Pick<
  Database["public"]["Tables"]["empreendimentos"]["Row"],
  | "id"
  | "slug_publico"
  | "nome"
  | "resumo_curto"
  | "descricao"
  | "logradouro"
  | "numero"
  | "bairro"
  | "cidade"
  | "estado"
  | "fase"
  | "estagio_obra"
  | "previsao_entrega_em"
  | "n_torres"
  | "n_unidades"
  | "publicado_em"
>;
type MediaRow = {
  empreendimento_id: string;
  indice_publico: number;
  ordem: number;
  url: string;
};

const PROFILE_SELECT =
  "id,nickname,primeiro_nome,sobrenome,email,telefone,whatsapp,avatar_url,imagem_capa_url,logo_nickname_url,logo_nickname_white_url,creci_uf,creci_numero,creci_sufixo,status";
const EMPREENDIMENTO_SELECT = [
  "id",
  "slug_publico",
  "nome",
  "resumo_curto",
  "descricao",
  "logradouro",
  "numero",
  "bairro",
  "cidade",
  "estado",
  "fase",
  "estagio_obra",
  "previsao_entrega_em",
  "n_torres",
  "n_unidades",
  "publicado_em",
].join(",");

const RENDER_PUBLIC_SEGMENT = "/storage/v1/render/image/public/";
const OBJECT_PUBLIC_SEGMENT = "/storage/v1/object/public/";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { nickname } = await params;
  const profile = await getProfile(nickname);
  if (!profile) return { title: "Empreendimentos | Corretor.one" };

  const brokerName = getProfileName(profile);
  return {
    title: `Empreendimentos | ${brokerName}`,
    description: `Empreendimentos acompanhados por ${brokerName}. Conheça projetos, localização e imóveis disponíveis.`,
  };
}

export default async function PublicBrokerEmpreendimentosPage({ params }: PageProps) {
  const { nickname } = await params;
  const profile = await getProfile(nickname);
  if (!profile) notFound();

  const empreendimentos = await getPublishedEmpreendimentos(profile.id);
  const mediaById = await getEmpreendimentoMediaMap(empreendimentos.map((item) => item.id));
  const brokerName = getProfileName(profile);
  const logoUrl = getPublicImageUrl(profile.logo_nickname_url || profile.logo_nickname_white_url);
  const avatarUrl = getPublicImageUrl(profile.avatar_url);
  const coverUrl = getPublicImageUrl(profile.imagem_capa_url) || getPublicImageUrl(mediaById.get(empreendimentos[0]?.id ?? "")?.[0]?.url);
  const initials = getInitials(brokerName);

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <PublicBrokerHeader
        nickname={profile.nickname ?? nickname}
        brokerName={brokerName}
        logoUrl={logoUrl}
        avatarUrl={avatarUrl}
        initials={initials}
        creci={formatCreci(profile)}
      />

      <main>
        <section className="relative overflow-hidden border-b border-stone-200 bg-slate-950 px-5 py-20 text-white md:py-28">
          {coverUrl ? (
            <Image src={coverUrl} alt="" fill sizes="100vw" className="object-cover" priority unoptimized />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/86 to-slate-950/42" />
          <div className="relative mx-auto max-w-7xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--grey-olive)]">Empreendimentos</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-light leading-tight md:text-6xl">
              Projetos e condomínios que eu acompanho de perto.
            </h1>
            <p className="mt-5 max-w-2xl text-lg font-light leading-relaxed text-white/70">
              Compare localização, fase, características e as unidades disponíveis em cada empreendimento.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-14">
          <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--grey-olive)]">Lista completa</p>
              <h2 className="mt-2 text-3xl font-light text-slate-950">
                {empreendimentos.length} {empreendimentos.length === 1 ? "empreendimento publicado" : "empreendimentos publicados"}
              </h2>
            </div>
          </div>

          {empreendimentos.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {empreendimentos.map((empreendimento) => (
                <PublicEmpreendimentoCard
                  key={empreendimento.id}
                  nickname={profile.nickname ?? nickname}
                  empreendimento={{
                    ...empreendimento,
                    capa_url_publica_thumb_webp: getPublicImageUrl(mediaById.get(empreendimento.id)?.[0]?.url),
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-white text-[var(--grey-olive)]">
                <Buildings size={28} />
              </div>
              <p className="mt-4 text-2xl font-light text-slate-950">Nenhum empreendimento publicado no momento.</p>
            </div>
          )}
        </section>
      </main>

      <BrokerPublicFooter
        nickname={profile.nickname ?? nickname}
        brokerName={brokerName}
        creci={formatCreci(profile)}
        avatarUrl={avatarUrl}
      />
    </div>
  );
}

async function getProfile(nickname: string) {
  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("nickname", nickname.trim().toLowerCase())
    .eq("status", "ATIVO")
    .maybeSingle();

  if (result.error) throw new Error(`Erro ao carregar perfil publico: ${result.error.message}`);
  return result.data as ProfileRow | null;
}

async function getPublishedEmpreendimentos(ownerId: string) {
  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("empreendimentos")
    .select(EMPREENDIMENTO_SELECT)
    .eq("owner_id", ownerId)
    .eq("status", "PUBLICADO")
    .not("slug_publico", "is", null)
    .order("publicado_em", { ascending: false });

  if (result.error) throw new Error(`Erro ao carregar empreendimentos publicos: ${result.error.message}`);
  return (result.data ?? []) as unknown as EmpreendimentoRow[];
}

async function getEmpreendimentoMediaMap(empreendimentoIds: string[]) {
  const mediaById = new Map<string, MediaRow[]>();
  if (empreendimentoIds.length === 0) return mediaById;

  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("empreendimento_midia_publica")
    .select("empreendimento_id,indice_publico,ordem,url")
    .in("empreendimento_id", empreendimentoIds);

  if (result.error) throw new Error(`Erro ao carregar midias de empreendimentos: ${result.error.message}`);

  for (const row of (result.data ?? []).sort((a, b) => {
    if (a.empreendimento_id !== b.empreendimento_id) return a.empreendimento_id.localeCompare(b.empreendimento_id);
    if (a.indice_publico !== b.indice_publico) return a.indice_publico - b.indice_publico;
    return a.ordem - b.ordem;
  })) {
    const current = mediaById.get(row.empreendimento_id) ?? [];
    current.push(row);
    mediaById.set(row.empreendimento_id, current);
  }

  return mediaById;
}

function getProfileName(profile: Pick<ProfileRow, "primeiro_nome" | "sobrenome" | "nickname">) {
  return [profile.primeiro_nome, profile.sobrenome].map((part) => part?.trim()).filter(Boolean).join(" ") || profile.nickname || "Corretor.one";
}

function getInitials(name: string) {
  const letters = name.split(/\s+/).map((part) => part[0]).filter(Boolean).slice(0, 2).join("");
  return letters.toUpperCase() || "CO";
}

function formatCreci(profile: Pick<ProfileRow, "creci_uf" | "creci_numero" | "creci_sufixo">) {
  if (!profile.creci_uf || !profile.creci_numero) return "CRECI em verificação";
  return `CRECI ${profile.creci_uf} ${profile.creci_numero}-${profile.creci_sufixo || "F"}`;
}

function getPublicImageUrl(url: string | null | undefined) {
  const normalized = url?.trim();
  if (!normalized) return null;
  if (!normalized.includes(RENDER_PUBLIC_SEGMENT)) return normalized;

  const objectUrl = normalized.replace(RENDER_PUBLIC_SEGMENT, OBJECT_PUBLIC_SEGMENT);
  try {
    const parsed = new URL(objectUrl);
    for (const param of ["width", "height", "quality", "resize", "format"]) {
      parsed.searchParams.delete(param);
    }
    return parsed.toString();
  } catch {
    return objectUrl.split("?")[0] || objectUrl;
  }
}
