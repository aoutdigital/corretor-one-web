import type { Metadata } from "next";

import { generatePropertiesMetadata, PublicPropertiesPage } from "../_components/public-properties-page";

type PageProps = {
  params: Promise<{ nickname: string; slugBusca: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { nickname, slugBusca } = await params;
  return generatePropertiesMetadata({
    nickname,
    seoSlug: slugBusca,
    searchParams: await searchParams,
  });
}

export default async function PublicBrokerPropertiesSeoPage({ params, searchParams }: PageProps) {
  const { nickname, slugBusca } = await params;
  return (
    <PublicPropertiesPage
      nickname={nickname}
      seoSlug={slugBusca}
      searchParams={await searchParams}
    />
  );
}
