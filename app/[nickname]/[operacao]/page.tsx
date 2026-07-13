import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
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
} from "@phosphor-icons/react/dist/ssr";

import { BrokerPublicFooter } from "@/app/[nickname]/_components/broker-public-footer";
import { PropertyGallery } from "@/app/[nickname]/_components/property-gallery";
import { PublicBrokerHeader } from "@/app/[nickname]/_components/public-broker-header";
import { PublicPropertyCard, type PublicPropertyCardImovel } from "@/app/[nickname]/_components/public-property-card";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

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
  "empreendimento_id" | "indice_publico" | "ordem" | "url"
>;
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
    phoneHref,
    addressLine,
    facts,
    features,
    locationContext,
  } = data;
  const heroImages = medias.map((item) => ({ url: item.url }));
  const phaseLabel = formatPhaseLabel(empreendimento.fase);
  const descriptionHtml = sanitizeRichTextHtml(empreendimento.descricao);
  const mapQuery = encodeURIComponent(addressLine);

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
              <a
                href="#imoveis-disponiveis"
                className="inline-flex items-center justify-center gap-3 rounded-lg border border-[var(--grey-olive)] bg-white px-5 py-3 text-sm font-bold text-[var(--grey-olive)] transition hover:bg-[color:rgba(145,139,118,0.08)]"
              >
                <HouseLine size={19} />
                Ver imóveis disponíveis
              </a>
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  className="inline-flex items-center justify-center gap-3 rounded-lg border border-[var(--grey-olive)] bg-white px-5 py-3 text-sm font-bold text-[var(--grey-olive)] transition hover:bg-[color:rgba(145,139,118,0.08)]"
                >
                  Falar sobre o empreendimento
                  <ArrowRight size={18} />
                </a>
              ) : null}
            </div>
          </div>

          <PropertyGallery title={empreendimento.nome} images={heroImages} />
        </section>

        <section className="mx-auto max-w-7xl space-y-10 px-5 pb-16">
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

          {features.length > 0 ? (
            <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm md:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--grey-olive)]">Características</p>
              <h2 className="mt-2 text-4xl font-light leading-tight text-slate-950">Estrutura e diferenciais</h2>
              <div className="mt-7 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
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
  const [mediaResult, imoveisResult, caracteristicasLabels] = await Promise.all([
    supabase
      .from("empreendimento_midia_publica")
      .select("empreendimento_id,indice_publico,ordem,url")
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
  ]);

  if (mediaResult.error) throw new Error(`Erro ao carregar midias do empreendimento: ${mediaResult.error.message}`);
  if (imoveisResult.error) throw new Error(`Erro ao carregar imoveis do empreendimento: ${imoveisResult.error.message}`);

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
    features: uniqueStrings(
      (empreendimento.caracteristicas ?? [])
        .map((chave) => caracteristicasLabels.get(chave) ?? formatEnumLabel(chave))
        .filter(Boolean) as string[],
    ),
    locationContext: buildLocationContext(empreendimento.localizacao_contexto),
  };
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
