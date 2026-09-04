import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarBlank, Clock, NotePencil } from "@phosphor-icons/react/dist/ssr";

import { ArticleContentRenderer } from "@/app/[nickname]/_components/article-content-renderer";
import { ArticleShareBar, ArticleShareFooter } from "@/app/[nickname]/_components/article-share-bar";
import { BrokerPublicFooter } from "@/app/[nickname]/_components/broker-public-footer";
import { PublicBrokerHeader } from "@/app/[nickname]/_components/public-broker-header";
import { getArticleCategoryLabel, normalizeArticleBlocks, type ArtigoConteudo } from "@/lib/artigos/content";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type PageProps = {
  params: Promise<{ nickname: string; slug: string }>;
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

type ArticleRow = {
  id: string;
  categoria: string;
  titulo: string;
  subtitulo: string | null;
  resumo: string | null;
  slug: string;
  capa_url: string | null;
  conteudo_blocos: ArtigoConteudo;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  indexar: boolean;
  leitura_minutos: number;
  publicado_em: string | null;
  created_at: string;
  updated_at: string;
  local_nome: string | null;
  local_categoria: string | null;
  local_horario_funcionamento: string | null;
  local_website_url: string | null;
  local_whatsapp: string | null;
  local_telefone: string | null;
  localizacao_texto: string | null;
};

type RelatedArticleRow = Pick<
  ArticleRow,
  "id" | "categoria" | "titulo" | "subtitulo" | "resumo" | "slug" | "capa_url" | "leitura_minutos" | "publicado_em" | "created_at" | "updated_at"
>;

type SupabaseQueryResult = {
  data: unknown;
  error: { message: string } | null;
};

type SupabaseArticleQuery = {
  select(columns: string): SupabaseArticleQuery;
  eq(column: string, value: string | boolean): SupabaseArticleQuery;
  neq(column: string, value: string | boolean): SupabaseArticleQuery;
  order(column: string, options: { ascending: boolean }): SupabaseArticleQuery;
  limit(count: number): Promise<SupabaseQueryResult>;
  maybeSingle(): Promise<SupabaseQueryResult>;
};

type SupabaseUntypedClient = {
  from(table: string): SupabaseArticleQuery;
};

const PROFILE_SELECT =
  "id,nickname,primeiro_nome,sobrenome,email,telefone,whatsapp,avatar_url,imagem_capa_url,logo_nickname_url,logo_nickname_white_url,creci_uf,creci_numero,creci_sufixo,status";

const ARTICLE_SELECT =
  "id,categoria,titulo,subtitulo,resumo,slug,capa_url,conteudo_blocos,meta_title,meta_description,canonical_url,indexar,leitura_minutos,publicado_em,created_at,updated_at,local_nome,local_categoria,local_horario_funcionamento,local_website_url,local_whatsapp,local_telefone,localizacao_texto";

const RELATED_ARTICLE_SELECT =
  "id,categoria,titulo,subtitulo,resumo,slug,capa_url,leitura_minutos,publicado_em,created_at,updated_at";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { nickname, slug } = await params;
  const data = await getPublicArticleData(nickname, slug);
  if (!data) return { title: "Artigo | Corretor.one" };

  const title = data.article.meta_title || data.article.titulo;
  const description = data.article.meta_description || data.article.resumo || data.article.subtitulo || undefined;
  const robots = data.article.indexar ? undefined : { index: false, follow: true };

  return {
    title,
    description,
    alternates: data.article.canonical_url ? { canonical: data.article.canonical_url } : undefined,
    robots,
    openGraph: {
      title,
      description,
      images: data.article.capa_url ? [{ url: data.article.capa_url }] : undefined,
      type: "article",
      publishedTime: data.article.publicado_em ?? undefined,
      modifiedTime: data.article.updated_at,
    },
  };
}

export default async function PublicArticleDetailPage({ params }: PageProps) {
  const { nickname, slug } = await params;
  const data = await getPublicArticleData(nickname, slug);
  if (!data) notFound();

  const { profile, article, relatedArticles } = data;
  const brokerName = getProfileName(profile);
  const publicNickname = profile.nickname ?? nickname;
  const logoUrl = getPublicImageUrl(profile.logo_nickname_url || profile.logo_nickname_white_url);
  const avatarUrl = getPublicImageUrl(profile.avatar_url);
  const coverUrl = getPublicImageUrl(article.capa_url) || getPublicImageUrl(profile.imagem_capa_url);
  const initials = getInitials(brokerName);
  const creci = formatCreci(profile);

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <PublicBrokerHeader
        nickname={publicNickname}
        brokerName={brokerName}
        logoUrl={logoUrl}
        avatarUrl={avatarUrl}
        initials={initials}
        creci={creci}
      />

      <main>
        <article>
          <header className="relative overflow-hidden border-b border-stone-200 bg-slate-950 px-5 py-16 text-white md:py-24">
            {coverUrl ? <Image src={coverUrl} alt="" fill sizes="100vw" className="object-cover" priority unoptimized /> : null}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/45" />
            <div className="relative mx-auto max-w-7xl">
              <Link
                href={`/${publicNickname}/artigos`}
                className="inline-flex items-center gap-2 text-sm font-medium text-white/70 transition hover:text-white"
              >
                <ArrowLeft size={16} />
                Artigos
              </Link>
              <p className="mt-10 text-xs font-bold uppercase tracking-[0.24em] text-[var(--grey-olive)]">
                {getArticleCategoryLabel(article.categoria)}
              </p>
              <h1 className="mt-4 max-w-5xl text-4xl font-light leading-tight md:text-6xl">{article.titulo}</h1>
              {article.subtitulo ? (
                <p className="mt-6 max-w-3xl text-lg font-light leading-relaxed text-white/72">{article.subtitulo}</p>
              ) : null}
              <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-white/62">
                <span>Por {brokerName}</span>
                <span className="inline-flex items-center gap-2">
                  <Clock size={16} />
                  {article.leitura_minutos} min de leitura
                </span>
                <span className="inline-flex items-center gap-2">
                  <CalendarBlank size={16} />
                  {formatDate(article.publicado_em ?? article.updated_at)}
                </span>
              </div>
            </div>
          </header>

          {article.categoria === "LOCAL" ? <LocalArticleContext article={article} /> : null}

          <section className="px-5 py-14 md:py-20">
            <div className="mx-auto grid max-w-7xl gap-8 xl:grid-cols-[4rem_minmax(0,1fr)] xl:items-start">
              <ArticleShareBar title={article.titulo} sharePath={`/${publicNickname}/artigos/${article.slug}`} />
              <div className="min-w-0">
                <ArticleContentRenderer
                  content={article.conteudo_blocos}
                  nickname={publicNickname}
                  brokerName={brokerName}
                  avatarUrl={avatarUrl}
                  creci={creci}
                />
                <RelatedArticlesSection articles={relatedArticles} nickname={publicNickname} />
              </div>
            </div>
            <ArticleShareFooter title={article.titulo} sharePath={`/${publicNickname}/artigos/${article.slug}`} />
          </section>
        </article>
      </main>

      <BrokerPublicFooter nickname={publicNickname} brokerName={brokerName} creci={creci} avatarUrl={avatarUrl} />
    </div>
  );
}

function RelatedArticlesSection({ articles, nickname }: { articles: RelatedArticleRow[]; nickname: string }) {
  if (!articles.length) return null;

  return (
    <section className="mt-16 border-t border-stone-200 pt-10">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--grey-olive)]">Continue lendo</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-light leading-tight text-slate-950 md:text-4xl">Veja outros artigos que publiquei</h2>
          <p className="mt-3 max-w-2xl text-base font-light leading-7 text-slate-500">
            Mais leituras para ajudar você a decidir com calma e contexto.
          </p>
        </div>
      </div>

      <div className="mt-7 grid gap-4">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/${nickname}/artigos/${article.slug}`}
            className="group grid gap-4 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-[color:rgba(145,139,118,0.55)] hover:shadow-md sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-center"
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-stone-100 sm:h-[120px] sm:w-[180px] sm:aspect-auto">
              {article.capa_url ? (
                <Image
                  src={article.capa_url}
                  alt={article.titulo}
                  fill
                  sizes="(min-width: 640px) 180px, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[var(--grey-olive)]">
                  <NotePencil size={34} weight="light" />
                </div>
              )}
            </div>
            <div className="min-w-0 px-1 py-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--grey-olive)]">
                {getArticleCategoryLabel(article.categoria)}
              </p>
              <h3 className="mt-2 line-clamp-2 text-xl font-light leading-snug text-slate-950 transition group-hover:text-[var(--grey-olive)]">
                {article.titulo}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm font-light leading-6 text-slate-500">
                {article.resumo || article.subtitulo || "Leia o artigo completo."}
              </p>
            </div>
            <span className="inline-flex h-11 items-center justify-center rounded-xl border border-[color:rgba(145,139,118,0.45)] px-4 text-sm font-bold text-[var(--grey-olive)] transition group-hover:bg-stone-50">
              Ler artigo
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function LocalArticleContext({ article }: { article: ArticleRow }) {
  const rows = [
    article.local_categoria ? ["Categoria", article.local_categoria] : null,
    article.localizacao_texto ? ["Localização", article.localizacao_texto] : null,
    article.local_horario_funcionamento ? ["Funcionamento", article.local_horario_funcionamento] : null,
    article.local_telefone ? ["Telefone", article.local_telefone] : null,
    article.local_whatsapp ? ["WhatsApp", article.local_whatsapp] : null,
  ].filter((row): row is [string, string] => Boolean(row));

  if (!article.local_nome && rows.length === 0 && !article.local_website_url) return null;

  return (
    <section className="border-b border-stone-200 bg-stone-50 px-5 py-8">
      <div className="mx-auto grid max-w-7xl gap-6 rounded-2xl border border-stone-200 bg-white p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--grey-olive)]">Local citado no artigo</p>
          {article.local_nome ? <h2 className="mt-2 text-3xl font-light text-slate-950">{article.local_nome}</h2> : null}
          {rows.length ? (
            <dl className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              {rows.map(([label, value]) => (
                <div key={label}>
                  <dt className="font-bold text-slate-950">{label}</dt>
                  <dd className="mt-0.5 font-light">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        {article.local_website_url ? (
          <Link
            href={article.local_website_url}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-[color:rgba(145,139,118,0.55)] px-4 py-3 text-sm font-bold text-[var(--grey-olive)] transition hover:bg-stone-50"
          >
            Visitar site
          </Link>
        ) : null}
      </div>
    </section>
  );
}

async function getPublicArticleData(nickname: string, slug: string) {
  const profile = await getProfile(nickname);
  if (!profile) return null;
  const article = await getArticle(profile.id, slug);
  if (!article) return null;
  const relatedArticles = await getRelatedArticles(profile.id, article.id, article.categoria);
  return { profile, article, relatedArticles };
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

async function getArticle(ownerId: string, slug: string) {
  const supabase = createSupabaseServerClient() as unknown as SupabaseUntypedClient;
  const result = await supabase
    .from("artigos")
    .select(ARTICLE_SELECT)
    .eq("owner_id", ownerId)
    .eq("slug", slug)
    .eq("status", "PUBLICADO")
    .maybeSingle();

  if (result.error) throw new Error(`Erro ao carregar artigo publico: ${result.error.message}`);
  if (!result.data) return null;
  const article = result.data as ArticleRow;
  return { ...article, conteudo_blocos: normalizeArticleBlocks(article.conteudo_blocos) };
}

async function getRelatedArticles(ownerId: string, currentArticleId: string, category: string) {
  const supabase = createSupabaseServerClient() as unknown as SupabaseUntypedClient;
  const sameCategoryResult = await supabase
    .from("artigos")
    .select(RELATED_ARTICLE_SELECT)
    .eq("owner_id", ownerId)
    .eq("status", "PUBLICADO")
    .eq("indexar", true)
    .neq("id", currentArticleId)
    .eq("categoria", category)
    .order("created_at", { ascending: false })
    .limit(4);

  if (sameCategoryResult.error) {
    throw new Error(`Erro ao carregar artigos relacionados: ${sameCategoryResult.error.message}`);
  }

  const sameCategory = (sameCategoryResult.data ?? []) as RelatedArticleRow[];
  if (sameCategory.length > 0) return sameCategory;

  const otherArticlesResult = await supabase
    .from("artigos")
    .select(RELATED_ARTICLE_SELECT)
    .eq("owner_id", ownerId)
    .eq("status", "PUBLICADO")
    .eq("indexar", true)
    .neq("id", currentArticleId)
    .neq("categoria", category)
    .order("created_at", { ascending: false })
    .limit(4);

  if (otherArticlesResult.error) {
    throw new Error(`Erro ao carregar outros artigos relacionados: ${otherArticlesResult.error.message}`);
  }

  return (otherArticlesResult.data ?? []) as RelatedArticleRow[];
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
}
