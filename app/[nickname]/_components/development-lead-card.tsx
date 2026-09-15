"use client";

import Image from "next/image";
import { FormEvent, useRef, useState } from "react";
import { ChatCircleText, CheckCircle, PaperPlaneTilt, WhatsappLogo } from "@phosphor-icons/react";

import { getBrowserAttributionContext, trackPublicEvent } from "@/lib/marketing/browser-attribution";
import { getAccessToken } from "@/lib/client/auth-api";
import { LeadWhatsAppButton } from "./lead-whatsapp-button";

type SubmitState = "idle" | "submitting" | "success" | "error";

export function DevelopmentLeadCard({ nickname, developmentId, title, phase, brokerName, brokerAvatarUrl, brokerCreci, whatsappAvailable }: {
  nickname: string; developmentId: string; title: string; phase: string; brokerName: string;
  brokerAvatarUrl: string | null; brokerCreci?: string | null; whatsappAvailable: boolean;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(`Tenho interesse no empreendimento ${title}.`);
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);
  const started = useRef(false);

  function startForm() {
    if (started.current) return;
    started.current = true;
    void trackPublicEvent("DEVELOPMENT", developmentId, "FORM_START", { form_key: "development_info" }).catch(() => undefined);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setState("submitting"); setFeedback(null);
    try {
      const attribution = getBrowserAttributionContext();
      const token = await getAccessToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch("/api/public/lead-forms", { method: "POST", headers, body: JSON.stringify({
        form_key: "development_info", nickname, nome: name, telefone: phone, email, mensagem: message, website,
        ...attribution,
        utm: { source: attribution.source, medium: attribution.medium, campaign: attribution.campaign, content: attribution.content, term: attribution.term },
        context: { empreendimento_id: developmentId, empreendimento_titulo: title },
      }) });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) { setState("error"); setFeedback(payload.error?.message || "Não foi possível enviar agora."); return; }
      setState("success"); setFeedback("Interesse enviado. O corretor vai entrar em contato.");
    } catch { setState("error"); setFeedback("Não foi possível enviar agora. Verifique sua conexão e tente novamente."); }
  }

  return (
    <aside id="atendimento-empreendimento" className="lg:sticky lg:top-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--grey-olive)]">{phase}</p>
        <h2 className="mt-2 text-2xl font-light leading-tight text-slate-950">Receba todos os detalhes</h2>
        <div className="mt-5 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-full bg-slate-200">
            {brokerAvatarUrl ? <Image src={brokerAvatarUrl} alt={brokerName} fill sizes="48px" className="object-cover" unoptimized /> : <div className="flex h-full items-center justify-center font-bold">{brokerName.slice(0, 1)}</div>}
          </div>
          <div className="min-w-0"><p className="text-xs font-light text-slate-500">Atendimento por</p><p className="truncate font-bold">{brokerName}</p></div>
        </div>
        {whatsappAvailable ? (
          <LeadWhatsAppButton nickname={nickname} brokerName={brokerName} avatarUrl={brokerAvatarUrl} creci={brokerCreci} empreendimentoId={developmentId} empreendimentoTitulo={title} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-600">
            <WhatsappLogo size={18} weight="fill" /> Falar no WhatsApp
          </LeadWhatsAppButton>
        ) : null}
        <div className="mt-5 border-t border-slate-200 pt-5">
          {state === "success" ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><p className="flex items-center gap-2 font-bold"><CheckCircle size={18} weight="fill" /> Interesse enviado</p><p className="mt-2 font-light leading-6">{feedback}</p></div> : (
            <form onSubmit={submit} onFocus={startForm}>
              <p className="flex items-center gap-2 text-sm font-bold"><ChatCircleText size={18} /> Solicitar atendimento</p>
              <input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} className="hidden" aria-hidden="true" />
              <div className="mt-3 grid gap-3">
                <input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[var(--primary-scarlet)]" placeholder="Seu nome" autoComplete="name" required />
                <input value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[var(--primary-scarlet)]" placeholder="(11) 99999-9999" autoComplete="tel" inputMode="tel" required />
                <input value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[var(--primary-scarlet)]" placeholder="E-mail" autoComplete="email" inputMode="email" required />
                <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[var(--primary-scarlet)]" placeholder="Mensagem" />
              </div>
              {feedback ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{feedback}</p> : null}
              <button type="submit" disabled={state === "submitting"} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"><PaperPlaneTilt size={17} weight="fill" />{state === "submitting" ? "Enviando..." : "Enviar interesse"}</button>
            </form>
          )}
        </div>
      </div>
    </aside>
  );
}
