import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, FunnelSimple, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { BrokerPublicFooter } from "../../_components/broker-public-footer";
import { PublicPropertyCard } from "../../_components/public-property-card";
import { SocialProofCarousel, type SocialProofItem } from "../../_components/social-proof-carousel";
import { PropertyFilterPanel } from "./property-filter-panel";

type PageProps = {
  nickname: string;
  searchParams?: Record<string, string | string[] | undefined>;
  seoSlug?: string;
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
type ImovelRow = Pick<
  Database["public"]["Tables"]["imoveis"]["Row"],
  | "id"
  | "slug_publico"
  | "titulo"
  | "finalidade"
  | "tipo_negociacao"
  | "tipo"
  | "subtipo"
  | "bairro_comercial"
  | "bairro"
  | "cidade"
  | "estado"
  | "logradouro"
  | "numero"
  | "cep"
  | "endereco_complemento"
  | "enderecovisualizacao"
  | "ocultar_numero_publico"
  | "mostrar_complemento_no_anuncio"
  | "empreendimento_id"
  | "empreendimento_tipologia_label"
  | "preco_venda"
  | "preco_locacao"
  | "condominio"
  | "iptu"
  | "iptu_periodicidade"
  | "area_util"
  | "area_total"
  | "dormitorios"
  | "suites"
  | "banheiros"
  | "vagas"
  | "publicado_em"
> & {
  empreendimentos?: Pick<Database["public"]["Tables"]["empreendimentos"]["Row"], "nome" | "slug_publico"> | null;
};
type ImovelTipo = NonNullable<ImovelRow["tipo"]>;
type FilterOptionRow = Pick<ImovelRow, "tipo" | "bairro" | "cidade" | "estado" | "tipo_negociacao" | "finalidade">;
type MediaRow = {
  imovel_id: string;
  indice_publico: number;
  ordem: number;
  url: string;
};
type SocialProofTableRow = Database["public"]["Tables"]["provas_sociais"]["Row"];
type SocialProofRow = Pick<
  SocialProofTableRow,
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
const PROFILE_SELECT =
  "id,nickname,primeiro_nome,sobrenome,email,telefone,whatsapp,avatar_url,imagem_capa_url,logo_nickname_url,logo_nickname_white_url,creci_uf,creci_numero,creci_sufixo,status";
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

const FILTER_OPTIONS_SELECT = "tipo,bairro,cidade,estado,tipo_negociacao,finalidade";
const SOCIAL_PROOF_SELECT = [
  "id",
  "tipo",
  "titulo",
  "descricao",
  "depoimento",
  "cliente_nome_publico",
  "localidade",
  "data_momento",
  "imagem_url",
  "imagem_alt",
  "destaque",
  "ordem",
  "publicado_em",
].join(",");

const RENDER_PUBLIC_SEGMENT = "/storage/v1/render/image/public/";
const OBJECT_PUBLIC_SEGMENT = "/storage/v1/object/public/";

type PropertyListFilters = {
  busca: string;
  operacao: "venda" | "aluguel";
  tipos: ImovelTipo[];
  cidade: string;
  bairro: string;
  dormitorios: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas: number | null;
  precoMin: number | null;
  precoMax: number | null;
  condominioMax: number | null;
  iptuMax: number | null;
  areaMin: number | null;
  areaMax: number | null;
  ordenar: "recentes" | "menor-preco" | "maior-preco" | "maior-area";
};

const IMOVEL_TIPOS = [
  "APARTAMENTO",
  "CASA",
  "CASA_DE_CONDOMINIO",
  "CASA_DE_VILA",
  "COBERTURA",
  "CASA_COMERCIAL",
  "ESCRITORIO",
  "FAZENDA_SITIO_CHACARA",
  "FLAT",
  "GALPAO_DEPOSITO_ARMAZEM",
  "GARAGEM",
  "KITNET_CONJUGADO",
  "HOTEL_MOTEL_POUSADA",
  "LOFT",
  "LOTE_TERRENO",
  "SHOPPING",
  "PONTO_COMERCIAL_LOJA_BOX",
  "PREDIO_EDIFICIO_INTEIRO",
  "SELF_STORAGE",
  "STUDIO",
] as const satisfies readonly ImovelTipo[];

const SEO_TIPO_SLUGS = new Map<string, ImovelTipo>([
  ["apartamento", "APARTAMENTO"],
  ["apartamentos", "APARTAMENTO"],
  ["casa", "CASA"],
  ["casas", "CASA"],
  ["casa-de-condominio", "CASA_DE_CONDOMINIO"],
  ["casas-de-condominio", "CASA_DE_CONDOMINIO"],
  ["casa-de-vila", "CASA_DE_VILA"],
  ["casa-comercial", "CASA_COMERCIAL"],
  ["casas-comerciais", "CASA_COMERCIAL"],
  ["cobertura", "COBERTURA"],
  ["coberturas", "COBERTURA"],
  ["studio", "STUDIO"],
  ["studios", "STUDIO"],
  ["loft", "LOFT"],
  ["lofts", "LOFT"],
  ["flat", "FLAT"],
  ["flats", "FLAT"],
  ["fazenda-sitio-chacara", "FAZENDA_SITIO_CHACARA"],
  ["galpao-deposito-armazem", "GALPAO_DEPOSITO_ARMAZEM"],
  ["garagem", "GARAGEM"],
  ["kitnet", "KITNET_CONJUGADO"],
  ["kitnet-conjugado", "KITNET_CONJUGADO"],
  ["hotel-motel-pousada", "HOTEL_MOTEL_POUSADA"],
  ["escritorio", "ESCRITORIO"],
  ["escritorios", "ESCRITORIO"],
  ["sala-comercial", "ESCRITORIO"],
  ["loja", "PONTO_COMERCIAL_LOJA_BOX"],
  ["lojas", "PONTO_COMERCIAL_LOJA_BOX"],
  ["terreno", "LOTE_TERRENO"],
  ["terrenos", "LOTE_TERRENO"],
  ["predio-edificio-inteiro", "PREDIO_EDIFICIO_INTEIRO"],
  ["self-storage", "SELF_STORAGE"],
]);

const SEO_CITY_SLUGS = new Map<string, string>([
  ["sao-paulo", "São Paulo"],
  ["rio-de-janeiro", "Rio de Janeiro"],
  ["belo-horizonte", "Belo Horizonte"],
  ["porto-alegre", "Porto Alegre"],
  ["curitiba", "Curitiba"],
  ["campinas", "Campinas"],
  ["santos", "Santos"],
  ["guarulhos", "Guarulhos"],
  ["barueri", "Barueri"],
  ["osasco", "Osasco"],
  ["santo-andre", "Santo André"],
  ["sao-bernardo-do-campo", "São Bernardo do Campo"],
  ["sao-caetano-do-sul", "São Caetano do Sul"],
]);

type SeoSearchIntent = {
  slug: string;
  operacao?: "venda" | "aluguel";
  tipo?: ImovelTipo;
  cidade?: string;
  bairro?: string;
  dormitorios?: number;
  canonicalPath?: string;
};

export async function generatePropertiesMetadata({ nickname, searchParams, seoSlug }: PageProps): Promise<Metadata> {
  const profile = await getProfile(nickname);
  if (!profile) return { title: "Imóveis | Corretor.one" };
  const seoIntent = parseSeoSlug(seoSlug);
  const filters = parseFilters(searchParams, seoIntent);
  const brokerName = getProfileName(profile);
  const title = buildSeoTitle(brokerName, filters, seoIntent);
  const description = buildSeoDescription(brokerName, filters, seoIntent);
  const canonical = seoIntent?.canonicalPath
    ? `/${profile.nickname}/imoveis/${seoIntent.canonicalPath}`
    : `/${profile.nickname}/imoveis`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
    },
  };
}

export async function PublicPropertiesPage({ nickname, searchParams, seoSlug }: PageProps) {
  const query = searchParams;
  const profile = await getProfile(nickname);
  if (!profile) notFound();

  const seoIntent = parseSeoSlug(seoSlug);
  const filters = parseFilters(query, seoIntent);
  const [imoveis, filterOptions, socialProofs] = await Promise.all([
    getPublishedImoveis(profile.id, filters),
    getFilterOptions(profile.id, filters.operacao),
    getPublishedSocialProofs(profile.id),
  ]);
  const mediaById = await getMediaMap(imoveis.map((item) => item.id));
  const brokerName = getProfileName(profile);
  const logoUrl = getPublicImageUrl(profile.logo_nickname_url || profile.logo_nickname_white_url);
  const avatarUrl = getPublicImageUrl(profile.avatar_url);
  const coverUrl = getPublicImageUrl(profile.imagem_capa_url);
  const activeFilterCount = countActiveFilters(filters);
  const heading = buildHeading(filters, seoIntent);
  const subheading = buildSubheading(filters, brokerName);
  const isSearchView = Boolean(seoSlug || activeFilterCount > 0);
  const firstResultImageUrl = imoveis[0] ? mediaById.get(imoveis[0].id) ?? null : null;
  const heroImageUrl = isSearchView && firstResultImageUrl ? firstResultImageUrl : coverUrl || firstResultImageUrl;
  const initials = getInitials(brokerName);
  const profilePath = `/${profile.nickname ?? nickname}`;
  const breadcrumbItems = buildBreadcrumbItems(profilePath, profile.nickname ?? nickname, filters);
  const whatsappHref = buildWhatsAppHref(profile.whatsapp || profile.telefone, "Olá, quero conversar sobre os seus imóveis.");
  const phoneHref = buildPhoneHref(profile.telefone);
  const clearHref = seoIntent?.canonicalPath
    ? `/${profile.nickname ?? nickname}/imoveis/${seoIntent.canonicalPath}`
    : `/${profile.nickname ?? nickname}/imoveis?operacao=${filters.operacao}`;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link href={profilePath} aria-label={brokerName} className="min-w-0">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={brokerName}
                width={260}
                height={90}
                className="h-10 w-auto max-w-[190px] object-contain md:max-w-[250px]"
                priority
                unoptimized
              />
            ) : (
              <span className="block truncate text-lg font-bold text-slate-950 md:text-xl">{brokerName}</span>
            )}
          </Link>
          <nav className="hidden items-center gap-1 text-sm font-light text-slate-600 lg:flex">
            <Link className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-950" href={profilePath}>
              Home
            </Link>
            <Link className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-950" href={`${profilePath}/imoveis/venda`}>
              Venda
            </Link>
            <Link className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-950" href={`${profilePath}/imoveis/aluguel`}>
              Locação
            </Link>
            <Link className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-950" href={`${profilePath}/anuncie`}>
              Anunciar
            </Link>
            <Link className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-950" href={`${profilePath}/empreendimentos`}>
              Empreendimentos
            </Link>
            <Link className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-950" href={`${profilePath}#contato`}>
              Contato
            </Link>
          </nav>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href={`${profilePath}#contato`}
              className="hidden items-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-bold text-white transition hover:brightness-95 sm:inline-flex"
            >
              Falar agora
              <ArrowRight size={16} />
            </Link>
            <Link
              href={profilePath}
              aria-label={`Perfil de ${brokerName}`}
              className="relative h-11 w-11 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-slate-700 shadow-sm"
            >
              {avatarUrl ? (
                <Image src={avatarUrl} alt={brokerName} fill sizes="44px" className="object-cover" priority unoptimized />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-sm font-bold">{initials}</span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-stone-200 bg-slate-950 px-5 py-20 text-white md:py-28">
          {heroImageUrl ? (
            <Image
              src={heroImageUrl}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
              priority
              unoptimized
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/86 to-slate-950/42" />
          <div className="absolute inset-0 bg-slate-950/18" />
          <div className="relative mx-auto max-w-7xl">
            <Breadcrumb items={breadcrumbItems} />
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--grey-olive)]">Meus imóveis</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-light leading-tight md:text-6xl">
              {heading}
            </h1>
            <p className="mt-5 max-w-2xl text-lg font-light leading-relaxed text-white/70">
              {subheading}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-12">
          <form method="get" action={`/${profile.nickname ?? nickname}/imoveis/buscar`} className="grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-[88px] lg:self-start">
              <PropertyFilterPanel
                nickname={profile.nickname ?? nickname}
                filters={filters}
                filterOptions={filterOptions}
                clearHref={clearHref}
                initialCount={imoveis.length}
              />
            </aside>

            <div className="min-w-0">
              <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
                <div className="grid gap-3 md:grid-cols-[1fr_190px_auto]">
                  <div className="flex items-center gap-3 rounded-lg bg-stone-50 px-4 py-3 text-slate-950">
                    <MagnifyingGlass size={20} className="shrink-0 text-[var(--grey-olive)]" />
                    <input
                      name="busca"
                      defaultValue={filters.busca}
                      type="search"
                      placeholder="Bairro, cidade, condomínio ou perfil do imóvel"
                      className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-light outline-none placeholder:text-slate-400"
                    />
                  </div>
                  <select name="ordenar" defaultValue={filters.ordenar} className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[var(--grey-olive)]">
                    <option value="recentes">Mais recentes</option>
                    <option value="menor-preco">Menor preço</option>
                    <option value="maior-preco">Maior preço</option>
                    <option value="maior-area">Maior área</option>
                  </select>
                  <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--grey-olive)]">
                    Buscar
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>

              <div className="my-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--grey-olive)]">
                    {filters.operacao === "aluguel" ? "Locação" : "Venda"}
                  </p>
                  <h2 className="mt-1 text-3xl font-light text-slate-950">
                    {imoveis.length} {imoveis.length === 1 ? "imóvel encontrado" : "imóveis encontrados"}
                  </h2>
                </div>
                {activeFilterCount > 0 ? (
                  <p className="inline-flex items-center gap-2 self-start rounded-full bg-stone-50 px-4 py-2 text-sm font-bold text-slate-600 md:self-auto">
                    <FunnelSimple size={16} />
                    {activeFilterCount} {activeFilterCount === 1 ? "filtro ativo" : "filtros ativos"}
                  </p>
                ) : null}
              </div>

              {imoveis.length > 0 ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {imoveis.map((imovel) => (
                    <PublicPropertyCard
                      key={imovel.id}
                      nickname={profile.nickname ?? nickname}
                      imovel={imovel}
                      imageUrl={mediaById.get(imovel.id) ?? null}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-8 text-center">
                  <p className="text-2xl font-light text-slate-950">Não encontrei imóveis com esses filtros.</p>
                  <p className="mt-3 font-light text-slate-600">Me chame e eu preparo uma curadoria mais alinhada ao que você procura.</p>
                </div>
              )}
            </div>
          </form>
        </section>

        {socialProofs.length > 0 ? <SocialProofCarousel items={socialProofs} /> : null}
      </main>

      <BrokerPublicFooter
        nickname={profile.nickname ?? nickname}
        brokerName={brokerName}
        creci={formatCreci(profile)}
        whatsappHref={whatsappHref}
        phoneHref={phoneHref}
      />
    </>
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

async function getPublishedImoveis(ownerId: string, filters: PropertyListFilters) {
  const supabase = createSupabaseServerClient();
  const priceColumn = filters.operacao === "aluguel" ? "preco_locacao" : "preco_venda";
  let query = supabase
    .from("imoveis")
    .select(IMOVEL_SELECT)
    .eq("owner_id", ownerId)
    .eq("status", "PUBLICADO")
    .not("slug_publico", "is", null)
    .limit(30);

  if (filters.operacao === "aluguel") {
    query = query.or("tipo_negociacao.eq.ALUGUEL,tipo_negociacao.eq.VENDA_E_ALUGUEL,finalidade.eq.ALUGAR");
  } else {
    query = query.or("tipo_negociacao.eq.VENDA,tipo_negociacao.eq.VENDA_E_ALUGUEL,finalidade.eq.COMPRAR");
  }

  if (filters.tipos.length === 1) query = query.eq("tipo", filters.tipos[0]);
  if (filters.tipos.length > 1) query = query.in("tipo", filters.tipos);
  if (filters.cidade) query = query.eq("cidade", filters.cidade);
  if (filters.bairro) query = query.eq("bairro", filters.bairro);
  if (filters.dormitorios !== null) query = query.gte("dormitorios", filters.dormitorios);
  if (filters.suites !== null) query = query.gte("suites", filters.suites);
  if (filters.banheiros !== null) query = query.gte("banheiros", filters.banheiros);
  if (filters.vagas !== null) query = query.gte("vagas", filters.vagas);
  if (filters.areaMin !== null) query = query.gte("area_util", filters.areaMin);
  if (filters.areaMax !== null) query = query.lte("area_util", filters.areaMax);
  if (filters.precoMin !== null) query = query.gte(priceColumn, filters.precoMin);
  if (filters.precoMax !== null) query = query.lte(priceColumn, filters.precoMax);
  if (filters.condominioMax !== null) query = query.lte("condominio", filters.condominioMax);
  if (filters.iptuMax !== null) query = query.lte("iptu", filters.iptuMax);

  if (filters.ordenar === "menor-preco") {
    query = query.order(priceColumn, { ascending: true, nullsFirst: false });
  } else if (filters.ordenar === "maior-preco") {
    query = query.order(priceColumn, { ascending: false, nullsFirst: false });
  } else if (filters.ordenar === "maior-area") {
    query = query.order("area_util", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("publicado_em", { ascending: false });
  }

  const result = await query;
  if (result.error) throw new Error(`Erro ao carregar imoveis publicos: ${result.error.message}`);
  const rows = (result.data ?? []) as unknown as ImovelRow[];

  if (!filters.busca) return rows;

  const search = normalizeSearch(filters.busca);
  return rows.filter((imovel) => {
    const haystack = normalizeSearch(
      [imovel.titulo, imovel.tipo, imovel.subtipo, imovel.bairro, imovel.cidade, imovel.estado].filter(Boolean).join(" "),
    );
    return haystack.includes(search);
  });
}

async function getFilterOptions(ownerId: string, operation: "venda" | "aluguel") {
  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("imoveis")
    .select(FILTER_OPTIONS_SELECT)
    .eq("owner_id", ownerId)
    .eq("status", "PUBLICADO")
    .not("slug_publico", "is", null)
    .limit(500);

  if (operation === "aluguel") {
    query = query.or("tipo_negociacao.eq.ALUGUEL,tipo_negociacao.eq.VENDA_E_ALUGUEL,finalidade.eq.ALUGAR");
  } else {
    query = query.or("tipo_negociacao.eq.VENDA,tipo_negociacao.eq.VENDA_E_ALUGUEL,finalidade.eq.COMPRAR");
  }

  const result = await query;
  if (result.error) throw new Error(`Erro ao carregar filtros de imoveis: ${result.error.message}`);

  const rows = (result.data ?? []) as unknown as FilterOptionRow[];
  return {
    tipos: uniqueSorted(rows.map((row) => row.tipo).filter(Boolean)),
    cidades: uniqueSorted(rows.map((row) => row.cidade).filter(Boolean)),
    bairros: uniqueSorted(rows.map((row) => row.bairro).filter(Boolean)),
  };
}

async function getMediaMap(imovelIds: string[]) {
  const mediaById = new Map<string, string>();
  if (imovelIds.length === 0) return mediaById;

  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("imovel_midia_publica")
    .select("imovel_id,indice_publico,ordem,url")
    .in("imovel_id", imovelIds);

  if (result.error) throw new Error(`Erro ao carregar midias de imoveis: ${result.error.message}`);

  for (const row of sortMediaRows(result.data ?? [])) {
    if (!mediaById.has(row.imovel_id)) mediaById.set(row.imovel_id, row.url);
  }

  return mediaById;
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

  if (result.error) throw new Error(`Erro ao carregar provas sociais publicas: ${result.error.message}`);

  return ((result.data ?? []) as unknown as SocialProofRow[]).map((item) => ({
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

function Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-10">
      <ol className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-white/58">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {index > 0 ? <span className="text-white/32">/</span> : null}
              {item.href && !isLast ? (
                <Link href={item.href} className="transition hover:text-white">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "text-[var(--grey-olive)]" : undefined}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function getProfileName(profile: ProfileRow) {
  return [profile.primeiro_nome, profile.sobrenome].filter(Boolean).join(" ") || "Corretor.one";
}

function formatCreci(profile: ProfileRow) {
  if (!profile.creci_uf || !profile.creci_numero) return null;
  return `CRECI ${profile.creci_uf} ${profile.creci_numero}-${profile.creci_sufixo ?? "F"}`;
}

function buildWhatsAppHref(phone: string | null | undefined, message: string) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (!digits) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

function buildPhoneHref(phone: string | null | undefined) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (!digits) return null;
  const localDigits = digits.startsWith("55") ? digits.slice(2) : digits;
  return `tel:0${localDigits}`;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "C1";
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

function parseFilters(query: Record<string, string | string[] | undefined> | undefined, seoIntent?: SeoSearchIntent | null): PropertyListFilters {
  const queryOperation = getQueryValue(query, "operacao");
  const queryTipos = normalizeTipos(getQueryValues(query, "tipo"));
  const queryCidade = getQueryValue(query, "cidade");
  const queryBairro = getQueryValue(query, "bairro");
  const queryDormitorios = parsePositiveInteger(getQueryValue(query, "dormitorios"));

  return {
    busca: getQueryValue(query, "busca").trim(),
    operacao: queryOperation ? normalizeOperation(queryOperation) : seoIntent?.operacao ?? "venda",
    tipos: queryTipos.length > 0 ? queryTipos : seoIntent?.tipo ? [seoIntent.tipo] : [],
    cidade: queryCidade || seoIntent?.cidade || "",
    bairro: queryBairro || seoIntent?.bairro || "",
    dormitorios: queryDormitorios ?? seoIntent?.dormitorios ?? null,
    suites: parsePositiveInteger(getQueryValue(query, "suites")),
    banheiros: parsePositiveInteger(getQueryValue(query, "banheiros")),
    vagas: parsePositiveInteger(getQueryValue(query, "vagas")),
    precoMin: parsePositiveInteger(getQueryValue(query, "preco_min")),
    precoMax: parsePositiveInteger(getQueryValue(query, "preco_max")),
    condominioMax: parsePositiveInteger(getQueryValue(query, "condominio_max")),
    iptuMax: parsePositiveInteger(getQueryValue(query, "iptu_max")),
    areaMin: parsePositiveInteger(getQueryValue(query, "area_min")),
    areaMax: parsePositiveInteger(getQueryValue(query, "area_max")),
    ordenar: normalizeOrdering(getQueryValue(query, "ordenar")),
  };
}

function getQueryValue(query: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = query?.[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function getQueryValues(query: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = query?.[key];
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function normalizeOperation(value: string | undefined): "venda" | "aluguel" {
  return value === "aluguel" ? "aluguel" : "venda";
}

function normalizeTipos(values: string[]) {
  return values.filter((value): value is ImovelTipo => IMOVEL_TIPOS.includes(value as ImovelTipo));
}

function normalizeOrdering(value: string): PropertyListFilters["ordenar"] {
  if (value === "menor-preco" || value === "maior-preco" || value === "maior-area") return value;
  return "recentes";
}

function parseSeoSlug(slug: string | undefined): SeoSearchIntent | null {
  if (!slug) return null;
  const normalizedSlug = slugifyText(slug);
  const tokens = normalizedSlug.split("-").filter(Boolean);
  if (tokens.length === 0) return null;

  const operacao = tokens[0] === "aluguel" ? "aluguel" : tokens[0] === "venda" ? "venda" : undefined;
  if (!operacao) return null;

  let cursor = 1;
  let tipo: ImovelTipo | undefined;
  for (let size = Math.min(4, tokens.length - cursor); size >= 1; size -= 1) {
    const candidate = tokens.slice(cursor, cursor + size).join("-");
    const matchedTipo = SEO_TIPO_SLUGS.get(candidate);
    if (matchedTipo) {
      tipo = matchedTipo;
      cursor += size;
      break;
    }
  }

  let dormitorios: number | undefined;
  const dormitorioIndex = tokens.findIndex((token, index) => index > cursor && (token === "dormitorio" || token === "dormitorios"));
  if (dormitorioIndex > cursor) {
    const parsedDormitorios = Number.parseInt(tokens[dormitorioIndex - 1] ?? "", 10);
    if (Number.isFinite(parsedDormitorios) && parsedDormitorios > 0) dormitorios = parsedDormitorios;
    tokens.splice(dormitorioIndex - 1, 2);
  }

  const locationTokens = tokens.slice(cursor);
  let cidade: string | undefined;
  let bairro: string | undefined;
  for (let size = Math.min(5, locationTokens.length); size >= 1; size -= 1) {
    const candidate = locationTokens.slice(0, size).join("-");
    const matchedCidade = SEO_CITY_SLUGS.get(candidate);
    if (matchedCidade) {
      cidade = matchedCidade;
      bairro = titleFromSlug(locationTokens.slice(size).join("-"));
      break;
    }
  }

  const canonicalPath = buildSeoPath({ operacao, tipo, cidade, bairro, dormitorios });
  return {
    slug,
    operacao,
    tipo,
    cidade,
    bairro,
    dormitorios,
    canonicalPath,
  };
}

function buildSeoPath(intent: Omit<SeoSearchIntent, "slug" | "canonicalPath">) {
  const parts: string[] = intent.operacao ? [intent.operacao] : [];
  const tipoSlug = intent.tipo ? slugifyText(formatEnumLabel(intent.tipo)) : null;
  if (tipoSlug) parts.push(tipoSlug);
  if (intent.cidade) parts.push(slugifyText(intent.cidade));
  if (intent.bairro) parts.push(slugifyText(intent.bairro));
  if (intent.dormitorios) parts.push(`${intent.dormitorios}-dormitorios`);
  return parts.filter(Boolean).join("-");
}

function buildHeading(filters: PropertyListFilters, seoIntent: SeoSearchIntent | null) {
  if (!seoIntent) return "Encontre comigo uma opção alinhada ao seu momento.";

  const subject = getSearchSubject(filters);
  const parts = [
    filters.operacao === "aluguel" ? `${subject} para alugar` : `${subject} à venda`,
    filters.bairro && filters.cidade ? `em ${filters.bairro}, ${filters.cidade}` : filters.cidade ? `em ${filters.cidade}` : null,
    filters.dormitorios ? `com ${filters.dormitorios} ${filters.dormitorios === 1 ? "dormitório" : "dormitórios"}` : null,
  ].filter(Boolean);
  return parts.join(" ");
}

function getSearchSubject(filters: PropertyListFilters) {
  if (filters.tipos.length !== 1) return "Imóveis";
  return pluralizeTipo(filters.tipos[0]);
}

function pluralizeTipo(tipo: ImovelTipo) {
  const labels: Record<ImovelTipo, string> = {
    APARTAMENTO: "Apartamentos",
    CASA: "Casas",
    CASA_DE_CONDOMINIO: "Casas de condomínio",
    CASA_DE_VILA: "Casas de vila",
    COBERTURA: "Coberturas",
    CASA_COMERCIAL: "Casas comerciais",
    ESCRITORIO: "Escritórios",
    FAZENDA_SITIO_CHACARA: "Fazendas, sítios e chácaras",
    FLAT: "Flats",
    GALPAO_DEPOSITO_ARMAZEM: "Galpões, depósitos e armazéns",
    GARAGEM: "Garagens",
    KITNET_CONJUGADO: "Kitnets",
    HOTEL_MOTEL_POUSADA: "Hotéis, motéis e pousadas",
    LOFT: "Lofts",
    LOTE_TERRENO: "Terrenos",
    SHOPPING: "Shoppings",
    PONTO_COMERCIAL_LOJA_BOX: "Pontos comerciais, lojas e boxes",
    PREDIO_EDIFICIO_INTEIRO: "Prédios e edifícios inteiros",
    SELF_STORAGE: "Self storages",
    STUDIO: "Studios",
  };

  return labels[tipo] ?? `${formatEnumLabel(tipo)}s`;
}

function buildSubheading(filters: PropertyListFilters, brokerName: string) {
  const operationLabel = filters.operacao === "aluguel" ? "locação" : "compra";
  return `Veja as opções de ${operationLabel} que eu tenho publicadas e refine por valor, área, condomínio, IPTU e características importantes para o seu momento. Atendimento direto com ${brokerName}.`;
}

function buildSeoTitle(brokerName: string, filters: PropertyListFilters, seoIntent: SeoSearchIntent | null) {
  if (!seoIntent) return `Imóveis de ${brokerName} | Corretor.one`;
  return `${buildHeading(filters, seoIntent)} | ${brokerName}`;
}

function buildSeoDescription(brokerName: string, filters: PropertyListFilters, seoIntent: SeoSearchIntent | null) {
  if (!seoIntent) {
    return `Consulte os imóveis publicados por ${brokerName} no Corretor.one.`;
  }
  return `${buildHeading(filters, seoIntent)} com atendimento direto de ${brokerName}. Filtre por preço, metragem, condomínio, IPTU, suítes e vagas.`;
}

function buildBreadcrumbItems(profilePath: string, nickname: string, filters: PropertyListFilters) {
  const items: Array<{ label: string; href?: string }> = [
    { label: `/${nickname}`, href: profilePath },
    { label: "Imóveis", href: `${profilePath}/imoveis` },
  ];

  items.push({
    label: filters.operacao === "aluguel" ? "Locação" : "Venda",
    href: `${profilePath}/imoveis/${filters.operacao}`,
  });

  if (filters.tipos.length === 1) items.push({ label: formatEnumLabel(filters.tipos[0]) });
  if (filters.tipos.length > 1) items.push({ label: "Tipologias" });
  if (filters.bairro && filters.cidade) {
    items.push({ label: `${filters.bairro}, ${filters.cidade}` });
  } else if (filters.cidade) {
    items.push({ label: filters.cidade });
  } else if (filters.bairro) {
    items.push({ label: filters.bairro });
  }
  if (filters.dormitorios) {
    items.push({ label: `${filters.dormitorios} ${filters.dormitorios === 1 ? "dormitório" : "dormitórios"}` });
  }

  return items;
}

function parsePositiveInteger(value: string) {
  const parsed = Number.parseInt(value.replace(/\D/g, ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function countActiveFilters(filters: PropertyListFilters) {
  return [
    filters.busca,
    filters.tipos.length > 0,
    filters.cidade,
    filters.bairro,
    filters.dormitorios,
    filters.suites,
    filters.banheiros,
    filters.vagas,
    filters.precoMin,
    filters.precoMax,
    filters.condominioMax,
    filters.iptuMax,
    filters.areaMin,
    filters.areaMax,
  ].filter(Boolean).length;
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function slugifyText(value: string) {
  return normalizeSearch(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleFromSlug(value: string) {
  if (!value) return undefined;
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function formatEnumLabel(value: string | null | undefined) {
  if (!value) return "";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sortMediaRows(rows: MediaRow[]) {
  return rows.sort((a, b) => {
    if (a.imovel_id !== b.imovel_id) return a.imovel_id.localeCompare(b.imovel_id);
    if (a.indice_publico !== b.indice_publico) return a.indice_publico - b.indice_publico;
    return a.ordem - b.ordem;
  });
}
