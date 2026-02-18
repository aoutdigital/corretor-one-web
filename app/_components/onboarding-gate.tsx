"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { apiFetchWithAuth } from "@/lib/client/auth-api";
import { supabase } from "@/lib/supabaseClient";

type ProfileGate = {
  primeiro_nome: string | null;
  sobrenome: string | null;
  nickname: string | null;
  genero: "MASCULINO" | "FEMININO" | "NAO_INFORMAR" | null;
  uf: string | null;
  cidades_foco: string[] | null;
  telefone: string | null;
  whatsapp_verificado_em: string | null;
  plano_id: string | null;
  imoveis_residenciais: boolean;
  imoveis_comerciais: boolean;
  imoveis_industriais: boolean;
  imoveis_alto_padrao: boolean;
  imoveis_luxo: boolean;
  imoveis_medio_padrao: boolean;
  imoveis_baixa_renda: boolean;
};

function isOnboardingComplete(profile: ProfileGate): boolean {
  const nomeOk =
    (profile.primeiro_nome?.trim().length ?? 0) >= 2 && (profile.sobrenome?.trim().length ?? 0) >= 2;
  if (!nomeOk) return false;
  if (!profile.nickname) return false;
  if (!profile.genero) return false;
  if (!profile.uf || !profile.cidades_foco || profile.cidades_foco.length === 0) return false;
  if (!profile.telefone) return false;
  if (!profile.whatsapp_verificado_em) return false;
  if (!profile.plano_id) return false;

  const focoSelecionado = [
    profile.imoveis_residenciais,
    profile.imoveis_comerciais,
    profile.imoveis_industriais,
    profile.imoveis_alto_padrao,
    profile.imoveis_luxo,
    profile.imoveis_medio_padrao,
    profile.imoveis_baixa_renda,
  ].filter(Boolean).length;

  return focoSelecionado > 0;
}

export function OnboardingGate() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const bypassPaths = ["/entrar", "/criar-conta", "/onboarding"];
    if (bypassPaths.includes(pathname)) return;

    let active = true;

    async function check() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;

      if (!data.session) {
        router.replace("/entrar");
        return;
      }

      const profile = await apiFetchWithAuth<ProfileGate>("/api/profile");
      if (!active) return;

      if (!profile.ok) {
        router.replace("/onboarding");
        return;
      }

      if (!isOnboardingComplete(profile.data)) {
        router.replace("/onboarding");
      }
    }

    void check();
    return () => {
      active = false;
    };
  }, [pathname, router]);

  return null;
}
