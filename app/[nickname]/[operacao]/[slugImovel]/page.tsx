import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Bathtub,
  Bed,
  CalendarBlank,
  Car,
  HouseLine,
  MapPin,
  Ruler,
  WhatsappLogo,
} from "@phosphor-icons/react/dist/ssr";

import { PropertyGallery } from "@/app/[nickname]/_components/property-gallery";
import { PropertyInsights, type PropertyInsightsData } from "@/app/[nickname]/_components/property-insights";
import { PropertyLeadCard } from "@/app/[nickname]/_components/property-lead-card";
import { buildImovelHeaderTitle } from "@/lib/imoveis/display-title";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type PageProps = {
  params: Promise<{ nickname: string; operacao: string; slugImovel: string }>;
};

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ImovelTableRow = Database["public"]["Tables"]["imoveis"]["Row"];
type EmpreendimentoTableRow = Database["public"]["Tables"]["empreendimentos"]["Row"];
type AmbienteTableRow = Database["public"]["Tables"]["imovel_ambientes"]["Row"];
type MediaRow = Pick<
  Database["public"]["Tables"]["imovel_midia_publica"]["Row"],
  "imovel_id" | "indice_publico" | "ordem" | "url"
>;
type EmpreendimentoMediaRow = Pick<
  Database["public"]["Tables"]["empreendimento_midia_publica"]["Row"],
  "empreendimento_id" | "indice_publico" | "ordem" | "url"
>;
type PublicAmbiente = Pick<AmbienteTableRow, "id" | "tipo_ambiente" | "ordem" | "principal" | "area_m2" | "dados">;
type CaracteristicaCatalogoPublicRow = {
  chave: string;
  label_pt: string;
  ativo: boolean;
};
type PropertyVideo = {
  url: string;
  title: string | null;
};

type PublicProfile = Pick<
  ProfileRow,
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
>;

type PublicImovel = Pick<
  ImovelTableRow,
  | "id"
  | "owner_id"
  | "slug_publico"
  | "titulo"
  | "codigo"
  | "finalidade"
  | "tipo_negociacao"
  | "tipo"
  | "subtipo"
  | "descricao"
  | "descricao_curta"
  | "empreendimento_id"
  | "cozinhas"
  | "cidade"
  | "bairro"
  | "bairro_comercial"
  | "estado"
  | "logradouro"
  | "numero"
  | "endereco_complemento"
  | "enderecovisualizacao"
  | "ocultar_numero_publico"
  | "mostrar_complemento_no_anuncio"
  | "localizacao_contexto"
  | "preco_venda"
  | "preco_locacao"
  | "condominio"
  | "iptu"
  | "iptu_periodicidade"
  | "valor_m2"
  | "area_util"
  | "area_total"
  | "area_terreno"
  | "dormitorios"
  | "suites"
  | "banheiros"
  | "lavabos"
  | "salas"
  | "vagas"
  | "vaga_tamanhos"
  | "vaga_coberturas"
  | "vaga_tipos"
  | "andar"
  | "mostrar_andar_no_anuncio"
  | "ano_construcao"
  | "caracteristicas"
  | "estado_conservacao"
  | "vista"
  | "financiavel"
  | "aceita_permuta"
  | "permite_visita_imediata"
  | "usar_caracteristicas_empreendimento"
  | "lat"
  | "lng"
  | "status"
  | "destaque"
  | "publicado_em"
>;
type PublicEmpreendimento = Pick<
  EmpreendimentoTableRow,
  | "id"
  | "nome"
  | "slug_publico"
  | "status"
  | "descricao"
  | "resumo_curto"
  | "caracteristicas"
  | "logradouro"
  | "numero"
  | "bairro"
  | "cidade"
  | "estado"
  | "fase"
  | "ano_construcao"
  | "n_torres"
  | "n_andares"
  | "n_unidades"
  | "qtd_elevadores"
  | "unidades_por_andar"
  | "construtora"
  | "incorporadora"
  | "localizacao_contexto"
>;

const PROFILE_SELECT = [
  "id",
  "nickname",
  "primeiro_nome",
  "sobrenome",
  "email",
  "telefone",
  "whatsapp",
  "avatar_url",
  "logo_nickname_url",
  "logo_nickname_white_url",
  "creci_uf",
  "creci_numero",
  "creci_sufixo",
].join(",");

const IMOVEL_SELECT = [
  "id",
  "owner_id",
  "slug_publico",
  "titulo",
  "codigo",
  "finalidade",
  "tipo_negociacao",
  "tipo",
  "subtipo",
  "descricao",
  "descricao_curta",
  "empreendimento_id",
  "cozinhas",
  "cidade",
  "bairro",
  "bairro_comercial",
  "estado",
  "logradouro",
  "numero",
  "endereco_complemento",
  "enderecovisualizacao",
  "ocultar_numero_publico",
  "mostrar_complemento_no_anuncio",
  "localizacao_contexto",
  "preco_venda",
  "preco_locacao",
  "condominio",
  "iptu",
  "iptu_periodicidade",
  "valor_m2",
  "area_util",
  "area_total",
  "area_terreno",
  "dormitorios",
  "suites",
  "banheiros",
  "lavabos",
  "salas",
  "vagas",
  "vaga_tamanhos",
  "vaga_coberturas",
  "vaga_tipos",
  "andar",
  "mostrar_andar_no_anuncio",
  "ano_construcao",
  "caracteristicas",
  "estado_conservacao",
  "vista",
  "financiavel",
  "aceita_permuta",
  "permite_visita_imediata",
  "usar_caracteristicas_empreendimento",
  "lat",
  "lng",
  "status",
  "destaque",
  "publicado_em",
].join(",");

const RENDER_PUBLIC_SEGMENT = "/storage/v1/render/image/public/";
const OBJECT_PUBLIC_SEGMENT = "/storage/v1/object/public/";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const compactNumberFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { nickname, operacao, slugImovel } = await params;
  const data = await getPropertyPageData(nickname, operacao, slugImovel);
  if (!data) return {};

  return {
    title: `${data.title} | ${data.brokerName}`,
    description: data.imovel.descricao_curta || data.locationLine || `Imóvel anunciado por ${data.brokerName}`,
  };
}

export default async function PublicPropertyDetailPage({ params }: PageProps) {
  const { nickname, operacao, slugImovel } = await params;
  const data = await getPropertyPageData(nickname, operacao, slugImovel);
  if (!data) notFound();

  const {
    profile,
    imovel,
    medias,
    related,
    empreendimento,
    empreendimentoImages,
    ambientes,
    brokerName,
    title,
    price,
    operationLabel,
    locationLine,
    addressLine,
    whatsappHref,
    phoneHref,
  } = data;
  const heroImages = medias.map((item) => ({ url: item.url }));
  const stats = buildStats(imovel);
  const heroCosts = buildHeroCosts(imovel);
  const heroPrice = buildHeroPrice(imovel);
  const highlights = buildHighlights(imovel, data.caracteristicasLabels);
  const heroLocationLine = buildHeroLocationLine(addressLine, locationLine);
  const mapQuery = encodeURIComponent(addressLine || locationLine || `${imovel.bairro}, ${imovel.cidade}, ${imovel.estado}`);
  const insights = buildPropertyInsightsData({
    imovel,
    ambientes,
    empreendimento,
    empreendimentoImages,
    nickname: profile.nickname ?? nickname,
    addressLine,
    locationLine,
    stats,
    highlights,
    mapQuery,
    caracteristicasLabels: data.caracteristicasLabels,
  });

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link href={`/${profile.nickname}`} className="flex items-center gap-3">
            {profile.logo_nickname_url ? (
              <Image
                src={profile.logo_nickname_url}
                alt={brokerName}
                width={150}
                height={44}
                className="h-10 w-auto object-contain"
                unoptimized
              />
            ) : (
              <span className="text-xl font-bold tracking-tight">{brokerName}</span>
            )}
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-light text-slate-600 md:flex">
            <a href="#descricao" className="transition hover:text-[var(--primary-scarlet)]">
              Descrição
            </a>
            <a href="#localizacao" className="transition hover:text-[var(--primary-scarlet)]">
              Localização
            </a>
            <a href="#relacionados" className="transition hover:text-[var(--primary-scarlet)]">
              Relacionados
            </a>
          </nav>
          {whatsappHref ? (
            <a
              href={whatsappHref}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-bold text-white transition hover:brightness-95"
            >
              Falar agora
              <ArrowRight size={16} />
            </a>
          ) : null}
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-7 px-5 pb-12 pt-8 lg:grid-cols-[0.86fr_1.14fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--grey-olive)]">{operationLabel}</p>
            <h1 className="mt-3 max-w-xl bg-gradient-to-r from-[var(--black)] via-[var(--grey-olive)] to-[var(--blue-slate)] bg-clip-text text-4xl font-bold leading-tight text-transparent md:text-5xl">
              {title}
            </h1>
            <p className="mt-4 flex items-start gap-2 text-sm font-light leading-6 text-slate-600">
              <MapPin size={18} className="mt-0.5 shrink-0 text-[var(--grey-olive)]" />
              <span>
                Localizado na {heroLocationLine}
                {empreendimento ? (
                  <>
                    {" | "}
                    <Link
                      href={`/${profile.nickname ?? nickname}/${empreendimento.slug_publico}`}
                      className="font-bold text-[var(--blue-slate)] underline decoration-[var(--grey-olive)] decoration-2 underline-offset-4 transition hover:text-[var(--black)]"
                    >
                      {empreendimento.nome}
                    </Link>
                  </>
                ) : null}
              </span>
            </p>
            <div className="mt-8">
              <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
                <p className="text-3xl font-light leading-none text-[var(--black)]">{operationLabel}</p>
                <p className="flex items-start text-[var(--black)]">
                  {heroPrice.currency ? (
                    <span className="relative top-[11px] text-xl font-light leading-none">{heroPrice.currency} </span>
                  ) : null}
                  <span className="text-5xl font-light leading-none tracking-normal md:text-[3.4rem]">
                    {heroPrice.value}
                  </span>
                </p>
              </div>
              {heroCosts.length > 0 ? (
                <div className="mt-3 flex flex-wrap items-end gap-x-7 gap-y-2 text-[var(--blue-slate)]">
                  {heroCosts.map((cost) => (
                    <p key={cost.label} className="flex items-start leading-none">
                      <span className="mr-1 text-lg font-light leading-none">{cost.label}:</span>
                      <span className="relative top-[4px] text-xs font-light leading-none">R$ </span>
                      <span className="text-lg font-light leading-none">{cost.value}</span>
                      <span className="relative top-[5px] ml-1 text-xs font-light leading-none">{cost.period}</span>
                    </p>
                  ))}
                </div>
              ) : null}
              {imovel.codigo ? (
                <p className="mt-3 text-sm font-bold uppercase tracking-[0.12em] text-[var(--grey-olive)]">
                  REF.: {imovel.codigo}
                </p>
              ) : null}
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#atendimento-imovel"
                  className="inline-flex items-center justify-center gap-3 rounded-lg border border-[var(--grey-olive)] bg-white px-5 py-3 text-sm font-bold text-[var(--grey-olive)] transition hover:bg-[color:rgba(145,139,118,0.08)]"
                >
                  <CalendarBlank size={19} />
                  Agendar visita
                </a>
                {whatsappHref ? (
                  <a
                    href={whatsappHref}
                    className="inline-flex items-center justify-center gap-3 rounded-lg border border-[var(--grey-olive)] bg-white px-5 py-3 text-sm font-bold text-[var(--grey-olive)] transition hover:bg-[color:rgba(145,139,118,0.08)]"
                  >
                    <WhatsappLogo size={19} />
                    Iniciar conversa no WhatsApp
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <PropertyGallery title={title} images={heroImages} video={data.video} />
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-5 pb-16 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="space-y-8">
            <PropertyInsights data={insights} />

            {related.length > 0 ? (
              <section id="relacionados" className="py-4">
                <div className="grid gap-5 md:grid-cols-[220px_1fr]">
                  <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
                    <p className="text-2xl font-bold leading-tight text-amber-800">Imóveis Relacionados</p>
                    <p className="mt-3 text-sm font-light leading-6 text-slate-600">
                      Outras opções próximas ao perfil deste imóvel.
                    </p>
                  </div>
                  <div className="grid gap-4">
                    {related.map((item) => (
                      <RelatedPropertyCard
                        key={item.id}
                        nickname={profile.nickname ?? nickname}
                        imovel={item}
                      />
                    ))}
                  </div>
                </div>
              </section>
            ) : null}
          </div>

          <PropertyLeadCard
            nickname={profile.nickname ?? nickname}
            slugImovel={imovel.slug_publico ?? slugImovel}
            title={title}
            operationLabel={operationLabel}
            price={price}
            carryingCosts={heroCosts}
            brokerName={brokerName}
            brokerAvatarUrl={getPublicImageUrl(profile.avatar_url)}
            whatsappHref={whatsappHref}
            phoneHref={phoneHref}
          />
        </section>

        <section className="border-y border-stone-200 bg-white px-5 py-14">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary-scarlet)]">
              Ainda pesquisando?
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950">
              Este {formatEnumLabel(imovel.tipo)?.toLowerCase()} não é exatamente o que você procura?
            </h2>
            <p className="mt-4 font-light leading-7 text-slate-600">
              Envie seu momento para {brokerName} e receba uma seleção mais alinhada ao que você precisa.
            </p>
            <a
              href={`/${profile.nickname ?? nickname}#contato-form`}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-amber-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-amber-800"
            >
              Pedir curadoria
              <ArrowRight size={18} />
            </a>
          </div>
        </section>
      </main>

      <footer className="bg-slate-950 px-5 py-10 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-bold">{brokerName}</p>
            <p className="mt-1 font-light text-white/62">{formatCreci(profile)}</p>
          </div>
          <Link href={`/${profile.nickname ?? nickname}`} className="font-bold text-white/80 transition hover:text-white">
            Ver perfil do corretor
          </Link>
        </div>
      </footer>
    </div>
  );
}

async function getPropertyPageData(rawNickname: string, rawOperation: string, rawSlug: string) {
  const nickname = rawNickname.trim().toLowerCase();
  const operation = rawOperation.trim().toLowerCase();
  const slug = rawSlug.trim().toLowerCase();

  if (!/^[a-z0-9]{1,35}$/.test(nickname)) return null;
  if (operation !== "venda" && operation !== "aluguel") return null;
  if (!slug) return null;

  const supabase = createSupabaseServerClient();
  const profileResult = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("nickname", nickname)
    .eq("status", "ATIVO")
    .maybeSingle();

  if (profileResult.error) {
    throw new Error(`Erro ao carregar perfil publico: ${profileResult.error.message}`);
  }

  if (!profileResult.data) return null;
  const profile = profileResult.data as unknown as PublicProfile;

  const imovelResult = await supabase
    .from("imoveis")
    .select(IMOVEL_SELECT)
    .eq("owner_id", profile.id)
    .eq("slug_publico", slug)
    .eq("status", "PUBLICADO")
    .maybeSingle();

  if (imovelResult.error) {
    throw new Error(`Erro ao carregar imovel publico: ${imovelResult.error.message}`);
  }

  if (!imovelResult.data) return null;
  const imovel = imovelResult.data as unknown as PublicImovel;
  if (!matchesOperation(imovel, operation)) return null;

  const [mediaResult, relatedResult, empreendimentoResult] = await Promise.all([
    supabase
      .from("imovel_midia_publica")
      .select("imovel_id,indice_publico,ordem,url")
      .eq("imovel_id", imovel.id),
    supabase
      .from("imoveis")
      .select(IMOVEL_SELECT)
      .eq("owner_id", profile.id)
      .eq("status", "PUBLICADO")
      .neq("id", imovel.id)
      .not("slug_publico", "is", null)
      .order("destaque", { ascending: false })
      .order("publicado_em", { ascending: false })
      .limit(5),
    imovel.empreendimento_id
      ? supabase
          .from("empreendimentos")
          .select(
            [
              "id",
              "nome",
              "slug_publico",
              "status",
              "descricao",
              "resumo_curto",
              "caracteristicas",
              "logradouro",
              "numero",
              "bairro",
              "cidade",
              "estado",
              "fase",
              "ano_construcao",
              "n_torres",
              "n_andares",
              "n_unidades",
              "qtd_elevadores",
              "unidades_por_andar",
              "construtora",
              "incorporadora",
              "localizacao_contexto",
            ].join(","),
          )
          .eq("owner_id", profile.id)
          .eq("id", imovel.empreendimento_id)
          .eq("status", "PUBLICADO")
          .not("slug_publico", "is", null)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (mediaResult.error) {
    throw new Error(`Erro ao carregar midias do imovel: ${mediaResult.error.message}`);
  }

  if (relatedResult.error) {
    throw new Error(`Erro ao carregar imoveis relacionados: ${relatedResult.error.message}`);
  }

  if (empreendimentoResult.error) {
    throw new Error(`Erro ao carregar empreendimento do imovel: ${empreendimentoResult.error.message}`);
  }

  const relatedRows = ((relatedResult.data ?? []) as unknown as PublicImovel[]).filter((item) => matchesOperation(item, operation));
  const empreendimento = empreendimentoResult.data as unknown as PublicEmpreendimento | null;
  const publicEmpreendimento = empreendimento?.slug_publico ? empreendimento : null;
  const [relatedMedia, video, ambientes, empreendimentoMedia, caracteristicasLabels] = await Promise.all([
    getFirstMediaByImovelId(relatedRows.map((item) => item.id)),
    getFirstVideoByImovelId(profile.id, imovel.id),
    getAmbientesByImovelId(profile.id, imovel.id),
    publicEmpreendimento ? getEmpreendimentoMediaById(publicEmpreendimento.id) : Promise.resolve([]),
    getCaracteristicasCatalogoLabels([...(imovel.caracteristicas ?? []), ...(publicEmpreendimento?.caracteristicas ?? [])]),
  ]);
  const title = buildImovelHeaderTitle(imovel);
  const brokerName = [profile.primeiro_nome, profile.sobrenome].filter(Boolean).join(" ") || "Corretor.one";

  return {
    profile,
    imovel,
    empreendimento: publicEmpreendimento,
    empreendimentoImages: sortMediaRows(empreendimentoMedia).map((item) => ({
      url: getPublicImageUrl(item.url) ?? item.url,
    })),
    ambientes,
    caracteristicasLabels,
    medias: sortMediaRows((mediaResult.data ?? []) as MediaRow[]).map((item) => ({
      ...item,
      url: getPublicImageUrl(item.url) ?? item.url,
    })),
    video,
    related: relatedRows.map((item) => ({
      ...item,
      capa_url: getPublicImageUrl(relatedMedia.get(item.id)?.url),
    })),
    brokerName,
    title,
    price: formatPrice(imovel),
    operationLabel: operation === "aluguel" ? "Aluguel" : "Venda",
    locationLine: buildLocationLine(imovel),
    addressLine: buildAddressLine(imovel),
    whatsappHref: buildWhatsAppHref(profile.whatsapp || profile.telefone, title),
    phoneHref: buildPhoneHref(profile.telefone),
  };
}

async function getFirstMediaByImovelId(imovelIds: string[]) {
  const mediaById = new Map<string, MediaRow>();
  if (imovelIds.length === 0) return mediaById;

  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("imovel_midia_publica")
    .select("imovel_id,indice_publico,ordem,url")
    .in("imovel_id", imovelIds);

  if (result.error) {
    throw new Error(`Erro ao carregar midias relacionadas: ${result.error.message}`);
  }

  for (const row of sortMediaRows(result.data ?? [])) {
    if (!mediaById.has(row.imovel_id)) mediaById.set(row.imovel_id, row);
  }

  return mediaById;
}

async function getEmpreendimentoMediaById(empreendimentoId: string): Promise<EmpreendimentoMediaRow[]> {
  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("empreendimento_midia_publica")
    .select("empreendimento_id,indice_publico,ordem,url")
    .eq("empreendimento_id", empreendimentoId)
    .order("indice_publico", { ascending: true })
    .order("ordem", { ascending: true })
    .limit(12);

  if (result.error) {
    throw new Error(`Erro ao carregar midias do empreendimento: ${result.error.message}`);
  }

  return (result.data ?? []) as EmpreendimentoMediaRow[];
}

async function getAmbientesByImovelId(ownerId: string, imovelId: string): Promise<PublicAmbiente[]> {
  const supabaseAdmin = createSupabaseAdminClient();
  const result = await supabaseAdmin
    .from("imovel_ambientes")
    .select("id,tipo_ambiente,ordem,principal,area_m2,dados")
    .eq("owner_id", ownerId)
    .eq("imovel_id", imovelId)
    .order("tipo_ambiente", { ascending: true })
    .order("ordem", { ascending: true });

  if (result.error) {
    throw new Error(`Erro ao carregar ambientes do imovel: ${result.error.message}`);
  }

  return (result.data ?? []) as PublicAmbiente[];
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

  if (result.error) {
    throw new Error(`Erro ao carregar catalogo de caracteristicas: ${result.error.message}`);
  }

  for (const item of result.data ?? []) {
    if (item.chave && item.label_pt) labels.set(item.chave, item.label_pt);
  }

  return labels;
}

async function getFirstVideoByImovelId(ownerId: string, imovelId: string): Promise<PropertyVideo | null> {
  const supabaseAdmin = createSupabaseAdminClient();
  const result = await supabaseAdmin
    .from("midia_relacoes")
    .select("ordem,created_at,midia:midia_id(id,url,titulo,tipo)")
    .eq("owner_id", ownerId)
    .eq("ref_tipo", "IMOVEL")
    .eq("ref_id", imovelId)
    .eq("grupo", "YOUTUBE")
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });

  if (result.error) {
    throw new Error(`Erro ao carregar videos do imovel: ${result.error.message}`);
  }

  return getFirstYoutubeVideo(result.data);
}

function matchesOperation(imovel: Pick<PublicImovel, "tipo_negociacao" | "finalidade">, operation: string) {
  const negotiation = imovel.tipo_negociacao;
  if (operation === "aluguel") return negotiation === "ALUGUEL" || negotiation === "VENDA_E_ALUGUEL" || imovel.finalidade === "ALUGAR";
  return negotiation === "VENDA" || negotiation === "VENDA_E_ALUGUEL" || imovel.finalidade === "COMPRAR";
}

function sortMediaRows<T extends { indice_publico: number; ordem: number }>(rows: T[]) {
  return rows.sort((a, b) => {
    if (a.indice_publico !== b.indice_publico) return a.indice_publico - b.indice_publico;
    return a.ordem - b.ordem;
  });
}

function getFirstYoutubeVideo(rows: unknown): PropertyVideo | null {
  if (!Array.isArray(rows)) return null;

  for (const row of rows) {
    const media = (row as { midia?: unknown }).midia;
    if (!media || typeof media !== "object") continue;
    const item = media as { tipo?: unknown; url?: unknown; titulo?: unknown };
    if (item.tipo !== "VIDEO" || typeof item.url !== "string") continue;
    const url = normalizeYouTubeUrl(item.url);
    if (!url) continue;

    return {
      url,
      title: typeof item.titulo === "string" && item.titulo.trim() ? item.titulo.trim() : null,
    };
  }

  return null;
}

function normalizeYouTubeUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  let videoId: string | null = null;

  if (host === "youtu.be") {
    videoId = parsed.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (parsed.pathname === "/watch") {
      videoId = parsed.searchParams.get("v");
    } else if (parsed.pathname.startsWith("/shorts/") || parsed.pathname.startsWith("/embed/")) {
      videoId = parsed.pathname.split("/")[2] ?? null;
    }
  }

  if (!videoId) return null;
  return `https://www.youtube.com/watch?v=${videoId}`;
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

function formatPrice(imovel: Pick<PublicImovel, "tipo_negociacao" | "preco_venda" | "preco_locacao">) {
  if (imovel.tipo_negociacao === "ALUGUEL" && imovel.preco_locacao) {
    return `${currencyFormatter.format(imovel.preco_locacao)}/mês`;
  }
  if (imovel.preco_venda) return currencyFormatter.format(imovel.preco_venda);
  if (imovel.preco_locacao) return `${currencyFormatter.format(imovel.preco_locacao)}/mês`;
  return "Consulte valores";
}

function buildHeroPrice(imovel: Pick<PublicImovel, "tipo_negociacao" | "preco_venda" | "preco_locacao">) {
  const rawValue = imovel.tipo_negociacao === "ALUGUEL" ? imovel.preco_locacao : imovel.preco_venda || imovel.preco_locacao;
  if (!rawValue) return { currency: null, value: "Consulte valores" };

  return {
    currency: "R$",
    value: compactNumberFormatter.format(rawValue),
  };
}

function formatCreci(profile: Pick<PublicProfile, "creci_uf" | "creci_numero" | "creci_sufixo">) {
  if (!profile.creci_uf || !profile.creci_numero) return "CRECI em verificação";
  return `CRECI ${profile.creci_uf} ${profile.creci_numero}-${profile.creci_sufixo || "F"}`;
}

function formatNumber(value: number | null) {
  if (value == null || !Number.isFinite(value)) return null;
  return compactNumberFormatter.format(value);
}

function formatEnumLabel(value: string | null) {
  if (!value) return null;
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildLocationLine(imovel: Pick<PublicImovel, "bairro_comercial" | "bairro" | "cidade" | "estado">) {
  return [imovel.bairro_comercial || imovel.bairro, `${imovel.cidade}/${imovel.estado}`].filter(Boolean).join(" - ");
}

function buildAddressLine(
  imovel: Pick<
    PublicImovel,
    | "enderecovisualizacao"
    | "logradouro"
    | "numero"
    | "endereco_complemento"
    | "mostrar_complemento_no_anuncio"
    | "ocultar_numero_publico"
    | "bairro_comercial"
    | "bairro"
    | "cidade"
    | "estado"
  >,
) {
  const bairro = imovel.bairro_comercial || imovel.bairro;
  const cityState = `${imovel.cidade}/${imovel.estado}`;

  if (imovel.enderecovisualizacao === "END_BAIRRO") return [bairro, cityState].filter(Boolean).join(" - ");

  const shouldShowNumber = imovel.enderecovisualizacao === "END_COMPLETO" && !imovel.ocultar_numero_publico;
  const street = [imovel.logradouro, shouldShowNumber ? imovel.numero : null].filter(Boolean).join(", ");
  const complement =
    imovel.enderecovisualizacao === "END_COMPLETO" && imovel.mostrar_complemento_no_anuncio
      ? imovel.endereco_complemento
      : null;

  return [street, complement, bairro, cityState].filter(Boolean).join(" - ");
}

function buildHeroLocationLine(addressLine: string, locationLine: string) {
  return addressLine || locationLine;
}

function buildStats(imovel: PublicImovel) {
  const stats = [
    buildAreaStat(imovel),
    imovel.dormitorios
      ? buildMetricStat(<Bed size={20} />, "bed", imovel.dormitorios, "dormitório", "dormitórios")
      : null,
    imovel.suites
      ? buildMetricStat(<Bed size={20} />, "bed", imovel.suites, "suíte", "suítes")
      : null,
    imovel.banheiros
      ? buildMetricStat(<Bathtub size={20} />, "bath", imovel.banheiros, "banheiro", "banheiros")
      : null,
    imovel.vagas
      ? buildMetricStat(<Car size={20} />, "car", imovel.vagas, "vaga", "vagas", {
          detailItems: buildParkingDetails(imovel),
        })
      : null,
  ];

  return stats.filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function buildMetricStat(
  icon: React.ReactNode,
  iconKey: PropertyInsightsData["stats"][number]["iconKey"],
  amount: number,
  singularLabel: string,
  pluralLabel: string,
  options?: {
    detail?: string | null;
    detailItems?: string[];
    secondary?: { label: string; value: string; unit: string | null } | null;
  },
) {
  return {
    icon,
    iconKey,
    label: amount === 1 ? singularLabel : pluralLabel,
    value: formatCount(amount),
    unit: null,
    detail: options?.detail ?? null,
    detailItems: options?.detailItems ?? [],
    secondary: options?.secondary ?? null,
  };
}

function formatCount(value: number) {
  return value > 0 && value < 10 ? `0${value}` : String(value);
}

function buildAreaStat(imovel: Pick<PublicImovel, "area_util" | "area_total">) {
  const usableArea = formatNumber(imovel.area_util);
  const totalArea = formatNumber(imovel.area_total);
  if (!usableArea && !totalArea) return null;

  const areasAreEqual = imovel.area_util != null && imovel.area_total != null && imovel.area_util === imovel.area_total;
  if (areasAreEqual) {
    return {
      icon: <Ruler size={20} />,
      iconKey: "area" as const,
      label: "área útil e total",
      value: usableArea ?? totalArea ?? "",
      unit: "m²",
      detail: null,
      detailItems: [],
      secondary: null,
    };
  }

  if (usableArea && totalArea) {
    return {
      icon: <Ruler size={20} />,
      iconKey: "area" as const,
      label: "úteis",
      value: usableArea,
      unit: "m²",
      detail: null,
      detailItems: [],
      secondary: { label: "totais", value: totalArea, unit: "m²" },
    };
  }

  return {
    icon: <Ruler size={20} />,
    iconKey: "area" as const,
    label: usableArea ? "área útil" : "área total",
    value: usableArea ?? totalArea ?? "",
    unit: "m²",
    detail: null,
    detailItems: [],
    secondary: null,
  };
}

function buildHeroCosts(imovel: PublicImovel) {
  return [
    imovel.condominio
      ? {
          label: "Cond.",
          value: compactNumberFormatter.format(imovel.condominio),
          period: "/mês",
        }
      : null,
    imovel.iptu
      ? {
          label: "IPTU",
          value: compactNumberFormatter.format(imovel.iptu),
          period: imovel.iptu_periodicidade === "MENSAL" ? "/mês" : "/ano",
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function buildParkingDetails(
  imovel: Pick<PublicImovel, "vaga_tipos" | "vaga_tamanhos" | "vaga_coberturas">,
) {
  const labels = [
    ...formatParkingArray(imovel.vaga_tipos, VAGA_TIPO_LABELS),
    ...formatParkingArray(imovel.vaga_tamanhos, VAGA_TAMANHO_LABELS),
    ...formatParkingArray(imovel.vaga_coberturas, VAGA_COBERTURA_LABELS),
  ];

  return uniqueStrings(labels);
}

const VAGA_TIPO_LABELS: Record<string, string> = {
  PRIVATIVA: "Privativa",
  LIVRE: "Livre",
  DEMARCADA: "Demarcada",
};

const VAGA_TAMANHO_LABELS: Record<string, string> = {
  PEQUENA: "Pequena",
  MEDIA: "Média",
  GRANDE: "Grande",
};

const VAGA_COBERTURA_LABELS: Record<string, string> = {
  COBERTA: "Coberta",
  DESCOBERTA: "Descoberta",
};

function formatParkingArray(values: string[] | null, labels: Record<string, string>) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => labels[value] ?? formatEnumLabel(value)).filter(Boolean) as string[];
}

function buildHighlights(imovel: PublicImovel, caracteristicasLabels: Map<string, string>) {
  const flags = [
    imovel.financiavel ? "Aceita financiamento" : null,
    imovel.aceita_permuta ? "Estuda permuta" : null,
    imovel.permite_visita_imediata ? "Permite visita imediata" : null,
    imovel.andar && imovel.mostrar_andar_no_anuncio ? `${imovel.andar}º andar` : null,
    imovel.ano_construcao ? `Construção ${imovel.ano_construcao}` : null,
    imovel.estado_conservacao ? `Estado ${formatEnumLabel(imovel.estado_conservacao)?.toLowerCase()}` : null,
    imovel.vista ? `Vista ${formatEnumLabel(imovel.vista)?.toLowerCase()}` : null,
    ...((imovel.caracteristicas ?? [])
      .map((chave) => caracteristicasLabels.get(chave) ?? formatEnumLabel(chave))
      .filter(Boolean) as string[]),
  ];

  return flags.filter((item): item is string => Boolean(item));
}

function buildPropertyInsightsData({
  imovel,
  ambientes,
  empreendimento,
  empreendimentoImages,
  nickname,
  addressLine,
  locationLine,
  stats,
  highlights,
  mapQuery,
  caracteristicasLabels,
}: {
  imovel: PublicImovel;
  ambientes: PublicAmbiente[];
  empreendimento: PublicEmpreendimento | null;
  empreendimentoImages: Array<{ url: string }>;
  nickname: string;
  addressLine: string;
  locationLine: string;
  stats: ReturnType<typeof buildStats>;
  highlights: string[];
  mapQuery: string;
  caracteristicasLabels: Map<string, string>;
}): PropertyInsightsData {
  const locationContext = buildLocationContext(imovel.localizacao_contexto);
  const empreendimentoContext = empreendimento ? buildLocationContext(empreendimento.localizacao_contexto) : null;
  const locationGroups =
    locationContext.groups.length > 0 ? locationContext.groups : empreendimentoContext?.groups ?? [];
  const mainStats: Array<PropertyInsightsData["stats"][number] | null> = [
    ...stats.map((stat) => ({
      label: stat.label,
      value: stat.value,
      unit: stat.unit,
      detail: stat.detail,
      detailItems: stat.detailItems,
      iconKey: stat.iconKey,
      secondary: stat.secondary,
    })),
    imovel.salas ? buildMetricStat(null, "living", imovel.salas, "sala", "salas") : null,
    imovel.cozinhas ? buildMetricStat(null, "kitchen", imovel.cozinhas, "cozinha", "cozinhas") : null,
    imovel.lavabos ? buildMetricStat(null, "bath", imovel.lavabos, "lavabo", "lavabos") : null,
    imovel.area_terreno
      ? {
          label: "m² terreno",
          value: formatNumber(imovel.area_terreno) ?? "",
          unit: null,
          detail: null,
          detailItems: [],
          iconKey: "area",
          secondary: null,
        }
      : null,
  ];

  return {
    stats: mainStats
      .filter((item): item is PropertyInsightsData["stats"][number] => Boolean(item?.value))
      .slice(0, 8),
    ambientes: buildAmbienteInsights(ambientes).slice(0, 6),
    features: uniqueStrings(highlights),
    description: {
      short: imovel.descricao_curta,
      html: sanitizeRichTextHtml(imovel.descricao) || "<p>Fale com o corretor para receber mais detalhes deste imóvel.</p>",
    },
    location: {
      address: addressLine || locationLine,
      summary: locationContext.summary ?? empreendimentoContext?.summary ?? null,
      groups: locationGroups.slice(0, 4),
      mapQuery,
    },
    empreendimento: empreendimento?.slug_publico
      ? {
          name: empreendimento.nome,
          href: `/${nickname}/${empreendimento.slug_publico}`,
          images: empreendimentoImages,
          summary: empreendimento.resumo_curto,
          descriptionHtml: sanitizeRichTextHtml(empreendimento.descricao),
          facts: buildEmpreendimentoFacts(empreendimento),
          features:
            imovel.usar_caracteristicas_empreendimento === false
              ? []
              : uniqueStrings(
                  (empreendimento.caracteristicas ?? [])
                    .map((chave) => caracteristicasLabels.get(chave) ?? formatEnumLabel(chave))
                    .filter(Boolean) as string[],
                ).slice(0, 14),
        }
      : null,
  };
}

function buildAmbienteInsights(ambientes: PublicAmbiente[]): PropertyInsightsData["ambientes"] {
  const counters = new Map<PublicAmbiente["tipo_ambiente"], number>();

  return ambientes.map((ambiente) => {
    const current = (counters.get(ambiente.tipo_ambiente) ?? 0) + 1;
    counters.set(ambiente.tipo_ambiente, current);
    const data = asRecord(ambiente.dados);
    const title = buildAmbienteTitle(ambiente, current, data);
    const subtitle = buildAmbienteSubtitle(ambiente.tipo_ambiente, data);
    const tags = buildAmbienteTags(ambiente.tipo_ambiente, data);

    return {
      id: ambiente.id,
      title,
      subtitle,
      area: ambiente.area_m2 ? `${formatNumber(ambiente.area_m2)} m²` : null,
      tags,
    };
  });
}

function buildAmbienteTitle(
  ambiente: Pick<PublicAmbiente, "tipo_ambiente" | "principal">,
  index: number,
  data: Record<string, unknown>,
) {
  if (ambiente.tipo_ambiente === "DORMITORIO") {
    if (data.suite_principal === true || ambiente.principal) return "Suíte principal";
    if (data.eh_suite === true) return `Suíte ${index}`;
    return `Dormitório ${index}`;
  }
  if (ambiente.tipo_ambiente === "COZINHA") return index > 1 ? `Cozinha ${index}` : "Cozinha";
  if (ambiente.tipo_ambiente === "SALA") {
    if (ambiente.principal) return "Sala principal";
    return index > 1 ? `Sala ${index}` : "Sala";
  }
  return index > 1 ? `Varanda ${index}` : "Varanda";
}

function buildAmbienteSubtitle(tipo: PublicAmbiente["tipo_ambiente"], data: Record<string, unknown>) {
  if (tipo === "COZINHA") return stringEnumLabel(data.tipo_cozinha);
  if (tipo === "SALA") return [stringEnumLabel(data.tipo_sala), stringEnumLabel(data.layout)].filter(Boolean).join(" · ") || null;
  if (tipo === "VARANDA") return stringEnumLabel(data.tipo_varanda);
  return stringEnumLabel(data.tipo_piso);
}

function buildAmbienteTags(tipo: PublicAmbiente["tipo_ambiente"], data: Record<string, unknown>) {
  const tags: string[] = [];
  const add = (condition: boolean, label: string) => {
    if (condition) tags.push(label);
  };

  if (tipo === "DORMITORIO") {
    add(data.closet === true, "Closet");
    add(data.armarios_planejados === true, "Armários planejados");
    add(data.ar_condicionado === true, "Ar-condicionado");
    add(data.tem_varanda === true, "Varanda");
    add(data.banheiro_pia_dupla === true, "Pia dupla");
    add(data.banheiro_box === true, "Box");
  }

  if (tipo === "COZINHA") {
    add(data.armarios_planejados === true, "Armários planejados");
    add(data.bancada === true || Boolean(data.tipo_bancada), "Bancada");
    add(data.fogao === true, "Fogão");
    add(data.forno === true, "Forno");
    add(data.geladeira === true, "Geladeira");
  }

  if (tipo === "SALA") {
    add(Boolean(data.layout), stringEnumLabel(data.layout) ?? "");
    const diferenciais = Array.isArray(data.diferenciais) ? data.diferenciais : [];
    for (const diferencial of diferenciais) {
      const label = stringEnumLabel(diferencial);
      if (label) tags.push(label);
    }
  }

  if (tipo === "VARANDA") {
    add(Boolean(data.churrasqueira_tipo), "Churrasqueira");
    add(data.fechada_com_vidro === true, "Fechada com vidro");
    add(data.bancada === true, "Bancada");
    add(data.ilha === true, "Ilha");
    add(data.fogao === true, "Fogão");
    add(data.frigobar === true, "Frigobar");
    add(data.chopeira === true, "Chopeira");
  }

  const piso = stringEnumLabel(data.tipo_piso);
  if (piso) tags.push(piso);

  return uniqueStrings(tags.filter(Boolean)).slice(0, 5);
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

function buildEmpreendimentoFacts(empreendimento: PublicEmpreendimento) {
  return [
    empreendimento.fase ? { label: "Fase", value: formatEnumLabel(empreendimento.fase) ?? "" } : null,
    empreendimento.ano_construcao ? { label: "Ano", value: String(empreendimento.ano_construcao) } : null,
    empreendimento.n_torres ? { label: "Torres", value: String(empreendimento.n_torres) } : null,
    empreendimento.n_andares ? { label: "Andares", value: String(empreendimento.n_andares) } : null,
    empreendimento.n_unidades ? { label: "Unidades", value: String(empreendimento.n_unidades) } : null,
    empreendimento.qtd_elevadores ? { label: "Elevadores", value: String(empreendimento.qtd_elevadores) } : null,
    empreendimento.unidades_por_andar ? { label: "Unid./andar", value: String(empreendimento.unidades_por_andar) } : null,
    empreendimento.construtora ? { label: "Construtora", value: empreendimento.construtora } : null,
    empreendimento.incorporadora ? { label: "Incorporadora", value: empreendimento.incorporadora } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item?.value));
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

function buildWhatsAppHref(value: string | null, title: string) {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (digits.length < 10) return null;
  const message = encodeURIComponent(`Olá, tenho interesse neste imóvel: ${title}`);
  return `https://wa.me/${digits}?text=${message}`;
}

function buildPhoneHref(value: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  const localDigits = digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;
  if (localDigits.length < 10) return null;
  return `tel:0${localDigits}`;
}

function getImovelHref(nickname: string, imovel: Pick<PublicImovel, "tipo_negociacao" | "slug_publico">) {
  const operation = imovel.tipo_negociacao === "ALUGUEL" ? "aluguel" : "venda";
  return `/${nickname}/${operation}/${imovel.slug_publico}`;
}

function RelatedPropertyCard({
  nickname,
  imovel,
}: {
  nickname: string;
  imovel: PublicImovel & { capa_url: string | null };
}) {
  const title = buildImovelHeaderTitle(imovel);
  const href = getImovelHref(nickname, imovel);
  const stats = buildStats(imovel).slice(0, 3);

  return (
    <Link
      href={href}
      className="grid gap-4 rounded-lg border border-stone-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:grid-cols-[180px_1fr]"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-stone-200 sm:aspect-auto">
        {imovel.capa_url ? (
          <Image src={imovel.capa_url} alt={title} fill sizes="180px" className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full min-h-[130px] items-center justify-center text-stone-400">
            <HouseLine size={28} />
          </div>
        )}
      </div>
      <div className="min-w-0 py-1">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">{formatEnumLabel(imovel.tipo)}</p>
        <h3 className="mt-1 line-clamp-2 font-bold leading-snug text-slate-950">{title}</h3>
        <p className="mt-2 flex items-center gap-1 text-sm font-light text-slate-500">
          <MapPin size={15} />
          {buildLocationLine(imovel)}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
          {stats.map((stat) => (
            <span key={stat.label} className="rounded-full bg-stone-100 px-2 py-1">
              {stat.value} {stat.label}
            </span>
          ))}
        </div>
        <p className="mt-3 text-lg font-bold text-[var(--primary-scarlet)]">{formatPrice(imovel)}</p>
      </div>
    </Link>
  );
}
