"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { EnvelopeSimple } from "@phosphor-icons/react";

import { supabase } from "@/lib/supabaseClient";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage("Enviamos um link para redefinir sua senha. Verifique seu e-mail.");
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
            Recuperação de acesso
          </p>
          <h1 className="text-4xl font-bold leading-tight">Esqueceu sua senha?</h1>
          <p className="mt-4 max-w-lg text-base font-light text-[var(--blue-slate)]">
            Informe seu e-mail para receber o link de redefinição de senha.
          </p>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-lg font-bold">Recuperar senha</h2>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
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

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <EnvelopeSimple size={18} />
                {loading ? "Enviando..." : "Enviar link de recuperação"}
              </button>
            </form>

            {error ? (
              <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            {message ? (
              <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {message}
              </p>
            ) : null}

            <p className="mt-4 text-sm font-light text-[var(--blue-slate)]">
              Lembrou sua senha?{" "}
              <Link href="/entrar" className="font-bold text-[var(--primary-scarlet)] underline">
                Entrar
              </Link>
            </p>
          </div>
        </section>

        <section className="relative order-1 aspect-[16/9] min-h-[28vh] md:order-2 md:sticky md:top-0 md:h-screen md:w-auto md:shrink-0 md:aspect-[1/1]">
          <Image
            src="/images/corretor-one-chaves-casal.jpeg"
            alt="Corretor.one recuperação de senha"
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
