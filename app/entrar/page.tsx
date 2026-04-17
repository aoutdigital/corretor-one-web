"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { EnvelopeSimple } from "@phosphor-icons/react";

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
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadingPassword(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoadingPassword(false);

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

  async function handleGoogleLogin() {
    setError(null);
    setLoadingGoogle(true);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/onboarding`,
      },
    });

    setLoadingGoogle(false);

    if (oauthError) {
      setError(oauthError.message);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--blue-slate)] focus:ring-2 focus:ring-[color:rgba(89,101,111,0.2)]";

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="min-h-screen md:flex md:items-stretch md:justify-between">
        <section className="order-2 px-6 py-10 md:order-1 md:flex-1 md:px-10 md:py-12 md:pr-12">
          <Link href="/" className="mb-8 inline-block" aria-label="Voltar para home">
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

          <p className="mb-2 text-xs font-light uppercase tracking-widest text-[var(--grey-olive)]">
            Acesso ao app
          </p>
          <h1 className="text-4xl font-bold leading-tight">Entrar na sua conta</h1>
          <p className="mt-4 max-w-lg text-base font-light text-[var(--blue-slate)]">
            Acesse seu painel para gerenciar imóveis, leads, marketing e assinatura.
          </p>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-lg font-bold">Faça login para continuar</h2>

            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => void handleGoogleLogin()}
                disabled={loadingGoogle}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-light text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Image src="/images/google-icon.svg" alt="Google" width={18} height={18} aria-hidden />
                {loadingGoogle ? "Conectando..." : "Entrar com Google"}
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="h-px flex-1 bg-slate-300" />
                ou
                <div className="h-px flex-1 bg-slate-300" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-light text-[var(--blue-slate)]">E-mail</label>
                  <input
                    type="email"
                    placeholder="seuemail@dominio.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-light text-[var(--blue-slate)]">Senha</label>
                  <input
                    type="password"
                    placeholder="Sua senha"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loadingPassword}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <EnvelopeSimple size={18} />
                  {loadingPassword ? "Entrando..." : "Entrar com e-mail e senha"}
                </button>
                <div className="text-center">
                  <Link
                    href="/recuperar-senha"
                    className="text-xs font-semibold text-[var(--primary-scarlet)] underline"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
              </form>
            </div>

            {error ? (
              <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            <p className="mt-4 text-sm font-light text-[var(--blue-slate)]">
              Não tem conta?{" "}
              <Link href="/criar-conta" className="font-bold text-[var(--primary-scarlet)] underline">
                Criar conta
              </Link>
            </p>
          </div>
        </section>

        <section className="relative order-1 aspect-[16/9] min-h-[28vh] md:order-2 md:sticky md:top-0 md:h-screen md:w-auto md:shrink-0 md:aspect-[1/1]">
          <Image
            src="/images/aykafelix-corretora-demo-banner-login.jpeg"
            alt="Corretor.one login"
            fill
            className="object-cover"
            sizes="(min-width: 768px) 80vh, 100vw"
            priority
          />
          <div className="absolute inset-0 bg-black/20" />
        </section>
      </div>
    </main>
  );
}
