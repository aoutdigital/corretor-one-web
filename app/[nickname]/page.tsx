import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Buildings,
  EnvelopeSimple,
  HouseLine,
  MapPin,
  PhoneCall,
  SealCheck,
  ShieldCheck,
  WhatsappLogo,
} from "@phosphor-icons/react/dist/ssr";

import { ProfileContactSection, type PublicContactChannel } from "@/app/[nickname]/_components/profile-contact-section";
import { SocialProofCarousel, type SocialProofItem } from "@/app/[nickname]/_components/social-proof-carousel";
import { buildImovelHeaderTitle } from "@/lib/imoveis/display-title";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type PageProps = {
  params: Promise<{ nickname: string }>;
};

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ImovelRow = Pick<
  Database["public"]["Tables"]["imoveis"]["Row"],
  | "id"
  | "slug_publico"
  | "titulo"
  | "codigo"
  | "finalidade"
  | "tipo_negociacao"
  | "tipo"
  | "subtipo"
  | "cidade"
  | "bairro"
  | "bairro_comercial"
  | "estado"
  | "preco_venda"
  | "preco_locacao"
  | "area_util"
  | "area_terreno"
  | "dormitorios"
  | "suites"
  | "salas"
  | "vagas"
  | "destaque"
  | "publicado_em"
>;
type EmpreendimentoRow = Pick<
  Database["public"]["Tables"]["empreendimentos"]["Row"],
  | "id"
  | "slug_publico"
  | "nome"
  | "resumo_curto"
  | "descricao"
  | "bairro"
  | "cidade"
  | "estado"
  | "fase"
  | "estagio_obra"
  | "n_torres"
  | "n_unidades"
  | "publicado_em"
>;
type SocialProofRow = Pick<
  Database["public"]["Tables"]["provas_sociais"]["Row"],
  | "id"
  | "tipo"
  | "titulo"
  | "descricao"
  | "depoimento"
  | "cliente_nome_publico"
  | "localidade"
  | "data_momento"
  | "imagem_url"
  | "imagem_alt"
  | "destaque"
  | "ordem"
  | "publicado_em"
>;

type PublicProfile = Pick<
  ProfileRow,
  | "id"
  | "nickname"
  | "primeiro_nome"
  | "sobrenome"
  | "email"
  | "genero"
  | "telefone"
  | "whatsapp"
  | "frase_impacto"
  | "bio"
  | "avatar_url"
  | "imagem_capa_url"
  | "logo_nickname_url"
  | "logo_nickname_white_url"
  | "uf"
  | "cidades_foco"
  | "creci_uf"
  | "creci_numero"
  | "creci_sufixo"
  | "creci_aprovacao"
  | "imoveis_residenciais"
  | "imoveis_comerciais"
  | "imoveis_industriais"
  | "imoveis_alto_padrao"
  | "imoveis_luxo"
  | "imoveis_medio_padrao"
  | "imoveis_baixa_renda"
  | "instagram"
  | "linkedin"
  | "youtube"
  | "status"
>;

type MediaRow = {
  indice_publico: number;
  ordem: number;
  url: string;
};

const PROFILE_SELECT = `
  id,
  nickname,
  primeiro_nome,
  sobrenome,
  email,
  genero,
  telefone,
  whatsapp,
  frase_impacto,
  bio,
  avatar_url,
  imagem_capa_url,
  logo_nickname_url,
  logo_nickname_white_url,
  uf,
  cidades_foco,
  creci_uf,
  creci_numero,
  creci_sufixo,
  creci_aprovacao,
  imoveis_residenciais,
  imoveis_comerciais,
  imoveis_industriais,
  imoveis_alto_padrao,
  imoveis_luxo,
  imoveis_medio_padrao,
  imoveis_baixa_renda,
  instagram,
  linkedin,
  youtube,
  status
`;

const IMOVEL_SELECT = `
  id,
  slug_publico,
  titulo,
  codigo,
  finalidade,
  tipo_negociacao,
  tipo,
  subtipo,
  cidade,
  bairro,
  bairro_comercial,
  estado,
  preco_venda,
  preco_locacao,
  area_util,
  area_terreno,
  dormitorios,
  suites,
  salas,
  vagas,
  destaque,
  publicado_em
`;

const EMPREENDIMENTO_SELECT = `
  id,
  slug_publico,
  nome,
  resumo_curto,
  descricao,
  bairro,
  cidade,
  estado,
  fase,
  estagio_obra,
  n_torres,
  n_unidades,
  publicado_em
`;

const SOCIAL_PROOF_SELECT = `
  id,
  tipo,
  titulo,
  descricao,
  depoimento,
  cliente_nome_publico,
  localidade,
  data_momento,
  imagem_url,
  imagem_alt,
  destaque,
  ordem,
  publicado_em
`;

const OBJECT_PUBLIC_SEGMENT = "/storage/v1/object/public/";
const RENDER_PUBLIC_SEGMENT = "/storage/v1/render/image/public/";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { nickname } = await params;
  const profile = await getProfileByNickname(nickname);

  if (!profile) {
    return {
      title: "Corretor não encontrado | Corretor.one",
    };
  }

  const name = getProfileName(profile);
  const cityFocus = getLocationLine(profile);
  const impactPhrase = getImpactPhrase(profile);

  return {
    title: `${name} | Corretor.one`,
    description: [impactPhrase, cityFocus, "perfil profissional no Corretor.one"].filter(Boolean).join(" - "),
  };
}

export default async function PublicBrokerProfilePage({ params }: PageProps) {
  const { nickname } = await params;
  const profile = await getProfileByNickname(nickname);

  if (!profile) notFound();

  const [imoveis, empreendimentos, socialProofs, listingCounts] = await Promise.all([
    getPublishedImoveis(profile.id),
    getPublishedEmpreendimentos(profile.id),
    getPublishedSocialProofs(profile.id),
    getPublishedListingCounts(profile.id),
  ]);

  const brokerName = getProfileName(profile);
  const initials = getInitials(brokerName);
  const locationLine = getLocationLine(profile);
  const creci = formatCreci(profile);
  const impactPhrase = getImpactPhrase(profile);
  const whatsappHref = buildWhatsAppHref(profile.whatsapp || profile.telefone);
  const phoneHref = buildPhoneHref(profile.telefone);
  const coverUrl = getPublicImageUrl(profile.imagem_capa_url) || "/images/corretor-one-chaves-casal.jpeg";
  const avatarUrl = getPublicImageUrl(profile.avatar_url);
  const headerLogoUrl = getPublicImageUrl(profile.logo_nickname_url || profile.logo_nickname_white_url);
  const socialLinks = getSocialLinks(profile);
  const bioHtml = sanitizeBioHtml(profile.bio);

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link href={`/${profile.nickname}`} aria-label={brokerName} className="min-w-0">
            {headerLogoUrl ? (
              <Image
                src={headerLogoUrl}
                alt={brokerName}
                width={260}
                height={90}
                className="h-10 w-auto max-w-[210px] object-contain md:max-w-[260px]"
                priority
                unoptimized
              />
            ) : (
              <span className="block truncate text-lg font-bold text-slate-950 md:text-xl">{brokerName}</span>
            )}
          </Link>
          <nav className="hidden items-center gap-2 text-sm font-light text-slate-600 md:flex">
            <a className="rounded-lg px-3 py-2 transition hover:bg-slate-100" href="#imoveis">
              Imóveis
            </a>
            <a className="rounded-lg px-3 py-2 transition hover:bg-slate-100" href="#empreendimentos">
              Empreendimentos
            </a>
            <a className="rounded-lg px-3 py-2 transition hover:bg-slate-100" href="#contato">
              Contato
            </a>
          </nav>
          <div className="flex shrink-0 items-center gap-3">
            {whatsappHref ? (
              <a
                href={whatsappHref}
                className="hidden items-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-bold text-white transition hover:brightness-95 sm:inline-flex"
              >
                <PhoneCall size={16} />
                Falar agora
              </a>
            ) : (
              <a
                href={`mailto:${profile.email}`}
                className="hidden items-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-bold text-white transition hover:brightness-95 sm:inline-flex"
              >
                <EnvelopeSimple size={16} />
                Enviar email
              </a>
            )}
            <div className="relative h-11 w-11 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-slate-700 shadow-sm">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={brokerName}
                  fill
                  sizes="44px"
                  className="object-cover"
                  priority
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-bold">{initials}</div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="relative min-h-[620px] overflow-hidden border-b border-slate-200">
          <Image
            src={coverUrl}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-slate-950/68" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

          <div className="relative mx-auto flex min-h-[620px] max-w-7xl items-end px-5 py-10 md:py-14">
            <div className="relative w-full lg:pr-72">
              <div>
                <div className="flex flex-col gap-5 md:flex-row md:items-end">
                  <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-white/30 bg-white/10 shadow-lg">
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt={brokerName}
                        fill
                        sizes="112px"
                        className="object-cover"
                        priority
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-white">
                        {initials}
                      </div>
                    )}
                  </div>
                  <div>
                    <h1 className="max-w-4xl text-4xl font-bold leading-tight text-white md:text-6xl">
                      {brokerName}
                    </h1>
                    <div className="mt-4 flex flex-wrap gap-2 text-sm text-white/90">
                      {creci ? (
                        <span className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 backdrop-blur">
                          <ShieldCheck size={16} />
                          CRECI {creci}
                        </span>
                      ) : null}
                      {locationLine ? (
                        <span className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 backdrop-blur">
                          <MapPin size={16} />
                          {locationLine}
                        </span>
                      ) : null}
                      {profile.creci_aprovacao ? (
                        <span className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/15 px-3 py-2 font-bold text-white shadow-sm backdrop-blur">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--blue-slate)] text-white">
                            <SealCheck size={16} weight="fill" />
                          </span>
                          Perfil verificado
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <h2 className="mt-5 max-w-3xl text-2xl font-light leading-9 text-white/85 md:text-3xl">
                  {impactPhrase}
                </h2>

                <div className="mt-8 flex flex-wrap gap-3">
                  {whatsappHref ? (
                    <a
                      href={whatsappHref}
                      className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-5 py-3 text-sm font-bold text-white transition hover:brightness-95"
                    >
                      <WhatsappLogo size={18} />
                      Chamar no WhatsApp
                    </a>
                  ) : null}
                  <a
                    href="#imoveis"
                    className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/18"
                  >
                    <HouseLine size={18} />
                    Ver meus imóveis
                  </a>
                </div>
              </div>

              <div className="mt-8 flex justify-start lg:absolute lg:bottom-0 lg:right-0 lg:mt-0 lg:justify-end">
                <ListingStatsCards
                  imoveisCount={listingCounts.imoveis}
                  empreendimentosCount={listingCounts.empreendimentos}
                />
              </div>
            </div>
          </div>
        </section>

        {bioHtml ? (
          <section id="bio" className="border-b border-slate-200 bg-white">
            <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 lg:grid-cols-[0.75fr_1.25fr]">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--primary-scarlet)]">Bio</p>
                <h2 className="mt-2 text-3xl font-bold">Sobre {brokerName.split(" ")[0]}</h2>
              </div>
              <div
                className="max-w-3xl text-lg font-light leading-8 text-slate-700 [&_b]:font-bold [&_div+div]:mt-4 [&_em]:italic [&_i]:italic [&_li]:my-1 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p+p]:mt-4 [&_strong]:font-bold [&_u]:underline [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6"
                dangerouslySetInnerHTML={{ __html: bioHtml }}
              />
            </div>
          </section>
        ) : null}

        <SocialProofCarousel items={socialProofs} />

        <section id="imoveis" className="mx-auto max-w-7xl px-5 py-14">
          <SectionHeader
            eyebrow="Imóveis"
            title="Oportunidades em destaque"
            actionHref={`/${profile.nickname}/imoveis`}
            actionLabel="Ver todos"
          />

          {imoveis.length > 0 ? (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {imoveis.map((imovel) => (
                <ImovelCard key={imovel.id} nickname={profile.nickname ?? ""} imovel={imovel} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<HouseLine size={28} />}
              title="Nenhum imóvel publicado no momento"
              description="Quando novos anúncios forem publicados, eles aparecerão aqui."
            />
          )}
        </section>

        <section id="empreendimentos" className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-5 py-14">
            <SectionHeader
              eyebrow="Empreendimentos"
              title="Lançamentos e projetos"
              actionHref={`/${profile.nickname}/empreendimentos`}
              actionLabel="Ver todos"
            />

            {empreendimentos.length > 0 ? (
              <div className="mt-8 grid gap-5 md:grid-cols-2">
                {empreendimentos.map((empreendimento) => (
                  <EmpreendimentoCard
                    key={empreendimento.id}
                    nickname={profile.nickname ?? ""}
                    empreendimento={empreendimento}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Buildings size={28} />}
                title="Nenhum empreendimento publicado no momento"
                description="Os empreendimentos ativos desse corretor aparecerão nesta área."
              />
            )}
          </div>
        </section>

        <ProfileContactSection
          brokerName={brokerName}
          brokerFirstName={brokerName.split(" ")[0] || brokerName}
          nickname={profile.nickname ?? nickname}
          coverUrl={coverUrl}
          avatarUrl={avatarUrl}
          channels={[
            ...(whatsappHref
              ? [
                  {
                    type: "whatsapp" as const,
                    href: whatsappHref,
                    label: "WhatsApp",
                    value: "Iniciar conversa",
                  },
                ]
              : []),
            ...(phoneHref
              ? [
                  {
                    type: "phone" as const,
                    href: phoneHref,
                    label: "Telefone",
                    value: profile.telefone ?? "",
                  },
                ]
              : []),
            {
              type: "email",
              href: `mailto:${profile.email}`,
              label: "Email",
              value: profile.email,
            },
            ...socialLinks,
          ]}
        />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p className="font-light">Site profissional de {brokerName}.</p>
          <Link href="/" className="font-bold text-slate-700 transition hover:text-[var(--primary-scarlet)]">
            Crie seu perfil no Corretor.one
          </Link>
        </div>
      </footer>
    </div>
  );
}

async function getProfileByNickname(rawNickname: string) {
  const nickname = rawNickname.trim().toLowerCase();
  if (!/^[a-z0-9]{1,35}$/.test(nickname)) return null;

  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("nickname", nickname)
    .eq("status", "ATIVO")
    .maybeSingle();

  if (result.error) {
    throw new Error(`Erro ao carregar perfil publico: ${result.error.message}`);
  }

  return result.data as PublicProfile | null;
}

async function getPublishedImoveis(ownerId: string) {
  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("imoveis")
    .select(IMOVEL_SELECT)
    .eq("owner_id", ownerId)
    .eq("status", "PUBLICADO")
    .not("slug_publico", "is", null)
    .order("destaque", { ascending: false })
    .order("publicado_em", { ascending: false })
    .limit(6);

  if (result.error) {
    throw new Error(`Erro ao carregar imoveis publicos: ${result.error.message}`);
  }

  const imoveis = (result.data ?? []) as ImovelRow[];
  const mediaById = await getImovelMediaMap(imoveis.map((item) => item.id));

  return imoveis.map((item) => ({
    ...item,
    capa_url_publica_thumb_webp: getCardImage(mediaById.get(item.id)?.[0]?.url),
  }));
}

async function getPublishedEmpreendimentos(ownerId: string) {
  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("empreendimentos")
    .select(EMPREENDIMENTO_SELECT)
    .eq("owner_id", ownerId)
    .eq("status", "PUBLICADO")
    .not("slug_publico", "is", null)
    .order("publicado_em", { ascending: false })
    .limit(4);

  if (result.error) {
    throw new Error(`Erro ao carregar empreendimentos publicos: ${result.error.message}`);
  }

  const empreendimentos = (result.data ?? []) as EmpreendimentoRow[];
  const mediaById = await getEmpreendimentoMediaMap(empreendimentos.map((item) => item.id));

  return empreendimentos.map((item) => ({
    ...item,
    capa_url_publica_thumb_webp: getCardImage(mediaById.get(item.id)?.[0]?.url),
  }));
}

async function getPublishedSocialProofs(ownerId: string): Promise<SocialProofItem[]> {
  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("provas_sociais")
    .select(SOCIAL_PROOF_SELECT)
    .eq("owner_id", ownerId)
    .eq("status", "PUBLICADO")
    .order("destaque", { ascending: false })
    .order("ordem", { ascending: true })
    .order("publicado_em", { ascending: false })
    .limit(12);

  if (result.error) {
    throw new Error(`Erro ao carregar provas sociais publicas: ${result.error.message}`);
  }

  return ((result.data ?? []) as SocialProofRow[]).map((item) => ({
    id: item.id,
    tipo: item.tipo,
    titulo: item.titulo,
    descricao: item.descricao,
    depoimento: item.depoimento,
    cliente_nome_publico: item.cliente_nome_publico,
    localidade: item.localidade,
    data_momento: item.data_momento,
    imagem_url: getPublicImageUrl(item.imagem_url),
    imagem_alt: item.imagem_alt,
  }));
}

async function getPublishedListingCounts(ownerId: string) {
  const supabase = createSupabaseServerClient();

  const [imoveisResult, empreendimentosResult] = await Promise.all([
    supabase
      .from("imoveis")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", ownerId)
      .eq("status", "PUBLICADO")
      .not("slug_publico", "is", null),
    supabase
      .from("empreendimentos")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", ownerId)
      .eq("status", "PUBLICADO")
      .not("slug_publico", "is", null),
  ]);

  if (imoveisResult.error) {
    throw new Error(`Erro ao contar imoveis publicos: ${imoveisResult.error.message}`);
  }

  if (empreendimentosResult.error) {
    throw new Error(`Erro ao contar empreendimentos publicos: ${empreendimentosResult.error.message}`);
  }

  return {
    imoveis: imoveisResult.count ?? 0,
    empreendimentos: empreendimentosResult.count ?? 0,
  };
}

async function getImovelMediaMap(imovelIds: string[]) {
  const mediaById = new Map<string, MediaRow[]>();
  if (imovelIds.length === 0) return mediaById;

  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("imovel_midia_publica")
    .select("imovel_id,indice_publico,ordem,url")
    .in("imovel_id", imovelIds);

  if (result.error) {
    throw new Error(`Erro ao carregar midias de imoveis: ${result.error.message}`);
  }

  for (const row of sortMediaRows(result.data ?? [], "imovel_id")) {
    const current = mediaById.get(row.imovel_id) ?? [];
    current.push(row);
    mediaById.set(row.imovel_id, current);
  }

  return mediaById;
}

async function getEmpreendimentoMediaMap(empreendimentoIds: string[]) {
  const mediaById = new Map<string, MediaRow[]>();
  if (empreendimentoIds.length === 0) return mediaById;

  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("empreendimento_midia_publica")
    .select("empreendimento_id,indice_publico,ordem,url")
    .in("empreendimento_id", empreendimentoIds);

  if (result.error) {
    throw new Error(`Erro ao carregar midias de empreendimentos: ${result.error.message}`);
  }

  for (const row of sortMediaRows(result.data ?? [], "empreendimento_id")) {
    const current = mediaById.get(row.empreendimento_id) ?? [];
    current.push(row);
    mediaById.set(row.empreendimento_id, current);
  }

  return mediaById;
}

function sortMediaRows<T extends MediaRow & Record<TParentKey, string>, TParentKey extends string>(
  rows: T[],
  parentKey: TParentKey,
) {
  return rows.sort((a, b) => {
    if (a[parentKey] !== b[parentKey]) return a[parentKey].localeCompare(b[parentKey]);
    if (a.indice_publico !== b.indice_publico) return a.indice_publico - b.indice_publico;
    return a.ordem - b.ordem;
  });
}

function getCardImage(url: string | null | undefined) {
  return getPublicImageUrl(url);
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
    return objectUrl;
  }
}

function getProfileName(profile: Pick<ProfileRow, "primeiro_nome" | "sobrenome" | "nickname">) {
  const fullName = [profile.primeiro_nome, profile.sobrenome]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  return fullName || profile.nickname || "Corretor.one";
}

function getImpactPhrase(
  profile: Pick<
    ProfileRow,
    | "frase_impacto"
    | "genero"
    | "imoveis_residenciais"
    | "imoveis_comerciais"
    | "imoveis_industriais"
    | "imoveis_alto_padrao"
    | "imoveis_luxo"
  >,
) {
  const custom = profile.frase_impacto?.trim();
  if (custom) return custom;

  const role =
    profile.genero === "FEMININO" ? "Corretora" : profile.genero === "MASCULINO" ? "Corretor" : "Especialista";
  const segments = [
    profile.imoveis_residenciais ? "residenciais" : null,
    profile.imoveis_comerciais ? "comerciais" : null,
    profile.imoveis_industriais ? "industriais" : null,
  ].filter((item): item is string => Boolean(item));
  const positioning = [
    profile.imoveis_alto_padrao ? "alto padrão" : null,
    profile.imoveis_luxo ? "luxo" : null,
  ].filter((item): item is string => Boolean(item));

  const prefix = role === "Especialista" ? "Especialista em imóveis" : `${role} especialista em imóveis`;
  const segmentText =
    segments.length === 3 ? "residenciais, comerciais/industriais" : joinPortugueseList(segments);
  const base = segmentText ? `${prefix} ${segmentText}` : prefix;
  const positioningText = joinPortugueseList(positioning);
  const phrase = positioningText ? `${base}, ${positioningText}` : base;

  return phrase.length <= 90 ? phrase : `${prefix} ${segmentText || "selecionados"}`.trim();
}

function joinPortugueseList(items: string[]) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} e ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

function sanitizeBioHtml(value: string | null) {
  const raw = value?.trim();
  if (!raw) return "";

  const allowedTags = new Set(["b", "br", "div", "em", "i", "li", "ol", "p", "strong", "u", "ul"]);
  const withoutDangerousBlocks = raw
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|svg|math|form|input|button|link|meta|base)[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|iframe|object|embed|svg|math|form|input|button|link|meta|base)\b[^>]*\/?>/gi, "");

  let output = "";
  let lastIndex = 0;
  const tagPattern = /<\/?([a-zA-Z][\w:-]*)(?:\s[^<>]*)?>/g;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(withoutDangerousBlocks))) {
    output += escapeHtml(withoutDangerousBlocks.slice(lastIndex, match.index));

    const tag = match[1]?.toLowerCase();
    if (tag && allowedTags.has(tag)) {
      const isClosing = match[0].startsWith("</");
      const normalizedTag = tag === "b" ? "strong" : tag === "i" ? "em" : tag;
      output += normalizedTag === "br" ? "<br>" : `<${isClosing ? "/" : ""}${normalizedTag}>`;
    }

    lastIndex = tagPattern.lastIndex;
  }

  output += escapeHtml(withoutDangerousBlocks.slice(lastIndex));
  return output.trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getInitials(name: string) {
  const letters = name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  return letters.toUpperCase() || "CO";
}

function getLocationLine(profile: Pick<ProfileRow, "cidades_foco" | "uf">) {
  const cities = profile.cidades_foco?.filter(Boolean).slice(0, 2) ?? [];
  if (cities.length > 0) return [cities.join(", "), profile.uf].filter(Boolean).join(" / ");
  return profile.uf ?? "";
}

function formatCreci(profile: Pick<ProfileRow, "creci_uf" | "creci_numero" | "creci_sufixo">) {
  if (!profile.creci_uf || !profile.creci_numero) return null;
  const suffix = profile.creci_sufixo || "F";
  return `${profile.creci_uf} ${profile.creci_numero}-${suffix}`;
}

function buildWhatsAppHref(value: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (digits.length < 10) return null;
  return `https://wa.me/${digits}`;
}

function buildPhoneHref(value: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  const localDigits = digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;
  if (localDigits.length < 10) return null;
  return `tel:0${localDigits}`;
}

function getSocialLinks(profile: Pick<ProfileRow, "instagram" | "linkedin" | "youtube">): PublicContactChannel[] {
  const links = [
    buildSocialLink("Instagram", profile.instagram, "instagram"),
    buildSocialLink("LinkedIn", profile.linkedin, "linkedin"),
    buildSocialLink("YouTube", profile.youtube, "youtube"),
  ];

  return links.filter((link): link is NonNullable<typeof link> => Boolean(link));
}

function buildSocialLink(
  label: string,
  value: string | null,
  provider: "instagram" | "linkedin" | "youtube",
): PublicContactChannel | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const href =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : provider === "instagram"
        ? `https://instagram.com/${trimmed.replace(/^@/, "")}`
        : provider === "linkedin"
          ? `https://www.linkedin.com/in/${trimmed.replace(/^@/, "")}`
          : `https://www.youtube.com/${trimmed.replace(/^@/, "")}`;

  return { type: provider, href, label, value: trimmed };
}

function formatPrice(imovel: ImovelRow) {
  if (imovel.tipo_negociacao === "ALUGUEL" && imovel.preco_locacao) {
    return `${currencyFormatter.format(imovel.preco_locacao)}/mês`;
  }
  if (imovel.preco_venda) return currencyFormatter.format(imovel.preco_venda);
  if (imovel.preco_locacao) return `${currencyFormatter.format(imovel.preco_locacao)}/mês`;
  return "Consulte valores";
}

function getImovelHref(nickname: string, imovel: ImovelRow) {
  const operation = imovel.tipo_negociacao === "ALUGUEL" ? "aluguel" : "venda";
  return `/${nickname}/${operation}/${imovel.slug_publico}`;
}

function formatEnumLabel(value: string | null) {
  if (!value) return null;
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ListingStatsCards({
  imoveisCount,
  empreendimentosCount,
}: {
  imoveisCount: number;
  empreendimentosCount: number;
}) {
  return (
    <div className="flex flex-wrap gap-3 text-white">
      <ListingStatCard
        href="#imoveis"
        icon={<HouseLine size={24} />}
        value={imoveisCount}
        label="Imóveis"
      />
      <ListingStatCard
        href="#empreendimentos"
        icon={<Buildings size={24} />}
        value={empreendimentosCount}
        label="Empreend."
      />
    </div>
  );
}

function ListingStatCard({
  href,
  icon,
  value,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <a
      href={href}
      className="group flex w-[120px] flex-col items-center rounded-lg border border-white/20 bg-white/12 px-3 py-4 text-center text-white shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/18"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[var(--blue-slate)] shadow-sm transition group-hover:scale-105">
        {icon}
      </span>
      <span className="mt-3 block min-w-[3ch] text-3xl font-bold leading-none tabular-nums">{formatCompactCount(value)}</span>
      <span className="mt-2 block text-xs font-light uppercase tracking-[0.08em] text-white/72">{label}</span>
    </a>
  );
}

function formatCompactCount(value: number) {
  if (value >= 1_000_000) return `${Math.floor(value / 1_000_000)}M`;
  if (value >= 1_000) return `${Math.floor(value / 1_000)}K`;
  return String(Math.min(value, 999)).padStart(2, "0");
}

function SectionHeader({
  eyebrow,
  title,
  actionHref,
  actionLabel,
}: {
  eyebrow: string;
  title: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--primary-scarlet)]">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-bold">{title}</h2>
      </div>
      <Link
        href={actionHref}
        className="inline-flex w-fit items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

function ImovelCard({ nickname, imovel }: { nickname: string; imovel: ImovelRow & { capa_url_publica_thumb_webp: string | null } }) {
  const title = buildImovelHeaderTitle(imovel);
  const href = getImovelHref(nickname, imovel);

  return (
    <Link href={href} className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[4/3] bg-slate-100">
        {imovel.capa_url_publica_thumb_webp ? (
          <Image
            src={imovel.capa_url_publica_thumb_webp}
            alt={title}
            fill
            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition duration-300 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            <HouseLine size={34} />
          </div>
        )}
        {imovel.destaque ? (
          <span className="absolute left-3 top-3 rounded-lg bg-[var(--primary-scarlet)] px-3 py-1 text-xs font-bold text-white">
            Destaque
          </span>
        ) : null}
      </div>
      <div className="p-4">
        <p className="text-lg font-bold leading-snug text-slate-950">{title}</p>
        <p className="mt-3 text-xl font-bold text-[var(--primary-scarlet)]">{formatPrice(imovel)}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
          {imovel.area_util ? <span className="rounded-lg bg-slate-100 px-2 py-1">{imovel.area_util} m²</span> : null}
          {imovel.dormitorios ? (
            <span className="rounded-lg bg-slate-100 px-2 py-1">{imovel.dormitorios} dorm.</span>
          ) : null}
          {imovel.vagas ? <span className="rounded-lg bg-slate-100 px-2 py-1">{imovel.vagas} vagas</span> : null}
        </div>
      </div>
    </Link>
  );
}

function EmpreendimentoCard({
  nickname,
  empreendimento,
}: {
  nickname: string;
  empreendimento: EmpreendimentoRow & { capa_url_publica_thumb_webp: string | null };
}) {
  const href = `/${nickname}/empreendimento/${empreendimento.slug_publico}`;
  const stage = formatEnumLabel(empreendimento.estagio_obra);
  const phase = formatEnumLabel(empreendimento.fase);
  const description = empreendimento.resumo_curto || empreendimento.descricao;

  return (
    <Link href={href} className="group grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:grid-cols-[0.9fr_1.1fr]">
      <div className="relative min-h-64 bg-slate-100">
        {empreendimento.capa_url_publica_thumb_webp ? (
          <Image
            src={empreendimento.capa_url_publica_thumb_webp}
            alt={empreendimento.nome}
            fill
            sizes="(min-width: 768px) 40vw, 100vw"
            className="object-cover transition duration-300 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full min-h-64 w-full items-center justify-center text-slate-400">
            <Buildings size={34} />
          </div>
        )}
      </div>
      <div className="flex flex-col justify-between p-5">
        <div>
          <p className="text-sm font-light text-slate-500">
            {[empreendimento.bairro, `${empreendimento.cidade}/${empreendimento.estado}`].filter(Boolean).join(" - ")}
          </p>
          <h3 className="mt-2 text-2xl font-bold leading-tight text-slate-950">{empreendimento.nome}</h3>
          {description ? <p className="mt-3 line-clamp-3 font-light leading-7 text-slate-600">{description}</p> : null}
        </div>
        <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-600">
          {phase ? <span className="rounded-lg bg-slate-100 px-2 py-1">{phase}</span> : null}
          {stage ? <span className="rounded-lg bg-slate-100 px-2 py-1">{stage}</span> : null}
          {empreendimento.n_unidades ? (
            <span className="rounded-lg bg-slate-100 px-2 py-1">{empreendimento.n_unidades} unidades</span>
          ) : null}
          {empreendimento.n_torres ? (
            <span className="rounded-lg bg-slate-100 px-2 py-1">{empreendimento.n_torres} torres</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="mt-8 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500">{icon}</div>
      <h3 className="mt-4 text-xl font-bold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md font-light text-slate-600">{description}</p>
    </div>
  );
}
