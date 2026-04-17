"use client";

import {
  Buildings,
  CaretDoubleLeft,
  CaretDoubleRight,
  CaretUp,
  ChartBar,
  Chats,
  EnvelopeSimple,
  FileText,
  FunnelSimple,
  Gauge,
  House,
  Megaphone,
  NotePencil,
  SignOut,
  Sparkle,
  Stack,
  UserCircle,
  Waveform,
} from "@phosphor-icons/react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { OnboardingGate } from "@/app/_components/onboarding-gate";
import { apiFetchWithAuth } from "@/lib/client/auth-api";
import { supabase } from "@/lib/supabaseClient";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
  mainClassName?: string;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; weight?: "regular" | "duotone" | "fill" | "bold" | "light" | "thin" }>;
  disabled?: boolean;
};

type UserMiniProfile = {
  primeiro_nome: string | null;
  sobrenome: string | null;
  email: string;
  avatar_url: string | null;
};

const MAIN_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/empreendimentos", label: "Empreendimentos", icon: Buildings },
  { href: "/imoveis", label: "Imóveis", icon: House },
  { href: "/captura", label: "Páginas de Captura", icon: FunnelSimple, disabled: true },
  { href: "/artigos", label: "Artigos", icon: NotePencil, disabled: true },
];

const BUSINESS_ITEMS: NavItem[] = [
  { href: "/negocios", label: "Leads", icon: Chats },
  { href: "/negocios/funil", label: "Funil", icon: Waveform },
  { href: "/negocios/atividades", label: "Atividades", icon: ChartBar },
  { href: "/propostas", label: "Propostas", icon: FileText, disabled: true },
];

const MARKETING_ITEMS: NavItem[] = [
  { href: "/campanhas", label: "Campanhas", icon: Megaphone, disabled: true },
  { href: "/criativos", label: "Central de Criativos", icon: Sparkle, disabled: true },
  { href: "/integracoes", label: "Integração Portais", icon: Stack, disabled: true },
];

export function AppShell({ title, subtitle, children, rightSlot, mainClassName }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("co_app_sidebar_collapsed") === "1";
  });
  const [profile, setProfile] = useState<UserMiniProfile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("co_app_sidebar_collapsed", collapsed ? "1" : "0");
    }
  }, [collapsed]);

  useEffect(() => {
    let active = true;
    apiFetchWithAuth<UserMiniProfile>("/api/profile").then((result) => {
      if (!active || !result.ok) return;
      setProfile(result.data);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const displayName = useMemo(() => {
    if (!profile) return "Minha conta";
    const full = `${profile.primeiro_nome ?? ""} ${profile.sobrenome ?? ""}`.trim();
    return full || profile.email;
  }, [profile]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/entrar");
  }

  function renderNav(items: NavItem[]) {
    return items.map((item) => {
      const Icon = item.icon;
      const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
      const disabled = Boolean(item.disabled);

      const baseClass =
        "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition";
      const stateClass = disabled
        ? "cursor-not-allowed text-slate-400"
        : active
          ? "bg-[var(--blue-slate)]/10 text-[var(--blue-slate)]"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900";

      if (disabled) {
        return (
          <div key={item.href} className={`${baseClass} ${stateClass}`}>
            <Icon size={20} />
            {!collapsed ? <span>{item.label}</span> : null}
          </div>
        );
      }

      return (
        <Link key={item.href} href={item.href} className={`${baseClass} ${stateClass}`}>
          <Icon size={20} />
          {!collapsed ? <span>{item.label}</span> : null}
        </Link>
      );
    });
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <OnboardingGate />
      <div className="mx-auto flex max-w-[1800px] gap-4 p-4 md:p-6">
        <aside
          className={`${collapsed ? "md:w-24" : "md:w-72"} hidden shrink-0 md:block`}
        >
          <div className="sticky top-4 flex h-[calc(100vh-2rem)] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-3">
              <Link href="/dashboard" aria-label="Corretor.one Dashboard">
                <Image
                  src="/logo.svg"
                  alt="Corretor.one"
                  width={200}
                  height={56}
                  className={`${collapsed ? "hidden" : "h-8 w-auto"}`}
                  style={{ aspectRatio: "25 / 7" }}
                  priority
                />
              </Link>
              <button
                type="button"
                onClick={() => setCollapsed((prev) => !prev)}
                className="inline-flex cursor-pointer rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              >
                {collapsed ? <CaretDoubleRight size={16} /> : <CaretDoubleLeft size={16} />}
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
              <nav className="space-y-1">{renderNav(MAIN_ITEMS)}</nav>

              <hr className="border-slate-200" />

              {!collapsed ? <p className="px-3 text-xs uppercase tracking-widest text-slate-400">Negócios</p> : null}
              <nav className="space-y-1">{renderNav(BUSINESS_ITEMS)}</nav>

              <hr className="border-slate-200" />

              {!collapsed ? <p className="px-3 text-xs uppercase tracking-widest text-slate-400">Marketing</p> : null}
              <nav className="space-y-1">{renderNav(MARKETING_ITEMS)}</nav>
            </div>

            <div ref={menuRef} className="relative border-t border-slate-100 p-2">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-100"
              >
                <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt="Avatar"
                      width={40}
                      height={40}
                      className="h-10 w-10 object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center text-slate-500">
                      <UserCircle size={24} />
                    </div>
                  )}
                </div>
                {!collapsed ? (
                  <>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm">{displayName}</p>
                      <p className="truncate text-xs text-slate-500">{profile?.email ?? "..."}</p>
                    </div>
                    <CaretUp size={14} className="text-slate-500" />
                  </>
                ) : null}
              </button>

              {menuOpen ? (
                <div className="absolute bottom-16 left-2 right-2 z-20 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <Link href="/configuracoes" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100">
                    <Waveform size={16} />
                    Minha Assinatura
                  </Link>
                  <Link href="/perfil" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100">
                    <UserCircle size={16} />
                    Meu Perfil
                  </Link>
                  <a href="https://webmail.corretor.one" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100">
                    <EnvelopeSimple size={16} />
                    Acessar Webmail
                  </a>
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                  >
                    <SignOut size={16} />
                    Sair
                  </button>
                </div>
              ) : null}
            </div>
          </div>
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

          <main
            className={mainClassName ?? "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
