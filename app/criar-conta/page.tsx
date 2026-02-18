"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, EnvelopeSimple, ShieldCheck } from "@phosphor-icons/react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  evaluatePasswordPolicy,
  passwordStrengthLabel,
} from "@/lib/security/password-policy";
import { supabase } from "@/lib/supabaseClient";

const UF_OPTIONS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

export default function CriarContaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<1 | 2>(1);
  const [validatingCreci, setValidatingCreci] = useState(false);
  const [creatingEmailAccount, setCreatingEmailAccount] = useState(false);
  const [creatingGoogleAccount, setCreatingGoogleAccount] = useState(false);
  const [signupMethod, setSignupMethod] = useState<"email" | null>(null);
  const [emailSignupCompleted, setEmailSignupCompleted] = useState(false);

  const [uf, setUf] = useState("");
  const [creciNumero, setCreciNumero] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    uf?: string;
    creciNumero?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const desiredPlanSlug = useMemo(() => {
    const raw = (searchParams.get("plano") ?? "").toLowerCase().trim();
    if (!raw) return null;
    if (!/^[a-z0-9-]{2,35}$/.test(raw)) return null;
    return raw;
  }, [searchParams]);

  useEffect(() => {
    if (!desiredPlanSlug) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem("co_signup_plano_slug", desiredPlanSlug);
  }, [desiredPlanSlug]);

  const creciLabel = useMemo(() => (uf ? `CRECI/${uf}` : "CRECI/UF"), [uf]);
  const creciInputValue = useMemo(() => (creciNumero ? `${creciNumero}-F` : ""), [creciNumero]);
  const creciDisplay = `${creciNumero || "______"}-F`;
  const passwordPolicy = useMemo(() => evaluatePasswordPolicy(password), [password]);
  const inputBaseClass =
    "w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition focus:ring-2";

  function getInputClass(hasError: boolean) {
    return `${inputBaseClass} ${
      hasError
        ? "border-[var(--primary-scarlet)] focus:border-[var(--primary-scarlet)] focus:ring-[color:rgba(229,35,43,0.25)]"
        : "border-slate-300 focus:border-[var(--blue-slate)] focus:ring-[color:rgba(89,101,111,0.2)]"
    }`;
  }

  function sanitizeCreci(value: string) {
    return value.replace(/\D/g, "").slice(0, 6);
  }

  async function handleValidateCreci(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setFieldErrors({});

    const nextErrors: typeof fieldErrors = {};

    if (!uf) {
      nextErrors.uf = "Selecione seu estado (UF).";
    }

    if (!/^[0-9]{1,6}$/.test(creciNumero)) {
      nextErrors.creciNumero = "Digite um CRECI numérico válido com até 6 dígitos.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setValidatingCreci(true);

    const response = await fetch("/api/auth/validate-creci", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uf,
        creci_numero: creciNumero,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          ok: boolean;
          data?: { valid: boolean; reason?: string; message?: string };
          error?: { message?: string };
        }
      | null;

    setValidatingCreci(false);

    if (!response.ok || !payload?.ok) {
      setError(payload?.error?.message ?? "Falha ao continuar com os dados de CRECI.");
      return;
    }

    if (!payload.data?.valid) {
      if (payload.data?.reason === "DUPLICATE") {
        setError("Este CRECI já está vinculado a uma conta. Faça login ou recupere seu acesso.");
      } else {
        setError(payload.data?.message ?? "Não foi possível continuar com o CRECI informado.");
      }
      return;
    }

    setMessage(null);
    setSignupMethod(null);
    setStep(2);
  }

  async function handleEmailSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setFieldErrors({});

    const nextErrors: typeof fieldErrors = {};

    if (!email) {
      nextErrors.email = "Informe um e-mail válido.";
    }

    if (!passwordPolicy.isValid) {
      nextErrors.password =
        "Senha inválida. Use no mínimo 8 caracteres, 1 letra maiúscula e 1 número.";
    }

    if (password !== confirmPassword) {
      nextErrors.confirmPassword = "A confirmação de senha não confere.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setCreatingEmailAccount(true);

    const onboardingPath = desiredPlanSlug
      ? `/onboarding?plano=${encodeURIComponent(desiredPlanSlug)}`
      : "/onboarding";

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${onboardingPath}`,
        data: {
          creci_uf: uf,
          creci_numero: creciNumero,
          creci_sufixo: "F",
        },
      },
    });

    setCreatingEmailAccount(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "co_signup_creci",
        JSON.stringify({ creci_uf: uf, creci_numero: creciNumero, creci_sufixo: "F" }),
      );
      if (desiredPlanSlug) {
        window.localStorage.setItem("co_signup_plano_slug", desiredPlanSlug);
      }
    }

    if (data.session) {
      router.push(onboardingPath);
      return;
    }

    setSignupMethod(null);
    setEmailSignupCompleted(true);
    setMessage("Conta criada. Verifique seu e-mail para confirmar o acesso.");
  }

  async function handleGoogleSignup() {
    setError(null);
    setMessage(null);

    if (step !== 2) {
      setError("Preencha o passo anterior para continuar com Google.");
      return;
    }

    setCreatingGoogleAccount(true);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "co_signup_creci",
        JSON.stringify({ creci_uf: uf, creci_numero: creciNumero, creci_sufixo: "F" }),
      );
      if (desiredPlanSlug) {
        window.localStorage.setItem("co_signup_plano_slug", desiredPlanSlug);
      }
    }

    const onboardingPath = desiredPlanSlug
      ? `/onboarding?plano=${encodeURIComponent(desiredPlanSlug)}`
      : "/onboarding";

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${onboardingPath}`,
      },
    });

    setCreatingGoogleAccount(false);

    if (oauthError) {
      setError(oauthError.message);
    }
  }

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

          {step === 1 ? (
            <>
              <p className="mb-2 text-xs font-light uppercase tracking-widest text-[var(--grey-olive)]">
                Ritual de entrada
              </p>
              <h1 className="text-4xl font-bold leading-tight">Você está a um passo de se tornar um Corretor.one</h1>
              <p className="mt-4 max-w-lg text-base font-light text-[var(--blue-slate)]">
                Construa sua presença digital, fortaleça sua autoridade e transforme sua carreira com estratégia e
                tecnologia.
              </p>

              <ul className="mt-6 space-y-2 text-sm font-light text-[var(--blue-slate)]">
                <li className="flex items-center gap-2">
                  <CheckCircle size={18} className="text-[var(--primary-scarlet)]" /> Plataforma exclusiva para
                  corretores autônomos
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={18} className="text-[var(--primary-scarlet)]" /> Posicionamento profissional
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={18} className="text-[var(--primary-scarlet)]" /> Ferramentas reais de marketing
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={18} className="text-[var(--primary-scarlet)]" /> Independência com estrutura
                </li>
              </ul>

              <p className="mt-6 text-lg font-bold leading-tight text-[var(--black)]">
                Seu nome.
                <br />
                Sua marca.
                <br />
                Seu território digital.
              </p>
            </>
          ) : (
            <>
              <p className="mb-2 text-xs font-light uppercase tracking-widest text-[var(--grey-olive)]">Passo 2</p>
              <h1 className="text-4xl font-bold leading-tight">Crie sua conta</h1>
            </>
          )}

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-light text-[var(--blue-slate)]">
              <ShieldCheck size={16} className="text-[var(--primary-scarlet)]" /> Acesso restrito a profissionais
              credenciados
            </p>

            {step === 1 ? (
              <form noValidate onSubmit={handleValidateCreci} className="space-y-4">
                <h2 className="text-lg font-bold">Cadastro exclusivo para Corretores Pessoa Física</h2>

                <div>
                  <label className="mb-1 block text-sm font-light text-[var(--blue-slate)]">Estado (UF)</label>
                  <select
                    value={uf}
                    onChange={(event) => {
                      setUf(event.target.value);
                      setFieldErrors((prev) => ({ ...prev, uf: undefined }));
                    }}
                    className={getInputClass(Boolean(fieldErrors.uf))}
                    required
                    aria-invalid={Boolean(fieldErrors.uf)}
                  >
                    <option value="">Selecione seu estado</option>
                    {UF_OPTIONS.map((itemUf) => (
                      <option key={itemUf} value={itemUf}>
                        {itemUf}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.uf ? (
                    <p className="mt-1 text-xs font-light text-[var(--primary-scarlet)]">{fieldErrors.uf}</p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-light text-[var(--blue-slate)]">{creciLabel}</label>
                  <div
                    className={`${getInputClass(Boolean(fieldErrors.creciNumero))} ${
                      !uf ? "cursor-not-allowed bg-slate-100 text-slate-400" : ""
                    }`}
                  >
                    <input
                      value={creciInputValue}
                      onChange={(event) => {
                        setCreciNumero(sanitizeCreci(event.target.value));
                        setFieldErrors((prev) => ({ ...prev, creciNumero: undefined }));
                      }}
                      inputMode="numeric"
                      pattern="[0-9]{1,6}-F"
                      maxLength={8}
                      placeholder="123456-F"
                      className="w-full border-none bg-transparent text-sm outline-none placeholder:text-slate-300"
                      required
                      aria-invalid={Boolean(fieldErrors.creciNumero)}
                      disabled={!uf}
                    />
                  </div>
                  {fieldErrors.creciNumero ? (
                    <p className="mt-1 text-xs font-light text-[var(--primary-scarlet)]">{fieldErrors.creciNumero}</p>
                  ) : null}
                  <p className="mt-1 text-xs font-light text-[var(--blue-slate)]">Utilizamos seu CRECI para impedir duplicidade de cadastro. A validação documental será feita depois.</p>
                  <p className="mt-1 text-xs font-light text-[var(--grey-olive)]">Formato: {creciDisplay}</p>
                </div>

                <button
                  type="submit"
                  disabled={validatingCreci}
                  className="w-full cursor-pointer rounded-lg bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {validatingCreci ? "Continuando..." : "Continuar"}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                {!emailSignupCompleted ? (
                  <>
                    <h2 className="text-lg font-bold">Como deseja criar sua conta?</h2>
                    <p className="text-sm font-light text-emerald-700">
                      Dados recebidos com sucesso. Agora escolha a forma de acesso.
                    </p>
                  </>
                ) : null}

                {emailSignupCompleted ? (
                  <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <h2 className="text-lg font-bold text-emerald-900">Conta criada com sucesso</h2>
                    <p className="text-sm font-light text-emerald-800">
                      Enviamos um e-mail de confirmação. Acesse sua caixa de entrada, confirme o cadastro e depois
                      entre para continuar o onboarding.
                    </p>
                    <Link
                      href="/entrar"
                      className="inline-flex cursor-pointer rounded-lg bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-bold text-white transition hover:brightness-95"
                    >
                      Ir para entrar
                    </Link>
                  </div>
                ) : !signupMethod ? (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setSignupMethod("email")}
                      className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-bold text-white transition hover:brightness-95"
                    >
                      <EnvelopeSimple size={18} />
                      Criar conta com e-mail e senha
                    </button>

                    <button
                      type="button"
                      onClick={handleGoogleSignup}
                      disabled={creatingGoogleAccount}
                      className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-light text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <Image src="/images/google-icon.svg" alt="Google" width={18} height={18} aria-hidden />
                      {creatingGoogleAccount
                        ? "Conectando..."
                        : "Criar conta usando sua conta Google"}
                    </button>

                    <p className="text-xs font-light text-[var(--blue-slate)]">
                      Mais rápido e seguro. Não publicamos nada em sua conta.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <form noValidate onSubmit={handleEmailSignup} className="space-y-3">
                      <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          setFieldErrors((prev) => ({ ...prev, email: undefined }));
                        }}
                        className={getInputClass(Boolean(fieldErrors.email))}
                        required
                        aria-invalid={Boolean(fieldErrors.email)}
                      />
                      {fieldErrors.email ? (
                        <p className="-mt-1 text-xs font-light text-[var(--primary-scarlet)]">
                          {fieldErrors.email}
                        </p>
                      ) : null}
                      <input
                        type="password"
                        placeholder="Senha"
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          setFieldErrors((prev) => ({ ...prev, password: undefined }));
                        }}
                        className={getInputClass(Boolean(fieldErrors.password))}
                        required
                        aria-invalid={Boolean(fieldErrors.password)}
                      />
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full transition-all ${
                                passwordPolicy.strength === "strong"
                                  ? "bg-emerald-500"
                                  : passwordPolicy.strength === "medium"
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                              }`}
                              style={{ width: `${(passwordPolicy.score / 3) * 100}%` }}
                            />
                          </div>
                          <span
                            className={`text-xs font-semibold ${
                              passwordPolicy.strength === "strong"
                                ? "text-emerald-700"
                                : passwordPolicy.strength === "medium"
                                  ? "text-amber-700"
                                  : "text-rose-700"
                            }`}
                          >
                            {passwordStrengthLabel(passwordPolicy.strength)}
                          </span>
                        </div>
                        <ul className="space-y-1 text-xs text-slate-600">
                          <li className={passwordPolicy.lengthOk ? "text-emerald-700" : ""}>
                            Mínimo de 8 caracteres
                          </li>
                          <li className={passwordPolicy.hasUppercase ? "text-emerald-700" : ""}>
                            Pelo menos 1 letra maiúscula
                          </li>
                          <li className={passwordPolicy.hasNumber ? "text-emerald-700" : ""}>
                            Pelo menos 1 número
                          </li>
                        </ul>
                      </div>
                      {fieldErrors.password ? (
                        <p className="-mt-1 text-xs font-light text-[var(--primary-scarlet)]">
                          {fieldErrors.password}
                        </p>
                      ) : null}
                      <input
                        type="password"
                        placeholder="Confirmar senha"
                        value={confirmPassword}
                        onChange={(event) => {
                          setConfirmPassword(event.target.value);
                          setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                        }}
                        className={getInputClass(Boolean(fieldErrors.confirmPassword))}
                        minLength={8}
                        required
                        aria-invalid={Boolean(fieldErrors.confirmPassword)}
                      />
                      {fieldErrors.confirmPassword ? (
                        <p className="-mt-1 text-xs font-light text-[var(--primary-scarlet)]">
                          {fieldErrors.confirmPassword}
                        </p>
                      ) : null}

                      <button
                        type="submit"
                        disabled={creatingEmailAccount}
                        className="w-full cursor-pointer rounded-lg bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {creatingEmailAccount ? "Criando conta..." : "Criar conta"}
                      </button>
                    </form>

                    <button
                      type="button"
                      onClick={() => setSignupMethod(null)}
                      className="w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-light text-slate-700 transition hover:bg-slate-100"
                    >
                      Voltar para opções
                    </button>
                  </div>
                )}
              </div>
            )}

            {error ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <p>{error}</p>
                {error.includes("já está vinculado") ? (
                  <div className="mt-2 flex gap-3 text-xs">
                    <Link href="/entrar" className="font-bold underline">
                      Entrar
                    </Link>
                    <Link href="/entrar" className="underline">
                      Esqueci minha senha
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : null}

            {message ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

            <p className="mt-3 text-sm font-light text-[var(--blue-slate)]">
              Já tem conta?{" "}
              <Link href="/entrar" className="font-bold text-[var(--primary-scarlet)] underline">
                Entrar
              </Link>
            </p>
          </div>
        </section>

        <section className="relative order-1 min-h-[42vh] md:order-2 md:sticky md:top-0 md:h-screen md:w-auto md:shrink-0 md:aspect-[1/1]">
          <Image
            src="/images/corretor-one-criar-conta-1x1.jpeg"
            alt="Corretor.one - novo patamar profissional"
            fill
            className="object-cover"
            sizes="(min-width: 768px) 80vh, 100vw"
            priority
          />
          <div className="absolute inset-0 bg-black/25" />
        </section>
      </div>
    </main>
  );
}
