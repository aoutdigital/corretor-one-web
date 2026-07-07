"use client";

import Image from "next/image";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, SpinnerGap, WhatsappLogo, X } from "@phosphor-icons/react";

type LeadWhatsAppButtonProps = {
  nickname: string;
  brokerName: string;
  label?: string;
  className?: string;
  children?: ReactNode;
  avatarUrl?: string | null;
  creci?: string | null;
  imovelId?: string | null;
  imovelTitulo?: string | null;
};

type SubmitState = "idle" | "submitting" | "success" | "error";

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Não foi possível abrir o WhatsApp agora.";
  const error = (payload as { error?: { message?: unknown } }).error;
  return typeof error?.message === "string" ? error.message : "Não foi possível abrir o WhatsApp agora.";
}

function getUtmParams() {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};

  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const value = params.get(key);
    if (value) utm[key] = value;
  }

  return utm;
}

function formatBrPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  const ddd = digits.slice(0, 2);
  const prefix = digits.length > 10 ? digits.slice(2, 7) : digits.slice(2, 6);
  const suffix = digits.length > 10 ? digits.slice(7, 11) : digits.slice(6, 10);

  if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : "";
  if (!prefix) return `(${ddd})`;
  if (!suffix) return `(${ddd}) ${prefix}`;
  return `(${ddd}) ${prefix}-${suffix}`;
}

export function LeadWhatsAppButton({
  nickname,
  brokerName,
  label = "Falar agora",
  className,
  children,
  avatarUrl,
  creci,
  imovelId,
  imovelTitulo,
}: LeadWhatsAppButtonProps) {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const defaultMessage = useMemo(() => {
    if (imovelTitulo) return `Tenho interesse neste imóvel: ${imovelTitulo}`;
    return "Quero conversar sobre imóveis e oportunidades.";
  }, [imovelTitulo]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open && !message) setMessage(defaultMessage);
  }, [defaultMessage, message, open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("submitting");
    setFeedback(null);

    try {
      const response = await fetch("/api/public/lead-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_key: "whatsapp_contact",
          nickname,
          nome: firstName,
          sobrenome: lastName,
          telefone: phone,
          email,
          mensagem: message,
          website,
          page_url: window.location.href,
          referrer: document.referrer,
          utm: getUtmParams(),
          context: {
            imovel_id: imovelId ?? null,
            imovel_titulo: imovelTitulo ?? null,
          },
        }),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        setSubmitState("error");
        setFeedback(getErrorMessage(payload));
        return;
      }

      const whatsappUrl = (payload as { data?: { whatsapp_url?: unknown } }).data?.whatsapp_url;
      setSubmitState("success");
      setFeedback("Tudo certo. Vou abrir o WhatsApp para continuarmos por lá.");

      if (typeof whatsappUrl === "string" && whatsappUrl.length > 0) {
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      }

      window.setTimeout(() => setOpen(false), 700);
    } catch {
      setSubmitState("error");
      setFeedback("Não foi possível abrir o WhatsApp agora. Verifique sua conexão e tente novamente.");
    }
  }

  function handlePhoneChange(value: string) {
    setPhone(formatBrPhone(value));
  }

  const modal =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
            <div className="relative max-h-[calc(100vh-4rem)] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl shadow-slate-950/25">
              <button
                type="button"
                className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                aria-label="Fechar"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>

              <div className="border-b border-slate-200 px-6 py-6 pr-16">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--grey-olive)]">WhatsApp</p>
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white text-slate-600 shadow-sm">
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt={brokerName} fill sizes="56px" className="object-cover" unoptimized />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg font-bold">
                        {brokerName.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-light text-slate-500">Atendimento por</p>
                    <p className="truncate text-base font-bold text-slate-950">{brokerName}</p>
                    {creci ? (
                      <p className="mt-0.5 text-xs font-medium uppercase tracking-[0.12em] text-[var(--grey-olive)]">
                        {creci}
                      </p>
                    ) : null}
                  </div>
                </div>
                <h2 className="mt-2 text-3xl font-light leading-tight text-slate-950">
                  Vou te atender melhor com um pouco de contexto.
                </h2>
                <p className="mt-3 text-sm font-light leading-6 text-slate-600">
                  Deixe seu contato antes de abrir o WhatsApp com {brokerName}.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="px-6 py-6">
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  className="hidden"
                  aria-hidden="true"
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--grey-olive)] focus:ring-4 focus:ring-[var(--grey-olive)]/10"
                    placeholder="Nome"
                    autoComplete="given-name"
                  />
                  <input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--grey-olive)] focus:ring-4 focus:ring-[var(--grey-olive)]/10"
                    placeholder="Sobrenome"
                    autoComplete="family-name"
                  />
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input
                    value={phone}
                    onChange={(event) => handlePhoneChange(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--grey-olive)] focus:ring-4 focus:ring-[var(--grey-olive)]/10"
                    placeholder="(11) 99999-9999"
                    autoComplete="tel"
                    inputMode="tel"
                  />
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--grey-olive)] focus:ring-4 focus:ring-[var(--grey-olive)]/10"
                    placeholder="E-mail"
                    autoComplete="email"
                    inputMode="email"
                    required
                  />
                </div>

                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={4}
                  className="mt-3 w-full resize-none rounded-lg border border-slate-300 px-3 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--grey-olive)] focus:ring-4 focus:ring-[var(--grey-olive)]/10"
                  placeholder="Mensagem"
                />

                {feedback ? (
                  <div
                    className={[
                      "mt-3 rounded-lg border px-3 py-2 text-sm font-medium",
                      submitState === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700",
                    ].join(" ")}
                  >
                    {feedback}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    onClick={() => setOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitState === "submitting"}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {submitState === "submitting" ? <SpinnerGap size={18} className="animate-spin" /> : <WhatsappLogo size={18} weight="fill" />}
                    Abrir WhatsApp
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children ?? (
          <>
            {label}
            <ArrowRight size={16} />
          </>
        )}
      </button>
      {modal}
    </>
  );
}
