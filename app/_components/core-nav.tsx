"use client";

import Link from "next/link";
import { OnboardingGate } from "@/app/_components/onboarding-gate";

const links = [
  { href: "/", label: "Home" },
  { href: "/entrar", label: "Entrar" },
  { href: "/criar-conta", label: "Criar conta" },
  { href: "/onboarding", label: "Onboarding" },
  { href: "/perfil", label: "Perfil" },
  { href: "/configuracoes", label: "Configuracoes" },
  { href: "/negocios", label: "Negocios" },
  { href: "/imoveis", label: "Imoveis" },
  { href: "/empreendimentos", label: "Empreendimentos" },
];

export function CoreNav() {
  return (
    <>
      <OnboardingGate />
      <nav style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              padding: "8px 12px",
              border: "1px solid #2f3542",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
