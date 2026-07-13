"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { ChatCircleText, CheckCircle, PaperPlaneTilt, PhoneCall, WhatsappLogo } from "@phosphor-icons/react";

import { LeadWhatsAppButton } from "./lead-whatsapp-button";
import { ProtectedPhoneButton } from "./protected-phone-button";

type SubmitState = "idle" | "submitting" | "success" | "error";

type PropertyLeadCardProps = {
  nickname: string;
  imovelId: string;
  slugImovel: string;
  title: string;
  operationLabel: string;
  price: string;
  carryingCosts: Array<{ label: string; value: string; period: string }>;
  brokerName: string;
  brokerAvatarUrl: string | null;
  brokerCreci?: string | null;
  whatsappHref: string | null;
  phoneAvailable: boolean;
};

function normalizeErrorMessage(value: unknown) {
  if (!value || typeof value !== "object") return "Não foi possível enviar agora. Tente novamente.";
  const error = (value as { error?: { message?: unknown } }).error;
  return typeof error?.message === "string" ? error.message : "Não foi possível enviar agora. Tente novamente.";
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

export function PropertyLeadCard({
  nickname,
  imovelId,
  title,
  operationLabel,
  price,
  carryingCosts,
  brokerName,
  brokerAvatarUrl,
  brokerCreci,
  whatsappHref,
  phoneAvailable,
}: PropertyLeadCardProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(`Tenho interesse neste imóvel: ${title}`);
  const [website, setWebsite] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("submitting");
    setFeedback(null);

    try {
      const response = await fetch("/api/public/lead-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_key: "property_info",
          nickname,
          nome: name,
          telefone: phone,
          email,
          mensagem: message,
          website,
          page_url: window.location.href,
          referrer: document.referrer,
          utm: getUtmParams(),
          context: {
            imovel_id: imovelId,
            imovel_titulo: title,
          },
        }),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        setSubmitState("error");
        setFeedback(normalizeErrorMessage(payload));
        return;
      }

      setSubmitState("success");
      setFeedback("Pedido enviado. O corretor recebeu seu interesse neste imóvel.");
      setMessage(`Tenho interesse neste imóvel: ${title}`);
    } catch {
      setSubmitState("error");
      setFeedback("Não foi possível enviar agora. Verifique sua conexão e tente novamente.");
    }
  }

  return (
    <aside id="atendimento-imovel" className="lg:sticky lg:top-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--grey-olive)]">{operationLabel}</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{price}</p>
          </div>
        </div>

        {carryingCosts.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-[var(--blue-slate)]">
            {carryingCosts.map((cost) => (
              <p key={cost.label} className="flex items-start leading-none">
                <span className="mr-1 text-sm font-light leading-none">{cost.label}:</span>
                <span className="relative top-[3px] text-[10px] font-light leading-none">R$ </span>
                <span className="text-sm font-light leading-none">{cost.value}</span>
                <span className="relative top-[4px] ml-1 text-[10px] font-light leading-none">{cost.period}</span>
              </p>
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-full bg-slate-200">
            {brokerAvatarUrl ? (
              <Image src={brokerAvatarUrl} alt={brokerName} fill sizes="48px" className="object-cover" unoptimized />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-600">
                {brokerName.slice(0, 1)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-light text-slate-500">Atendimento por</p>
            <p className="truncate font-bold text-slate-950">{brokerName}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          {whatsappHref ? (
            <LeadWhatsAppButton
              nickname={nickname}
              brokerName={brokerName}
              avatarUrl={brokerAvatarUrl}
              creci={brokerCreci}
              imovelId={imovelId}
              imovelTitulo={title}
              label="Falar no WhatsApp"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600"
            >
              <WhatsappLogo size={18} weight="fill" />
              Falar no WhatsApp
            </LeadWhatsAppButton>
          ) : null}
          {phoneAvailable ? (
            <ProtectedPhoneButton
              nickname={nickname}
              brokerName={brokerName}
              avatarUrl={brokerAvatarUrl}
              creci={brokerCreci}
              imovelId={imovelId}
              imovelTitulo={title}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
            >
              <PhoneCall size={18} />
              Ligar agora
            </ProtectedPhoneButton>
          ) : null}
        </div>

        <div className="mt-5 border-t border-slate-200 pt-5">
          {submitState === "success" ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-800">
              <p className="flex items-center gap-2 text-sm font-bold">
                <CheckCircle size={18} weight="fill" />
                Pedido enviado
              </p>
              <p className="mt-2 text-sm font-light leading-6">
                O corretor recebeu seu interesse neste imóvel e vai entrar em contato.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="flex items-center gap-2 text-sm font-bold text-slate-950">
                <ChatCircleText size={18} />
                Receber atendimento
              </p>

              <input
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                className="hidden"
                aria-hidden="true"
              />

              <div className="mt-3 grid gap-3">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--primary-scarlet)] focus:ring-4 focus:ring-red-100"
                  placeholder="Seu nome"
                  autoComplete="name"
                  required
                />
                <input
                  value={phone}
                  onChange={(event) => setPhone(formatBrPhone(event.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--primary-scarlet)] focus:ring-4 focus:ring-red-100"
                  placeholder="(11) 99999-9999"
                  autoComplete="tel"
                  inputMode="tel"
                  required
                />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--primary-scarlet)] focus:ring-4 focus:ring-red-100"
                  placeholder="E-mail"
                  autoComplete="email"
                  inputMode="email"
                  required
                />
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--primary-scarlet)] focus:ring-4 focus:ring-red-100"
                  placeholder="Mensagem"
                />
              </div>

              {feedback ? (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                  {feedback}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitState === "submitting"}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-4 py-3 text-sm font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <PaperPlaneTilt size={17} weight="fill" />
                {submitState === "submitting" ? "Enviando..." : "Enviar interesse"}
              </button>
            </form>
          )}
        </div>
      </div>
    </aside>
  );
}
