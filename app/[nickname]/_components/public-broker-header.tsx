"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowRight, List, X } from "@phosphor-icons/react";

type PublicBrokerHeaderProps = {
  nickname: string;
  brokerName: string;
  logoUrl: string | null;
  avatarUrl: string | null;
  initials: string;
};

const linkBaseClass =
  "rounded-lg px-3 py-2 text-sm font-light transition hover:bg-slate-100 hover:text-slate-950";

export function PublicBrokerHeader({ nickname, brokerName, logoUrl, avatarUrl, initials }: PublicBrokerHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const profilePath = `/${nickname}`;
  const contactPath = `${profilePath}#contato`;
  const menuItems = [
    { label: "Home", href: profilePath, match: (path: string) => path === profilePath },
    { label: "Venda", href: `${profilePath}/imoveis/venda`, match: (path: string) => path.includes("/imoveis/venda") || path.includes("/venda/") },
    { label: "Locação", href: `${profilePath}/imoveis/aluguel`, match: (path: string) => path.includes("/imoveis/aluguel") || path.includes("/aluguel/") },
    { label: "Anunciar", href: `${profilePath}/anuncie`, match: (path: string) => path.startsWith(`${profilePath}/anuncie`) },
    {
      label: "Empreendimentos",
      href: `${profilePath}/empreendimentos`,
      match: (path: string) => path.startsWith(`${profilePath}/empreendimentos`),
    },
    { label: "Contato", href: contactPath, match: () => false },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
        <Link href={profilePath} aria-label={brokerName} className="min-w-0" onClick={() => setIsOpen(false)}>
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

        <nav className="hidden items-center gap-1 text-slate-600 lg:flex" aria-label="Menu do corretor">
          {menuItems.map((item) => {
            const active = item.match(pathname);

            return (
              <Link
                key={item.label}
                className={`${linkBaseClass} ${active ? "bg-slate-100 text-slate-950" : "text-slate-600"}`}
                href={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href={contactPath}
            className="hidden items-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-bold text-white transition hover:brightness-95 sm:inline-flex"
          >
            Falar agora
            <ArrowRight size={16} />
          </Link>
          <Link
            href={profilePath}
            aria-label={`Perfil de ${brokerName}`}
            className="relative h-11 w-11 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-slate-700 shadow-sm"
            onClick={() => setIsOpen(false)}
          >
            {avatarUrl ? (
              <Image src={avatarUrl} alt={brokerName} fill sizes="44px" className="object-cover" priority unoptimized />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-bold">{initials}</div>
            )}
          </Link>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 lg:hidden"
            aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={isOpen}
            aria-controls="public-broker-mobile-menu"
            onClick={() => setIsOpen((current) => !current)}
          >
            {isOpen ? <X size={20} /> : <List size={22} />}
          </button>
        </div>
      </div>

      {isOpen ? (
        <div id="public-broker-mobile-menu" className="border-t border-slate-200 bg-white shadow-lg lg:hidden">
          <nav className="mx-auto grid max-w-7xl gap-1 px-5 py-4" aria-label="Menu do corretor mobile">
            {menuItems.map((item) => {
              const active = item.match(pathname);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`rounded-lg px-3 py-3 text-base font-medium transition ${
                    active ? "bg-slate-100 text-slate-950" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href={contactPath}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-4 py-3 text-sm font-bold text-white transition hover:brightness-95"
              onClick={() => setIsOpen(false)}
            >
              Falar agora
              <ArrowRight size={16} />
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
