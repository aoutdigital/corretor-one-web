"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Key } from "@phosphor-icons/react";

import {
  evaluatePasswordPolicy,
  passwordStrengthLabel,
} from "@/lib/security/password-policy";
import { supabase } from "@/lib/supabaseClient";

export default function RedefinirSenhaPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const policy = useMemo(() => evaluatePasswordPolicy(password), [password]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!policy.isValid) {
      setError("Senha inválida. Use no mínimo 8 caracteres, 1 letra maiúscula e 1 número.");
      return;
    }

    if (password !== confirmPassword) {
      setError("A confirmação de senha não confere.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage("Senha redefinida com sucesso. Agora você já pode entrar.");
    setPassword("");
    setConfirmPassword("");
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
            Segurança da conta
          </p>
          <h1 className="text-4xl font-bold leading-tight">Crie sua nova senha</h1>
          <p className="mt-4 max-w-lg text-base font-light text-[var(--blue-slate)]">
            Defina uma senha forte para proteger seu acesso ao app.
          </p>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-lg font-bold">Redefinir senha</h2>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-light text-[var(--blue-slate)]">Nova senha</label>
                <input
                  type="password"
                  placeholder="Digite sua nova senha"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className={inputClass}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full transition-all ${
                        policy.strength === "strong"
                          ? "bg-emerald-500"
                          : policy.strength === "medium"
                            ? "bg-amber-500"
                            : "bg-rose-500"
                      }`}
                      style={{ width: `${(policy.score / 3) * 100}%` }}
                    />
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      policy.strength === "strong"
                        ? "text-emerald-700"
                        : policy.strength === "medium"
                          ? "text-amber-700"
                          : "text-rose-700"
                    }`}
                  >
                    {passwordStrengthLabel(policy.strength)}
                  </span>
                </div>
                <ul className="space-y-1 text-xs text-slate-600">
                  <li className={policy.lengthOk ? "text-emerald-700" : ""}>Mínimo de 8 caracteres</li>
                  <li className={policy.hasUppercase ? "text-emerald-700" : ""}>
                    Pelo menos 1 letra maiúscula
                  </li>
                  <li className={policy.hasNumber ? "text-emerald-700" : ""}>Pelo menos 1 número</li>
                </ul>
              </div>

              <div>
                <label className="mb-1 block text-sm font-light text-[var(--blue-slate)]">
                  Confirmar nova senha
                </label>
                <input
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Key size={18} />
                {loading ? "Atualizando..." : "Atualizar senha"}
              </button>
            </form>

            {error ? (
              <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            {message ? (
              <div className="mt-4 space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <p>{message}</p>
                <Link href="/entrar" className="inline-block font-bold underline">
                  Ir para entrar
                </Link>
              </div>
            ) : null}
          </div>
        </section>

        <section className="relative order-1 aspect-[16/9] min-h-[28vh] md:order-2 md:sticky md:top-0 md:h-screen md:w-auto md:shrink-0 md:aspect-[1/1]">
          <Image
            src="/images/corretor-one-chaves-casal.jpeg"
            alt="Corretor.one redefinir senha"
            fill
            className="object-cover object-center md:object-left"
            sizes="(min-width: 768px) 80vh, 100vw"
            priority
          />
          <div className="absolute inset-0 bg-black/20" />
        </section>
      </div>
    </main>
  );
}
