import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NotePencil } from "@phosphor-icons/react/dist/ssr";

import { BrokerPublicFooter } from "@/app/[nickname]/_components/broker-public-footer";
import { PublicBrokerHeader } from "@/app/[nickname]/_components/public-broker-header";
import { getArticleCategoryLabel, type ArtigosOrdenacao } from "@/lib/artigos/content";
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

type ArtigoPublicRow = {
  id: string;
  categoria: string;
  titulo: string;
  subtitulo: string | null;
  resumo: string | null;
  slug: string;
  capa_url: string | null;
  leitura_minutos: number;
  publicado_em: string | null;
  updated_at: string;
  ordem_manual: number | null;
};

type ArticlesConfigRow = {
  ordenacao_publica: string | null;
};

type DynamicQueryResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

type DynamicSingleResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

type DynamicQuery<T> = PromiseLike<DynamicQueryResult<T>> & {
  select: (columns: string) => DynamicQuery<T>;
  eq: (column: string, value: unknown) => DynamicQuery<T>;
  order: (column: string, options: { ascending: boolean }) => DynamicQuery<T>;
  maybeSingle: () => PromiseLike<DynamicSingleResult<T>>;
};

type AnyDb = {
  from: <T>(table: string) => DynamicQuery<T>;
};

const PROFILE_SELECT =
  "id,nickname,primeiro_nome,sobrenome,email,telefone,whatsapp,avatar_url,imagem_capa_url,logo_nickname_url,logo_nickname_white_url,creci_uf,creci_numero,creci_sufixo,status";

const ARTICLE_SELECT = "id,categoria,titulo,subtitulo,resumo,slug,capa_url,leitura_minutos,publicado_em,updated_at,ordem_manual";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { nickname } = await params;
  const profile = await getProfile(nickname);
  if (!profile) return { title: "Artigos | Corretor.one" };
  const brokerName = getProfileName(profile);
  return {
    title: `Artigos | ${brokerName}`,
    description: `Conteúdos publicados por ${brokerName} sobre imóveis, bairros, mercado e oportunidades.`,
  };
}

export default async function PublicBrokerArticlesPage({ params }: PageProps) {
  const { nickname } = await params;
  const profile = await getProfile(nickname);
  if (!profile) notFound();

  const config = await getArticlesConfig(profile.id);
  const articles = await getPublishedArticles(profile.id, config.ordenacao_publica);
  const brokerName = getProfileName(profile);
  const logoUrl = getPublicImageUrl(profile.logo_nickname_url || profile.logo_nickname_white_url);
  const avatarUrl = getPublicImageUrl(profile.avatar_url);
  const coverUrl = getPublicImageUrl(articles[0]?.capa_url) || getPublicImageUrl(profile.imagem_capa_url);
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
          {coverUrl ? <Image src={coverUrl} alt="" fill sizes="100vw" className="object-cover" priority unoptimized /> : null}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/88 to-slate-950/45" />
          <div className="relative mx-auto max-w-7xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--grey-olive)]">Artigos</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-light leading-tight md:text-6xl">
              Conteúdos para decidir melhor no mercado imobiliário.
            </h1>
            <p className="mt-5 max-w-2xl text-lg font-light leading-relaxed text-white/70">
              Guias, leituras de bairro, oportunidades e orientações publicadas por {brokerName}.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-14">
          {articles.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {articles.map((article) => (
                <Link
                  key={article.id}
                  href={`/${profile.nickname ?? nickname}/artigos/${article.slug}`}
                  className="group overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[color:rgba(145,139,118,0.55)] hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] bg-stone-100">
                    {article.capa_url ? (
                      <Image src={article.capa_url} alt={article.titulo} fill sizes="(min-width: 1280px) 33vw, 100vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" unoptimized />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[var(--grey-olive)]">
                        <NotePencil size={38} weight="light" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--grey-olive)]">
                      {getArticleCategoryLabel(article.categoria)}
                    </p>
                    <h2 className="mt-2 line-clamp-2 text-2xl font-light leading-snug text-slate-950">{article.titulo}</h2>
                    <p className="mt-3 line-clamp-3 text-sm font-light leading-6 text-slate-500">
                      {article.resumo || article.subtitulo || "Leia o artigo completo."}
                    </p>
                    <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      {article.leitura_minutos} min de leitura
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center">
              <NotePencil size={42} className="mx-auto text-[var(--grey-olive)]" />
              <p className="mt-4 text-2xl font-light text-slate-950">Nenhum artigo publicado no momento.</p>
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

async function getArticlesConfig(ownerId: string): Promise<{ ordenacao_publica: ArtigosOrdenacao }> {
  const supabase = createSupabaseServerClient() as unknown as AnyDb;
  const result = await supabase
    .from<ArticlesConfigRow>("profile_artigos_config")
    .select("ordenacao_publica")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (result.error) throw new Error(`Erro ao carregar configuracao de artigos: ${result.error.message}`);
  return { ordenacao_publica: (result.data?.ordenacao_publica ?? "PUBLICACAO_DESC") as ArtigosOrdenacao };
}

async function getPublishedArticles(ownerId: string, order: ArtigosOrdenacao) {
  const supabase = createSupabaseServerClient() as unknown as AnyDb;
  let query = supabase
    .from<ArtigoPublicRow>("artigos")
    .select(ARTICLE_SELECT)
    .eq("owner_id", ownerId)
    .eq("status", "PUBLICADO")
    .eq("indexar", true);

  if (order === "MANUAL") query = query.order("ordem_manual", { ascending: true }).order("publicado_em", { ascending: false });
  else if (order === "ATUALIZACAO_DESC") query = query.order("updated_at", { ascending: false });
  else query = query.order("publicado_em", { ascending: false });

  const result = await query;
  if (result.error) throw new Error(`Erro ao carregar artigos publicos: ${result.error.message}`);
  return sortPublishedArticles((result.data ?? []) as ArtigoPublicRow[], order);
}

function sortPublishedArticles(articles: ArtigoPublicRow[], order: ArtigosOrdenacao) {
  return [...articles].sort((a, b) => {
    if (order === "MANUAL") {
      const manualDiff = getManualOrderValue(a) - getManualOrderValue(b);
      if (manualDiff !== 0) return manualDiff;
      return compareByRecentPublication(a, b);
    }

    if (order === "ATUALIZACAO_DESC") {
      return dateValue(b.updated_at) - dateValue(a.updated_at);
    }

    return compareByRecentPublication(a, b);
  });
}

function getManualOrderValue(article: ArtigoPublicRow) {
  return typeof article.ordem_manual === "number" && Number.isFinite(article.ordem_manual) && article.ordem_manual > 0
    ? article.ordem_manual
    : Number.MAX_SAFE_INTEGER;
}

function compareByRecentPublication(a: ArtigoPublicRow, b: ArtigoPublicRow) {
  return dateValue(b.publicado_em ?? b.updated_at) - dateValue(a.publicado_em ?? a.updated_at);
}

function dateValue(value: string | null) {
  return value ? new Date(value).getTime() : 0;
}

function getProfileName(profile: ProfileRow) {
  return `${profile.primeiro_nome ?? ""} ${profile.sobrenome ?? ""}`.trim() || profile.email;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatCreci(profile: ProfileRow) {
  if (!profile.creci_uf || !profile.creci_numero) return null;
  return `CRECI ${profile.creci_uf} ${profile.creci_numero}-${profile.creci_sufixo ?? "F"}`;
}

function getPublicImageUrl(url: string | null | undefined) {
  const value = url?.trim();
  return value || null;
}
