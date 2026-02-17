"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Sidebar, SidebarItem, SidebarItemGroup, SidebarItems } from "flowbite-react";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
};

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/negocios", label: "Negocios" },
  { href: "/negocios/atividades", label: "Atividades" },
  { href: "/imoveis", label: "Imoveis" },
  { href: "/empreendimentos", label: "Empreendimentos" },
  { href: "/perfil", label: "Perfil" },
  { href: "/configuracoes", label: "Configuracoes" },
];

export function AppShell({ title, subtitle, children, rightSlot }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex max-w-[1600px] gap-4 p-4 md:p-6">
        <aside className="hidden w-72 shrink-0 lg:block">
          <Sidebar className="h-[calc(100vh-3rem)] rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="mb-4 flex items-center gap-3 px-2 py-1">
              <Link href="/" aria-label="Corretor.one Dashboard">
                <Image
                  src="/logo.svg"
                  alt="Corretor.one"
                  width={200}
                  height={56}
                  className="h-8 w-auto"
                  style={{ aspectRatio: "25 / 7" }}
                  priority
                />
              </Link>
            </div>

            <SidebarItems>
              <SidebarItemGroup>
                {navItems.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <SidebarItem
                      key={item.href}
                      href={item.href}
                      as={Link}
                      className={active ? "!bg-blue-50 !text-blue-700" : ""}
                    >
                      {item.label}
                    </SidebarItem>
                  );
                })}
              </SidebarItemGroup>
            </SidebarItems>
          </Sidebar>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
              </div>
              {rightSlot}
            </div>
          </header>

          <main className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">{children}</main>
        </div>
      </div>
    </div>
  );
}
