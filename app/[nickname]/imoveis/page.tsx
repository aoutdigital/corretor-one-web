import type { Metadata } from "next";

import { generatePropertiesMetadata, PublicPropertiesPage } from "./_components/public-properties-page";

type PageProps = {
  params: Promise<{ nickname: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { nickname } = await params;
  return generatePropertiesMetadata({
    nickname,
    searchParams: await searchParams,
  });
}

export default async function PublicBrokerPropertiesIndexPage({ params, searchParams }: PageProps) {
  const { nickname } = await params;
  return (
    <PublicPropertiesPage
      nickname={nickname}
      searchParams={await searchParams}
    />
  );
}
