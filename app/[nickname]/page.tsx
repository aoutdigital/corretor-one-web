import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Buildings,
  ChartLineUp,
  Clock,
  HouseLine,
  MapPin,
  SealCheck,
  ShieldCheck,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";

import { ProfileContactSection, type PublicContactChannel } from "@/app/[nickname]/_components/profile-contact-section";
import { BrokerPublicFooter } from "@/app/[nickname]/_components/broker-public-footer";
import { HorizontalLoopCarousel } from "@/app/[nickname]/_components/horizontal-loop-carousel";
import { LeadWhatsAppButton } from "@/app/[nickname]/_components/lead-whatsapp-button";
import { PublicBrokerHeader } from "@/app/[nickname]/_components/public-broker-header";
import { PublicEmpreendimentoCard } from "@/app/[nickname]/_components/public-empreendimento-card";
import { PublicPropertyCard, type PublicPropertyCardImovel } from "@/app/[nickname]/_components/public-property-card";
import { SocialProofCarousel, type SocialProofItem } from "@/app/[nickname]/_components/social-proof-carousel";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type PageProps = {
  params: Promise<{ nickname: string }>;
};

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ImovelRow = PublicPropertyCardImovel;
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
type AuthorityNumberRow = Pick<
  Database["public"]["Tables"]["profile_authority_numbers"]["Row"],
  | "id"
  | "tipo"
  | "valor"
  | "rotulo"
  | "descricao"
  | "ordem"
  | "visivel"
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
  finalidade,
  tipo_negociacao,
  tipo,
  subtipo,
  bairro_comercial,
  bairro,
  cidade,
  estado,
  logradouro,
  numero,
  cep,
  endereco_complemento,
  enderecovisualizacao,
  ocultar_numero_publico,
  mostrar_complemento_no_anuncio,
  empreendimento_id,
  empreendimento_tipologia_label,
  empreendimentos(nome,slug_publico),
  preco_venda,
  preco_locacao,
  condominio,
  iptu,
  iptu_periodicidade,
  area_util,
  area_total,
  dormitorios,
  suites,
  banheiros,
  vagas,
  publicado_em
`;

const EMPREENDIMENTO_SELECT = `
  id,
  slug_publico,
  nome,
  resumo_curto,
  descricao,
  logradouro,
  numero,
  bairro,
  cidade,
  estado,
  fase,
  estagio_obra,
  previsao_entrega_em,
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

const AUTHORITY_NUMBER_SELECT = `
  id,
  tipo,
  valor,
  rotulo,
  descricao,
  ordem,
  visivel
`;

const OBJECT_PUBLIC_SEGMENT = "/storage/v1/object/public/";
const RENDER_PUBLIC_SEGMENT = "/storage/v1/render/image/public/";

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
  const impactPhrase = getImpactPhrase(profile, { includeCustom: false });

  return {
    title: `${name} | Corretor.one`,
    description: [impactPhrase, cityFocus, "perfil profissional no Corretor.one"].filter(Boolean).join(" - "),
  };
}

export default async function PublicBrokerProfilePage({ params }: PageProps) {
  const { nickname } = await params;
  const profile = await getProfileByNickname(nickname);

  if (!profile) notFound();

  const [imoveis, empreendimentos, socialProofs, listingCounts, authorityNumbers] = await Promise.all([
    getPublishedImoveis(profile.id),
    getPublishedEmpreendimentos(profile.id),
    getPublishedSocialProofs(profile.id),
    getPublishedListingCounts(profile.id),
    getPublicAuthorityNumbers(profile.id),
  ]);

  const brokerName = getProfileName(profile);
  const initials = getInitials(brokerName);
  const locationLine = getLocationLine(profile);
  const creci = formatCreci(profile);
  const impactPhrase = getImpactPhrase(profile, { includeCustom: false });
  const whatsappHref = buildWhatsAppHref(profile.whatsapp || profile.telefone);
  const phoneHref = buildPhoneHref(profile.telefone);
  const coverUrl = getPublicImageUrl(profile.imagem_capa_url) || "/images/corretor-one-chaves-casal.jpeg";
  const avatarUrl = getPublicImageUrl(profile.avatar_url);
  const logoUrl = getPublicImageUrl(profile.logo_nickname_url || profile.logo_nickname_white_url);
  const socialLinks = getSocialLinks(profile);
  const bioHtml = sanitizeBioHtml(profile.bio);

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <PublicBrokerHeader
        nickname={profile.nickname ?? nickname}
        brokerName={brokerName}
        logoUrl={logoUrl}
        avatarUrl={avatarUrl}
        initials={initials}
        creci={creci}
      />

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
                    <LeadWhatsAppButton
                      nickname={profile.nickname ?? nickname}
                      brokerName={brokerName}
                      avatarUrl={avatarUrl}
                      creci={creci}
                      label="Chamar no WhatsApp"
                      className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-5 py-3 text-sm font-bold text-white transition hover:brightness-95"
                    />
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

        {bioHtml || authorityNumbers.length > 0 ? (
          <AboutAuthoritySection
            brokerName={brokerName}
            headline={profile.frase_impacto}
            bioHtml={bioHtml}
            imageUrl={avatarUrl || coverUrl}
            initials={initials}
            authorityNumbers={authorityNumbers}
          />
        ) : null}

        <SocialProofCarousel items={socialProofs} />

        <section id="imoveis" className="py-14">
          <div className="mx-auto max-w-7xl px-5">
            <SectionHeader
              eyebrow="Imóveis"
              title="Oportunidades em destaque"
            />
          </div>

          {imoveis.length > 0 ? (
            <>
              <div className="mt-2">
                <HorizontalLoopCarousel
                  ariaLabel="Imóveis em destaque"
                  previousLabel="Ver imóvel anterior"
                  nextLabel="Ver próximo imóvel"
                  scrollerClassName="overflow-x-auto scroll-smooth overscroll-x-contain pb-20 pt-10 pl-[max(1.25rem,calc((100vw-80rem)/2+1.25rem))] pr-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                  {imoveis.map((imovel) => (
                    <PublicPropertyCard
                      key={imovel.id}
                      nickname={profile.nickname ?? ""}
                      imovel={imovel}
                      imageUrl={imovel.capa_url_publica_thumb_webp}
                    />
                  ))}
                </HorizontalLoopCarousel>
              </div>

              <div className="mx-auto max-w-7xl px-5">
                <div className="mt-8 flex flex-col items-start justify-between gap-5 border-t border-stone-200 pt-10 md:flex-row md:items-center">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--grey-olive)]">
                      Estoque completo
                    </p>
                    <h3 className="mt-2 max-w-3xl text-2xl font-light leading-tight text-slate-950 md:text-3xl">
                      Tenho outros imóveis publicados para você comparar.
                    </h3>
                    <p className="mt-3 max-w-2xl text-base font-light leading-7 text-slate-600">
                      Acesse a listagem completa e filtre por bairro, valor, área e características.
                    </p>
                  </div>
                  <Link
                    href={`/${profile.nickname}/imoveis`}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[var(--grey-olive)]/45 px-5 py-3 text-sm font-semibold text-[var(--grey-olive)] transition hover:bg-[var(--grey-olive)] hover:text-white"
                  >
                    Ver imóveis disponíveis
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="mx-auto max-w-7xl px-5">
              <EmptyState
                icon={<HouseLine size={28} />}
                title="Nenhum imóvel publicado no momento"
                description="Quando novos anúncios forem publicados, eles aparecerão aqui."
              />
            </div>
          )}
        </section>

        <section id="empreendimentos" className="border-y border-slate-200 bg-white py-14">
          <div className="mx-auto max-w-7xl px-5">
            <SectionHeader
              eyebrow="Empreendimentos"
              title="Lançamentos e projetos"
            />
          </div>

          {empreendimentos.length > 0 ? (
            <>
              <div className="mt-2">
                <HorizontalLoopCarousel
                  ariaLabel="Empreendimentos em destaque"
                  previousLabel="Ver empreendimento anterior"
                  nextLabel="Ver próximo empreendimento"
                  scrollerClassName="overflow-x-auto scroll-smooth overscroll-x-contain pb-20 pt-10 pl-[max(1.25rem,calc((100vw-80rem)/2+1.25rem))] pr-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                {empreendimentos.map((empreendimento) => (
                  <PublicEmpreendimentoCard
                    key={empreendimento.id}
                    nickname={profile.nickname ?? ""}
                    empreendimento={empreendimento}
                  />
                ))}
                </HorizontalLoopCarousel>
              </div>

              <div className="mx-auto max-w-7xl px-5">
                <div className="mt-8 flex flex-col items-start justify-between gap-5 border-t border-stone-200 pt-10 md:flex-row md:items-center">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--grey-olive)]">
                      Projetos e condomínios
                    </p>
                    <h3 className="mt-2 max-w-3xl text-2xl font-light leading-tight text-slate-950 md:text-3xl">
                      Veja os empreendimentos que eu acompanho de perto.
                    </h3>
                    <p className="mt-3 max-w-2xl text-base font-light leading-7 text-slate-600">
                      Acesse a lista completa para comparar fases, localização e imóveis disponíveis em cada projeto.
                    </p>
                  </div>
                  <Link
                    href={`/${profile.nickname}/empreendimentos`}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[var(--grey-olive)]/45 px-5 py-3 text-sm font-semibold text-[var(--grey-olive)] transition hover:bg-[var(--grey-olive)] hover:text-white"
                  >
                    Ver empreendimentos
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="mx-auto max-w-7xl px-5">
              <EmptyState
                icon={<Buildings size={28} />}
                title="Nenhum empreendimento publicado no momento"
                description="Os empreendimentos ativos desse corretor aparecerão nesta área."
              />
            </div>
          )}
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

      <BrokerPublicFooter
        nickname={profile.nickname ?? nickname}
        brokerName={brokerName}
        creci={formatCreci(profile)}
        avatarUrl={avatarUrl}
      />
    </div>
  );
}

function AboutAuthoritySection({
  brokerName,
  headline,
  bioHtml,
  imageUrl,
  initials,
  authorityNumbers,
}: {
  brokerName: string;
  headline: string | null;
  bioHtml: string;
  imageUrl: string | null;
  initials: string;
  authorityNumbers: AuthorityNumberRow[];
}) {
  const firstName = brokerName.split(" ")[0] || brokerName;
  const sectionHeadline =
    headline?.trim() || "Atendimento imobiliário com estratégia, presença local e clareza em cada decisão.";

  return (
    <section id="bio" className="border-b border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:py-20 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
        <div className="relative mx-auto w-full max-w-[520px] lg:mx-0">
          <div className="absolute -bottom-5 -right-5 h-32 w-32 bg-[var(--stone-gold)]/18" />
          <div className="absolute -left-5 top-12 h-44 w-24 bg-slate-100" />
          <div className="relative aspect-[4/5] overflow-hidden bg-slate-100 shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={brokerName}
                fill
                sizes="(min-width: 1024px) 480px, 90vw"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-950 text-6xl font-light text-white">
                {initials}
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-950/40 to-transparent" />
          </div>
        </div>

        <div>
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[var(--stone-gold)]">Sobre</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-light leading-tight text-slate-950 md:text-5xl">
            {sectionHeadline}
          </h2>

          {bioHtml ? (
            <div
              className="mt-8 max-w-3xl text-lg font-light leading-8 text-slate-600 [&_b]:font-semibold [&_div+div]:mt-4 [&_em]:italic [&_i]:italic [&_li]:my-1.5 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p+p]:mt-4 [&_strong]:font-semibold [&_u]:underline [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6"
              dangerouslySetInnerHTML={{ __html: bioHtml }}
            />
          ) : (
            <p className="mt-8 max-w-3xl text-lg font-light leading-8 text-slate-600">
              Conheça um pouco da minha atuação e dos números que orientam meu atendimento.
            </p>
          )}

          {authorityNumbers.length > 0 ? (
            <div className="mt-12 grid gap-8 border-t border-slate-200 pt-8 text-center sm:grid-cols-3 sm:gap-0">
              {authorityNumbers.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="relative flex min-w-0 flex-col items-center px-4 sm:px-8 [&:not(:last-child)]:sm:after:absolute [&:not(:last-child)]:sm:after:right-0 [&:not(:last-child)]:sm:after:top-0 [&:not(:last-child)]:sm:after:h-full [&:not(:last-child)]:sm:after:w-px [&:not(:last-child)]:sm:after:bg-slate-200"
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-[var(--stone-gold)]">
                    {getAuthorityNumberPublicIcon(item.tipo)}
                  </div>
                  <p className="inline-flex items-start text-4xl font-light leading-none text-slate-950 md:text-5xl">
                    <span className="relative -mr-0.5 top-1 text-[0.5em] leading-none text-[var(--stone-gold)]">
                      +
                    </span>
                    <span>{formatAuthorityNumberPublicValue(item.valor)}</span>
                  </p>
                  <p className="mt-3 w-full text-center text-sm font-light leading-6 text-slate-600 sm:whitespace-nowrap">
                    {getAuthorityNumberPublicLabel(item.tipo)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-10 text-sm font-light text-slate-500">
              {firstName} ainda está organizando seus números de autoridade.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function getAuthorityNumberPublicIcon(type: AuthorityNumberRow["tipo"]) {
  if (type === "VGV_NEGOCIADO") return <ChartLineUp size={18} />;
  if (type === "CLIENTES_ATENDIDOS") return <UsersThree size={18} />;
  if (type === "ANOS_CARREIRA") return <Clock size={18} />;
  return <HouseLine size={18} />;
}

function getAuthorityNumberPublicLabel(type: AuthorityNumberRow["tipo"]) {
  if (type === "VGV_NEGOCIADO") return "Em VGV negociado";
  if (type === "CLIENTES_ATENDIDOS") return "Clientes atendidos";
  if (type === "ANOS_CARREIRA") return "Anos de carreira";
  return "Imóveis comercializados";
}

function formatAuthorityNumberPublicValue(value: string) {
  return value.replace(/\+/g, "").trim();
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

async function getPublicAuthorityNumbers(ownerId: string): Promise<AuthorityNumberRow[]> {
  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("profile_authority_numbers")
    .select(AUTHORITY_NUMBER_SELECT)
    .eq("owner_id", ownerId)
    .eq("visivel", true)
    .order("ordem", { ascending: true })
    .limit(3);

  if (result.error) {
    throw new Error(`Erro ao carregar numeros de autoridade: ${result.error.message}`);
  }

  return (result.data ?? []) as AuthorityNumberRow[];
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
    .limit(20);

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
    .limit(20);

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
  options: { includeCustom?: boolean } = {},
) {
  const custom = options.includeCustom === false ? "" : profile.frase_impacto?.trim();
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
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--grey-olive)]">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-bold">{title}</h2>
      </div>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="inline-flex w-fit items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
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
