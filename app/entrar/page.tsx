"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { CoreNav } from "@/app/_components/core-nav";
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

export default function EntrarPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    const profile = await apiFetchWithAuth<ProfileGate>("/api/profile");
    if (!profile.ok) {
      router.push("/onboarding");
      return;
    }

    if (!isOnboardingComplete(profile.data)) {
      router.push("/onboarding");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main style={{ maxWidth: 520, margin: "32px auto", padding: 20 }}>
      <CoreNav />
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Entrar</h1>
      <p style={{ opacity: 0.8, marginBottom: 20 }}>Acesso ao app do corretor.</p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          style={{ padding: 10, borderRadius: 8, border: "1px solid #3f4654" }}
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          style={{ padding: 10, borderRadius: 8, border: "1px solid #3f4654" }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "none",
            background: "#1463ff",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      {error ? <p style={{ color: "#ff6b6b", marginTop: 12 }}>{error}</p> : null}

      <p style={{ marginTop: 16 }}>
        Nao tem conta? <Link href="/criar-conta">Criar conta</Link>
      </p>
    </main>
  );
}
