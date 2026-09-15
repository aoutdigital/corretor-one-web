import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import {
  ArrowRight,
  Buildings,
  CalendarBlank,
  Check,
  Elevator,
  HouseLine,
  MapPin,
  Ruler,
  UsersThree,
  WhatsappLogo,
} from "@phosphor-icons/react/dist/ssr";

import { BrokerPublicFooter } from "@/app/[nickname]/_components/broker-public-footer";
import { DevelopmentLeadCard } from "@/app/[nickname]/_components/development-lead-card";
import { DevelopmentTypologiesCarousel, type PublicDevelopmentTypology } from "@/app/[nickname]/_components/development-typologies-carousel";
import { PropertyGallery } from "@/app/[nickname]/_components/property-gallery";
import { PublicBrokerHeader } from "@/app/[nickname]/_components/public-broker-header";
import { LandingPagePublic } from "@/app/[nickname]/_components/landing-page-public";
import { LeadWhatsAppButton } from "@/app/[nickname]/_components/lead-whatsapp-button";
import { LeadVisitScheduleButton } from "@/app/[nickname]/_components/lead-visit-schedule-button";
import { PublicAnalytics } from "@/app/[nickname]/_components/public-analytics";
import { PublicPropertyCard, type PublicPropertyCardImovel } from "@/app/[nickname]/_components/public-property-card";
import type { LandingPageContent } from "@/lib/landing-pages/content";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { parsePublicImageVariants } from "@/lib/media/responsive-image";

type PageProps = {
  params: Promise<{ nickname: string; operacao: string }>;
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
  | "owner_id"
  | "slug_publico"
  | "nome"
  | "resumo_curto"
  | "descricao"
  | "logradouro"
  | "numero"
  | "bairro"
  | "cidade"
  | "estado"
  | "cep"
  | "fase"
  | "estagio_obra"
  | "obra_percentuais"
  | "previsao_entrega_em"
  | "ano_construcao"
  | "n_torres"
  | "n_andares"
  | "n_unidades"
  | "qtd_elevadores"
  | "unidades_por_andar"
  | "unidades_terreo"
  | "unidades_cobertura"
  | "construtora"
  | "incorporadora"
  | "administradora"
  | "caracteristicas"
  | "localizacao_contexto"
  | "lat"
  | "lng"
  | "meta_title"
  | "meta_description"
  | "publicado_em"
>;
type MediaRow = Pick<
  Database["public"]["Tables"]["empreendimento_midia_publica"]["Row"],
  "empreendimento_id" | "indice_publico" | "ordem" | "url" | "variantes"
>;
type DevelopmentVideo = { url: string; title: string | null };
type ImovelRow = PublicPropertyCardImovel;
type ImovelMediaRow = {
  imovel_id: string;
  indice_publico: number;
  ordem: number;
  url: string;
};
type CaracteristicaCatalogoPublicRow = {
  chave: string;
  label_pt: string;
  ativo: boolean;
};
type PublicLandingRow = { id:string; owner_id:string; titulo:string; subtitulo:string|null; slug:string; conteudo_blocos:LandingPageContent; meta_title:string|null; meta_description:string|null; og_image_url:string|null; indexar:boolean; publicado_em:string|null; encerramento_em:string|null };
type LandingQueryResult<T>={data:T|null;error:{message:string}|null};
type LandingQuery<T>=PromiseLike<LandingQueryResult<T>>&{select:(columns:string)=>LandingQuery<T>;eq:(column:string,value:unknown)=>LandingQuery<T>;maybeSingle:()=>PromiseLike<LandingQueryResult<T>>};
type LandingDb={from:<T>(table:string)=>LandingQuery<T>};
type DynamicReadResult<T> = { data: T[] | null; error: { message: string } | null };
type DynamicReadQuery<T> = PromiseLike<DynamicReadResult<T>> & {
  select: (columns: string) => DynamicReadQuery<T>;
  eq: (column: string, value: unknown) => DynamicReadQuery<T>;
  in: (column: string, values: string[]) => DynamicReadQuery<T>;
  order: (column: string, options?: { ascending?: boolean }) => DynamicReadQuery<T>;
};
type DynamicReadDb = { from: <T>(table: string) => DynamicReadQuery<T> };
type FeatureLinkRow = { caracteristica_id: string; destaque: boolean };
type FeatureCatalogRow = { id: string; chave: string; label_pt: string; ativo: boolean };
type DevelopmentTypeRow = { id: string; ordem: number; nome: string | null; torre_nome: string | null; tipologia: string | null; area_privativa: number | null; dormitorios: number | null; suites: number | null; banheiros: number | null; vagas: number | null; qtd_unidades: number | null };
type DevelopmentPlantRow = { id: string; empreendimento_tipo_id: string; midia_id: string; ordem: number; alt: string | null; legenda: string | null };

const PROFILE_SELECT =
  "id,nickname,primeiro_nome,sobrenome,email,telefone,whatsapp,avatar_url,logo_nickname_url,logo_nickname_white_url,creci_uf,creci_numero,creci_sufixo,status";
const EMPREENDIMENTO_SELECT = [
  "id",
  "owner_id",
  "slug_publico",
  "nome",
  "resumo_curto",
  "descricao",
  "logradouro",
  "numero",
  "bairro",
  "cidade",
  "estado",
  "cep",
  "fase",
  "estagio_obra",
  "obra_percentuais",
  "previsao_entrega_em",
  "ano_construcao",
  "n_torres",
  "n_andares",
  "n_unidades",
  "qtd_elevadores",
  "unidades_por_andar",
  "unidades_terreo",
  "unidades_cobertura",
  "construtora",
  "incorporadora",
  "administradora",
  "caracteristicas",
  "localizacao_contexto",
  "lat",
  "lng",
  "meta_title",
  "meta_description",
  "publicado_em",
].join(",");
const IMOVEL_SELECT = [
  "id",
  "slug_publico",
  "titulo",
  "finalidade",
  "tipo_negociacao",
  "tipo",
  "subtipo",
  "bairro_comercial",
  "bairro",
  "cidade",
  "estado",
  "logradouro",
  "numero",
  "cep",
  "endereco_complemento",
  "enderecovisualizacao",
  "ocultar_numero_publico",
  "mostrar_complemento_no_anuncio",
  "empreendimento_id",
  "empreendimento_tipologia_label",
  "empreendimentos(nome,slug_publico)",
  "preco_venda",
  "preco_locacao",
  "condominio",
  "iptu",
  "iptu_periodicidade",
  "area_util",
  "area_total",
  "dormitorios",
  "suites",
  "banheiros",
  "vagas",
  "publicado_em",
].join(",");

const RENDER_PUBLIC_SEGMENT = "/storage/v1/render/image/public/";
const OBJECT_PUBLIC_SEGMENT = "/storage/v1/object/public/";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { nickname, operacao } = await params;
  const landing = await getPublicLandingPageData(nickname, operacao);
  if (landing) {
    const title=landing.page.meta_title||landing.page.titulo; const description=landing.page.meta_description||landing.page.subtitulo||`Fale com ${landing.brokerName} e receba mais informações.`;
    return {title,description,robots:landing.page.indexar?undefined:{index:false,follow:true},alternates:{canonical:`/${landing.profile.nickname}/${landing.page.slug}`},openGraph:{title,description,type:"website",url:`/${landing.profile.nickname}/${landing.page.slug}`,images:landing.page.og_image_url?[landing.page.og_image_url]:undefined}};
  }
  const data = await getEmpreendimentoPageData(nickname, operacao);
  if (!data) return {};

  const title = data.empreendimento.meta_title || `${data.empreendimento.nome} | ${data.brokerName}`;
  const description =
    data.empreendimento.meta_description ||
    data.empreendimento.resumo_curto ||
    `Conheça ${data.empreendimento.nome}, empreendimento acompanhado por ${data.brokerName}.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/${data.profile.nickname}/${data.empreendimento.slug_publico}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/${data.profile.nickname}/${data.empreendimento.slug_publico}`,
    },
  };
}

export default async function PublicEmpreendimentoDetailPage({ params }: PageProps) {
  const { nickname, operacao } = await params;
  const landing = await getPublicLandingPageData(nickname, operacao);
  if (landing) return <><LandingPagePublic pageId={landing.page.id} nickname={landing.profile.nickname ?? nickname} brokerName={landing.brokerName} avatarUrl={getPublicImageUrl(landing.profile.avatar_url)} creci={formatCreci(landing.profile)} content={landing.page.conteudo_blocos}/><footer className="border-t border-stone-200 bg-white px-5 py-8 text-center text-xs text-slate-500"><p>{landing.brokerName} · {formatCreci(landing.profile)}</p><p className="mt-2"><Link href="/privacidade" className="underline">Política de privacidade</Link> · Página criada com Corretor.one</p></footer></>;
  const data = await getEmpreendimentoPageData(nickname, operacao);
  if (!data) notFound();

  const {
    profile,
    empreendimento,
    medias,
    imoveis,
    imovelMediaById,
    brokerName,
    logoUrl,
    avatarUrl,
    initials,
    whatsappHref,
    addressLine,
    facts,
    features,
    featureHighlights,
    typologies,
    locationContext,
    video,
  } = data;
  const heroImages = medias.map((item) => ({
    url: item.url,
    variantes: parsePublicImageVariants(item.variantes),
  }));
  const phaseLabel = formatPhaseLabel(empreendimento.fase);
  const descriptionHtml = sanitizeRichTextHtml(empreendimento.descricao);
  const mapQuery = encodeURIComponent(addressLine);
  const constructionProgress = buildConstructionProgress(empreendimento);

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <PublicAnalytics resourceType="DEVELOPMENT" resourceId={empreendimento.id} />
      <PublicBrokerHeader
        nickname={profile.nickname ?? nickname}
        brokerName={brokerName}
        logoUrl={logoUrl}
        avatarUrl={avatarUrl}
        initials={initials}
        creci={formatCreci(profile)}
      />

      <main>
        <section className="mx-auto grid max-w-7xl gap-7 px-5 pb-12 pt-8 lg:grid-cols-[0.86fr_1.14fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--grey-olive)]">{phaseLabel}</p>
            <h1 className="mt-3 max-w-xl bg-gradient-to-r from-[var(--black)] via-[var(--grey-olive)] to-[var(--blue-slate)] bg-clip-text text-4xl font-bold leading-tight text-transparent md:text-5xl">
              {empreendimento.nome}
            </h1>
            <p className="mt-4 flex items-start gap-2 text-sm font-light leading-6 text-slate-600">
              <MapPin size={18} className="mt-0.5 shrink-0 text-[var(--grey-olive)]" />
              <span>{addressLine}</span>
            </p>
            {empreendimento.resumo_curto ? (
              <p className="mt-6 max-w-xl text-lg font-light leading-8 text-slate-600">
                {empreendimento.resumo_curto}
              </p>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <LeadVisitScheduleButton
                nickname={profile.nickname ?? nickname}
                brokerName={brokerName}
                avatarUrl={avatarUrl}
                creci={formatCreci(profile)}
                empreendimentoId={empreendimento.id}
                empreendimentoTitulo={empreendimento.nome}
                className="inline-flex items-center justify-center gap-3 rounded-lg border border-[var(--grey-olive)] bg-white px-5 py-3 text-sm font-bold text-[var(--grey-olive)] transition hover:bg-[color:rgba(145,139,118,0.08)]"
              >
                <CalendarBlank size={19} />
                Agendar visita
              </LeadVisitScheduleButton>
              {whatsappHref ? (
                <LeadWhatsAppButton
                  nickname={profile.nickname ?? nickname}
                  brokerName={brokerName}
                  avatarUrl={avatarUrl}
                  creci={formatCreci(profile)}
                  empreendimentoId={empreendimento.id}
                  empreendimentoTitulo={empreendimento.nome}
                  label="Iniciar conversa no WhatsApp"
                  className="inline-flex items-center justify-center gap-3 rounded-lg border border-[var(--grey-olive)] bg-white px-5 py-3 text-sm font-bold text-[var(--grey-olive)] transition hover:bg-[color:rgba(145,139,118,0.08)]"
                >
                  <WhatsappLogo size={19} />
                  Iniciar conversa no WhatsApp
                </LeadWhatsAppButton>
              ) : null}
            </div>
          </div>

          <PropertyGallery title={empreendimento.nome} images={heroImages} video={video} />
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-5 pb-16 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="min-w-0 space-y-10">
          <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--grey-olive)]">Empreendimento</p>
            <h2 className="mt-2 text-4xl font-light leading-tight text-slate-950">Dados principais</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {facts.map((fact) => {
                const Icon = fact.icon;
                return (
                  <div key={fact.label} className="flex min-h-24 items-center gap-4 rounded-lg border border-stone-200 bg-stone-50/60 p-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--grey-olive)] shadow-sm">
                      <Icon size={22} />
                    </span>
                    <div>
                      <p className="text-2xl font-light leading-none text-slate-950">{fact.value}</p>
                      <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{fact.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {constructionProgress ? (
            <section className="overflow-hidden rounded-xl border border-stone-200 bg-slate-950 text-white shadow-sm">
              <div className="grid gap-8 p-6 md:p-9 lg:grid-cols-[0.72fr_1.28fr]">
                <div className="flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--grey-olive)]">Evolução da obra</p>
                    <h2 className="mt-3 text-4xl font-light leading-tight">Cada etapa mais perto da entrega.</h2>
                    <p className="mt-4 max-w-md text-base font-light leading-7 text-white/60">
                      Acompanhe o avanço informado para as principais fases da construção.
                    </p>
                  </div>
                  <div className="mt-8 flex items-end gap-3">
                    <strong className="text-6xl font-light leading-none">{constructionProgress.overall}%</strong>
                    <span className="pb-1 text-sm font-medium uppercase tracking-[0.14em] text-white/55">progresso geral</span>
                  </div>
                </div>
                <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                  {constructionProgress.items.map((item) => (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                        <span className="font-light text-white/75">{item.label}</span>
                        <strong className="font-medium text-white">{item.value}%</strong>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-[var(--grey-olive)]" style={{ width: `${item.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {descriptionHtml ? (
            <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm md:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--grey-olive)]">Descrição</p>
              <h2 className="mt-2 text-4xl font-light leading-tight text-slate-950">Sobre o projeto</h2>
              <div
                className="mt-6 max-w-4xl text-lg font-light leading-8 text-slate-600 [&_b]:font-semibold [&_div+div]:mt-3 [&_em]:italic [&_i]:italic [&_li]:my-1.5 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p+p]:mt-3 [&_strong]:font-semibold [&_u]:underline [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6"
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            </section>
          ) : null}

          {typologies.length > 0 ? (
            <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm md:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--grey-olive)]">Tipologias</p>
              <h2 className="mt-2 text-4xl font-light leading-tight text-slate-950">Conheça as plantas disponíveis</h2>
              <p className="mb-7 mt-3 max-w-3xl text-base font-light leading-7 text-slate-600">Navegue uma tipologia por vez e compare áreas, ambientes e configurações.</p>
              <DevelopmentTypologiesCarousel items={typologies} />
            </section>
          ) : null}

          {features.length > 0 || featureHighlights.length > 0 ? (
            <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm md:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--grey-olive)]">Características</p>
              <h2 className="mt-2 text-4xl font-light leading-tight text-slate-950">Estrutura e diferenciais</h2>
              {featureHighlights.length > 0 ? (
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {featureHighlights.map((feature) => (
                    <div key={feature} className="flex items-center gap-3 rounded-lg bg-[color:rgba(145,139,118,0.1)] p-4 text-base font-medium text-slate-900">
                      <Check size={19} weight="bold" className="shrink-0 text-[var(--grey-olive)]" /><span>{feature}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className={`${featureHighlights.length > 0 ? "mt-6 border-t border-stone-200 pt-6" : "mt-7"} grid gap-x-8 gap-y-3 sm:grid-cols-2`}>
                {features.map((feature) => (
                  <p key={feature} className="flex items-start gap-3 text-base font-light leading-7 text-slate-600">
                    <Check size={18} className="mt-1 shrink-0 text-[var(--grey-olive)]" />
                    <span>{feature}</span>
                  </p>
                ))}
              </div>
            </section>
          ) : null}

          <section id="localizacao" className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--grey-olive)]">Localização</p>
            <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="max-w-4xl text-4xl font-light leading-tight text-slate-950">{addressLine}</h2>
                {locationContext.summary ? (
                  <p className="mt-5 max-w-3xl text-lg font-light leading-8 text-slate-600">{locationContext.summary}</p>
                ) : null}
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[var(--grey-olive)]/45 px-5 py-3 text-sm font-semibold text-[var(--grey-olive)] transition hover:bg-[var(--grey-olive)] hover:text-white"
              >
                Abrir mapa
                <ArrowRight size={16} />
              </a>
            </div>

            {locationContext.groups.length > 0 ? (
              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {locationContext.groups.map((group) => (
                  <div key={group.title} className="rounded-lg bg-stone-50 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--grey-olive)]">{group.title}</p>
                    <div className="mt-4 space-y-3">
                      {group.items.map((item) => (
                        <p key={item} className="flex items-start gap-2 text-sm font-light leading-6 text-slate-600">
                          <Check size={15} className="mt-1 shrink-0 text-[var(--grey-olive)]" />
                          {item}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mt-8 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
              <iframe
                title={`Mapa de ${addressLine}`}
                src={`https://maps.google.com/maps?q=${mapQuery}&z=15&output=embed`}
                className="h-[320px] w-full md:h-[380px]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </section>

          <section id="imoveis-disponiveis" className="py-4">
            <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--grey-olive)]">Unidades</p>
                <h2 className="mt-2 text-4xl font-light leading-tight text-slate-950">Imóveis disponíveis neste empreendimento</h2>
                <p className="mt-3 max-w-2xl text-base font-light leading-7 text-slate-600">
                  Veja as opções publicadas por mim dentro deste projeto.
                </p>
              </div>
            </div>

            {imoveis.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {imoveis.map((imovel) => (
                  <PublicPropertyCard
                    key={imovel.id}
                    nickname={profile.nickname ?? nickname}
                    imovel={imovel}
                    imageUrl={imovelMediaById.get(imovel.id) ?? null}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
                <p className="text-2xl font-light text-slate-950">Nenhum imóvel disponível publicado no momento.</p>
                <p className="mt-3 font-light text-slate-600">Me chame para saber quando novas unidades entrarem no ar.</p>
              </div>
            )}
          </section>
          </div>

          <DevelopmentLeadCard
            nickname={profile.nickname ?? nickname}
            developmentId={empreendimento.id}
            title={empreendimento.nome}
            phase={phaseLabel}
            brokerName={brokerName}
            brokerAvatarUrl={avatarUrl}
            brokerCreci={formatCreci(profile)}
            whatsappAvailable={Boolean(whatsappHref)}
          />
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

const getPublicLandingPageData=cache(async function getPublicLandingPageData(rawNickname:string,rawSlug:string){
  const nickname=rawNickname.trim().toLowerCase();const slug=rawSlug.trim().toLowerCase();
  if(!/^[a-z0-9]{1,35}$/.test(nickname)||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return null;
  const supabase=createSupabaseServerClient();const profileResult=await supabase.from("profiles").select(PROFILE_SELECT).eq("nickname",nickname).eq("status","ATIVO").maybeSingle();
  if(profileResult.error||!profileResult.data)return null;
  const db=supabase as unknown as LandingDb;const pageResult=await db.from<PublicLandingRow>("landing_pages").select("id,owner_id,titulo,subtitulo,slug,conteudo_blocos,meta_title,meta_description,og_image_url,indexar,publicado_em,encerramento_em").eq("owner_id",profileResult.data.id).eq("slug",slug).eq("status","PUBLICADO").maybeSingle();
  if(pageResult.error||!pageResult.data)return null;
  const now=Date.now();if(pageResult.data.publicado_em&&new Date(pageResult.data.publicado_em).getTime()>now)return null;if(pageResult.data.encerramento_em&&new Date(pageResult.data.encerramento_em).getTime()<=now)return null;
  const profile=profileResult.data as ProfileRow;return{page:pageResult.data,profile,brokerName:getProfileName(profile)};
});

async function getEmpreendimentoPageData(rawNickname: string, rawSlug: string) {
  const nickname = rawNickname.trim().toLowerCase();
  const slug = rawSlug.trim().toLowerCase();
  if (!/^[a-z0-9]{1,35}$/.test(nickname) || !slug) return null;

  const supabase = createSupabaseServerClient();
  const profileResult = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("nickname", nickname)
    .eq("status", "ATIVO")
    .maybeSingle();

  if (profileResult.error) throw new Error(`Erro ao carregar perfil publico: ${profileResult.error.message}`);
  if (!profileResult.data) return null;

  const profile = profileResult.data as ProfileRow;
  const empreendimentoResult = await supabase
    .from("empreendimentos")
    .select(EMPREENDIMENTO_SELECT)
    .eq("owner_id", profile.id)
    .eq("slug_publico", slug)
    .eq("status", "PUBLICADO")
    .maybeSingle();

  if (empreendimentoResult.error) {
    throw new Error(`Erro ao carregar empreendimento publico: ${empreendimentoResult.error.message}`);
  }
  if (!empreendimentoResult.data) return null;

  const empreendimento = empreendimentoResult.data as unknown as EmpreendimentoRow;
  const admin = createSupabaseAdminClient();
  const [mediaResult, imoveisResult, legacyCaracteristicasLabels, video] = await Promise.all([
    supabase
      .from("empreendimento_midia_publica")
      .select("empreendimento_id,indice_publico,ordem,url,variantes")
      .eq("empreendimento_id", empreendimento.id)
      .order("indice_publico", { ascending: true })
      .order("ordem", { ascending: true }),
    supabase
      .from("imoveis")
      .select(IMOVEL_SELECT)
      .eq("owner_id", profile.id)
      .eq("empreendimento_id", empreendimento.id)
      .eq("status", "PUBLICADO")
      .not("slug_publico", "is", null)
      .order("destaque", { ascending: false })
      .order("publicado_em", { ascending: false }),
    getCaracteristicasCatalogoLabels(empreendimento.caracteristicas ?? []),
    getFirstVideoByEmpreendimentoId(profile.id, empreendimento.id),
  ]);

  if (mediaResult.error) throw new Error(`Erro ao carregar midias do empreendimento: ${mediaResult.error.message}`);
  if (imoveisResult.error) throw new Error(`Erro ao carregar imoveis do empreendimento: ${imoveisResult.error.message}`);
  const featureDb = admin as unknown as DynamicReadDb;
  const tiposResult = await featureDb.from<DevelopmentTypeRow>("empreendimento_tipos")
    .select("id,ordem,nome,torre_nome,tipologia,area_privativa,dormitorios,suites,banheiros,vagas,qtd_unidades")
    .eq("owner_id", profile.id).eq("empreendimento_id", empreendimento.id).order("ordem", { ascending: true });
  if (tiposResult.error) throw new Error(`Erro ao carregar tipologias do empreendimento: ${tiposResult.error.message}`);
  const featureLinksResult = await featureDb.from<FeatureLinkRow>("empreendimento_caracteristicas")
    .select("caracteristica_id,destaque").eq("empreendimento_id", empreendimento.id);
  if (featureLinksResult.error) throw new Error(`Erro ao carregar diferenciais do empreendimento: ${featureLinksResult.error.message}`);
  const featureIds = (featureLinksResult.data ?? []).map((item) => item.caracteristica_id);
  const featureCatalogResult = featureIds.length > 0
    ? await featureDb.from<FeatureCatalogRow>("caracteristicas_catalogo").select("id,chave,label_pt,ativo").in("id", featureIds).eq("ativo", true)
    : { data: [], error: null };
  if (featureCatalogResult.error) throw new Error(`Erro ao carregar catálogo de diferenciais: ${featureCatalogResult.error.message}`);
  const featureCatalog = new Map((featureCatalogResult.data ?? []).map((item) => [item.id, item.label_pt]));
  const highlightedIds = new Set((featureLinksResult.data ?? []).filter((item) => item.destaque).map((item) => item.caracteristica_id));
  const featureHighlights = uniqueStrings(featureIds.filter((id) => highlightedIds.has(id)).map((id) => featureCatalog.get(id) ?? "").filter(Boolean));
  const relationalFeatures = uniqueStrings(featureIds.filter((id) => !highlightedIds.has(id)).map((id) => featureCatalog.get(id) ?? "").filter(Boolean))
    .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
  const legacyFeatures = uniqueStrings((empreendimento.caracteristicas ?? []).map((key) => legacyCaracteristicasLabels.get(key) ?? formatEnumLabel(key) ?? "").filter(Boolean))
    .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));

  const tipoIds = (tiposResult.data ?? []).map((item) => item.id);
  const plantsResult = tipoIds.length > 0
    ? await featureDb.from<DevelopmentPlantRow>("empreendimento_tipos_plantas").select("id,empreendimento_tipo_id,midia_id,ordem,alt,legenda").in("empreendimento_tipo_id", tipoIds).order("ordem", { ascending: true })
    : { data: [], error: null };
  if (plantsResult.error) throw new Error(`Erro ao carregar plantas das tipologias: ${plantsResult.error.message}`);
  const plantsByType = new Map<string, NonNullable<typeof plantsResult.data>>();
  for (const plant of plantsResult.data ?? []) {
    const current = plantsByType.get(plant.empreendimento_tipo_id) ?? [];
    current.push(plant); plantsByType.set(plant.empreendimento_tipo_id, current);
  }
  const typologies: PublicDevelopmentTypology[] = (tiposResult.data ?? []).map((tipo) => ({
    id: tipo.id,
    name: tipo.nome || tipo.tipologia || "Tipologia",
    tower: tipo.torre_nome,
    typology: tipo.tipologia,
    area: tipo.area_privativa == null ? null : String(tipo.area_privativa).replace(".", ","),
    bedrooms: tipo.dormitorios,
    suites: tipo.suites,
    bathrooms: tipo.banheiros,
    parkingSpaces: tipo.vagas,
    units: tipo.qtd_unidades,
    plants: (plantsByType.get(tipo.id) ?? []).map((plant) => ({
      id: plant.id,
      url: `/api/public/empreendimentos/${empreendimento.id}/tipologias/${tipo.id}/plantas/${plant.midia_id}`,
      alt: plant.alt || `Planta de ${tipo.nome || tipo.tipologia || "tipologia"}`,
      caption: plant.legenda,
    })),
  }));

  const imoveis = (imoveisResult.data ?? []) as unknown as ImovelRow[];
  const imovelMediaById = await getFirstMediaByImovelId(imoveis.map((item) => item.id));
  const brokerName = getProfileName(profile);
  const logoUrl = getPublicImageUrl(profile.logo_nickname_url || profile.logo_nickname_white_url);
  const avatarUrl = getPublicImageUrl(profile.avatar_url);
  const addressLine = buildAddressLine(empreendimento);

  return {
    profile,
    empreendimento,
    medias: ((mediaResult.data ?? []) as MediaRow[]).map((item) => ({
      ...item,
      url: getPublicImageUrl(item.url) ?? item.url,
    })),
    imoveis,
    imovelMediaById,
    brokerName,
    logoUrl,
    avatarUrl,
    initials: getInitials(brokerName),
    whatsappHref: buildWhatsAppHref(profile.whatsapp || profile.telefone, empreendimento.nome),
    phoneHref: buildPhoneHref(profile.telefone),
    addressLine,
    facts: buildFacts(empreendimento),
    features: relationalFeatures.length > 0 || featureHighlights.length > 0
      ? relationalFeatures
      : legacyFeatures,
    featureHighlights,
    typologies,
    locationContext: buildLocationContext(empreendimento.localizacao_contexto),
    video,
  };
}

async function getFirstVideoByEmpreendimentoId(ownerId: string, empreendimentoId: string): Promise<DevelopmentVideo | null> {
  const admin = createSupabaseAdminClient();
  const result = await admin
    .from("midia_relacoes")
    .select("ordem,created_at,midia:midia_id(id,url,titulo,tipo)")
    .eq("owner_id", ownerId)
    .eq("ref_tipo", "EMPREENDIMENTO")
    .eq("ref_id", empreendimentoId)
    .eq("grupo", "YOUTUBE")
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });

  if (result.error) throw new Error(`Erro ao carregar vídeos do empreendimento: ${result.error.message}`);
  for (const row of result.data ?? []) {
    const media = row.midia as { tipo?: unknown; url?: unknown; titulo?: unknown } | null;
    if (media?.tipo !== "VIDEO" || typeof media.url !== "string") continue;
    const url = normalizeYouTubeVideoUrl(media.url);
    if (!url) continue;
    return {
      url,
      title: typeof media.titulo === "string" && media.titulo.trim() ? media.titulo.trim() : null,
    };
  }
  return null;
}

function normalizeYouTubeVideoUrl(value: string) {
  try {
    const parsed = new URL(value.trim());
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const videoId = host === "youtu.be"
      ? parsed.pathname.split("/").filter(Boolean)[0]
      : parsed.pathname === "/watch"
        ? parsed.searchParams.get("v")
        : parsed.pathname.startsWith("/shorts/") || parsed.pathname.startsWith("/embed/")
          ? parsed.pathname.split("/")[2]
          : null;
    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
  } catch {
    return null;
  }
}

async function getFirstMediaByImovelId(imovelIds: string[]) {
  const mediaById = new Map<string, string>();
  if (imovelIds.length === 0) return mediaById;

  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("imovel_midia_publica")
    .select("imovel_id,indice_publico,ordem,url")
    .in("imovel_id", imovelIds);

  if (result.error) throw new Error(`Erro ao carregar midias de imoveis: ${result.error.message}`);

  const rows = ((result.data ?? []) as ImovelMediaRow[]).sort((a, b) => {
    if (a.imovel_id !== b.imovel_id) return a.imovel_id.localeCompare(b.imovel_id);
    if (a.indice_publico !== b.indice_publico) return a.indice_publico - b.indice_publico;
    return a.ordem - b.ordem;
  });

  for (const row of rows) {
    if (!mediaById.has(row.imovel_id)) mediaById.set(row.imovel_id, getPublicImageUrl(row.url) ?? row.url);
  }

  return mediaById;
}

async function getCaracteristicasCatalogoLabels(chaves: string[]) {
  const normalized = uniqueStrings(chaves);
  const labels = new Map<string, string>();
  if (normalized.length === 0) return labels;

  const supabaseAdmin = createSupabaseAdminClient() as unknown as {
    from: (table: "caracteristicas_catalogo") => {
      select: (columns: string) => {
        in: (column: "chave", values: string[]) => {
          eq: (
            column: "ativo",
            value: boolean,
          ) => Promise<{ data: CaracteristicaCatalogoPublicRow[] | null; error: { message: string } | null }>;
        };
      };
    };
  };

  const result = await supabaseAdmin
    .from("caracteristicas_catalogo")
    .select("chave,label_pt,ativo")
    .in("chave", normalized)
    .eq("ativo", true);

  if (result.error) throw new Error(`Erro ao carregar catalogo de caracteristicas: ${result.error.message}`);

  for (const item of result.data ?? []) {
    if (item.chave && item.label_pt) labels.set(item.chave, item.label_pt);
  }

  return labels;
}

function buildFacts(empreendimento: EmpreendimentoRow) {
  return [
    { icon: Buildings, label: "Fase", value: formatPhaseLabel(empreendimento.fase) },
    empreendimento.estagio_obra
      ? { icon: HouseLine, label: "Obra", value: formatEnumLabel(empreendimento.estagio_obra) ?? "" }
      : null,
    empreendimento.previsao_entrega_em
      ? { icon: CalendarBlank, label: "Entrega", value: formatMonthYear(empreendimento.previsao_entrega_em) }
      : null,
    empreendimento.ano_construcao
      ? { icon: CalendarBlank, label: "Ano", value: String(empreendimento.ano_construcao) }
      : null,
    empreendimento.n_unidades ? { icon: UsersThree, label: "Unidades", value: formatCount(empreendimento.n_unidades) } : null,
    empreendimento.n_torres ? { icon: Buildings, label: "Torres", value: formatCount(empreendimento.n_torres) } : null,
    empreendimento.n_andares ? { icon: Buildings, label: "Andares", value: formatCount(empreendimento.n_andares) } : null,
    empreendimento.qtd_elevadores ? { icon: Elevator, label: "Elevadores", value: formatCount(empreendimento.qtd_elevadores) } : null,
    empreendimento.unidades_por_andar
      ? { icon: Ruler, label: "Unid./andar", value: formatCount(empreendimento.unidades_por_andar) }
      : null,
    empreendimento.unidades_terreo
      ? { icon: HouseLine, label: "Térreo", value: formatCount(empreendimento.unidades_terreo) }
      : null,
    empreendimento.unidades_cobertura
      ? { icon: HouseLine, label: "Coberturas", value: formatCount(empreendimento.unidades_cobertura) }
      : null,
    empreendimento.construtora ? { icon: Buildings, label: "Construtora", value: empreendimento.construtora } : null,
    empreendimento.incorporadora ? { icon: Buildings, label: "Incorporadora", value: empreendimento.incorporadora } : null,
    empreendimento.administradora ? { icon: Buildings, label: "Administradora", value: empreendimento.administradora } : null,
  ].filter((item): item is { icon: typeof Buildings; label: string; value: string } => Boolean(item?.value));
}

function buildConstructionProgress(empreendimento: EmpreendimentoRow) {
  if (empreendimento.fase !== "EM_CONSTRUCAO") return null;
  const source = empreendimento.obra_percentuais;
  if (!source || typeof source !== "object" || Array.isArray(source)) return null;

  const fields = [
    ["fundacao", "Fundação"],
    ["estrutura", "Estrutura"],
    ["alvenaria", "Alvenaria"],
    ["instalacoes", "Instalações"],
    ["revInterno", "Revestimento interno"],
    ["revExterno", "Revestimento externo"],
    ["piso", "Pisos"],
    ["pintura", "Pintura"],
    ["paisagismo", "Paisagismo"],
  ] as const;
  const values = source as Record<string, unknown>;
  const items = fields.map(([key, label]) => {
    const rawValue = typeof values[key] === "number" ? values[key] : Number(values[key]);
    return { label, value: Number.isFinite(rawValue) ? Math.max(0, Math.min(100, Math.round(rawValue))) : 0 };
  });
  if (!items.some((item) => item.value > 0)) return null;
  return {
    items,
    overall: Math.round(items.reduce((total, item) => total + item.value, 0) / items.length),
  };
}

function buildLocationContext(value: unknown) {
  const data = asRecord(value);
  const groups = [
    { title: "Região", items: readLabelArray(data.perfil_regiao) },
    { title: "Mobilidade", items: readLabelArray(data.mobilidade) },
    { title: "Comércio e serviços", items: readLabelArray(data.comercio_servicos) },
    { title: "Lazer", items: readLabelArray(data.lazer_estilo_vida) },
  ].filter((group) => group.items.length > 0);

  return {
    summary: typeof data.resumo_local === "string" && data.resumo_local.trim() ? data.resumo_local.trim() : null,
    groups,
  };
}

function buildAddressLine(
  empreendimento: Pick<EmpreendimentoRow, "logradouro" | "numero" | "bairro" | "cidade" | "estado">,
) {
  const street = [empreendimento.logradouro, empreendimento.numero].filter(Boolean).join(", ");
  return [street, empreendimento.bairro, `${empreendimento.cidade}/${empreendimento.estado}`].filter(Boolean).join(" - ");
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

function buildWhatsAppHref(value: string | null, empreendimentoName: string) {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (digits.length < 10) return null;
  const message = encodeURIComponent(`Olá, quero saber mais sobre o empreendimento ${empreendimentoName}.`);
  return `https://wa.me/${digits}?text=${message}`;
}

function buildPhoneHref(value: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  const localDigits = digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;
  if (localDigits.length < 10) return null;
  return `tel:0${localDigits}`;
}

function formatCount(value: number) {
  return value > 0 && value < 10 ? `0${value}` : String(value);
}

function formatMonthYear(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
}

function formatPhaseLabel(value: string | null) {
  if (value === "NA_PLANTA") return "Na planta";
  if (value === "EM_CONSTRUCAO") return "Em construção";
  if (value === "ENTREGUE") return "Entregue";
  return formatEnumLabel(value) || "Empreendimento";
}

function formatEnumLabel(value: string | null | undefined) {
  if (!value) return null;
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readLabelArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return uniqueStrings(value.map(stringEnumLabel).filter(Boolean) as string[]);
}

function stringEnumLabel(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  return formatEnumLabel(value.trim());
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function sanitizeRichTextHtml(value: string | null) {
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
