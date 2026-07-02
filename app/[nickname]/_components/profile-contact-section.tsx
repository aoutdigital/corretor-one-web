"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import {
  ArrowRight,
  ChatCircleText,
  CheckCircle,
  EnvelopeSimple,
  HouseLine,
  InstagramLogo,
  LinkedinLogo,
  MapPin,
  PaperPlaneTilt,
  PhoneCall,
  Sparkle,
  Storefront,
  WhatsappLogo,
  YoutubeLogo,
} from "@phosphor-icons/react";

type ContactIntent = "COMPRAR" | "ALUGAR" | "VENDER" | "FALAR";
type SubmitState = "idle" | "submitting" | "success" | "error";

export type PublicContactChannel = {
  type: "whatsapp" | "phone" | "email" | "instagram" | "linkedin" | "youtube";
  href: string;
  label: string;
  value: string;
};

type ProfileContactSectionProps = {
  brokerName: string;
  brokerFirstName: string;
  nickname: string;
  coverUrl: string;
  avatarUrl: string | null;
  channels: PublicContactChannel[];
};

const INTENT_OPTIONS: Array<{
  value: ContactIntent;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: "COMPRAR",
    label: "Encontrar um imóvel",
    description: "Receba uma seleção alinhada ao seu momento.",
    icon: <HouseLine size={20} />,
  },
  {
    value: "ALUGAR",
    label: "Alugar com curadoria",
    description: "Conte o que precisa e acelere a busca.",
    icon: <MapPin size={20} />,
  },
  {
    value: "VENDER",
    label: "Captar meu imóvel",
    description: "Peça uma avaliação ou estratégia de venda.",
    icon: <Storefront size={20} />,
  },
  {
    value: "FALAR",
    label: "Falar com o corretor",
    description: "Tire uma dúvida ou combine o próximo passo.",
    icon: <ChatCircleText size={20} />,
  },
];

function getChannelIcon(type: PublicContactChannel["type"]) {
  if (type === "whatsapp") return <WhatsappLogo size={20} />;
  if (type === "phone") return <PhoneCall size={20} />;
  if (type === "email") return <EnvelopeSimple size={20} />;
  if (type === "instagram") return <InstagramLogo size={20} />;
  if (type === "linkedin") return <LinkedinLogo size={20} />;
  return <YoutubeLogo size={20} />;
}

function getChannelStyle(type: PublicContactChannel["type"]) {
  if (type === "whatsapp") {
    return {
      button:
        "border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 hover:bg-emerald-600 hover:border-emerald-600",
      icon: "bg-white/16 text-white",
      label: "text-white/78",
      value: "text-white",
      action: "bg-white text-emerald-700",
    };
  }

  if (type === "phone") {
    return {
      button:
        "border-sky-500 bg-sky-500 text-white shadow-sm shadow-sky-500/20 hover:bg-sky-600 hover:border-sky-600",
      icon: "bg-white/16 text-white",
      label: "text-white/78",
      value: "text-white",
      action: "bg-white text-sky-700",
    };
  }

  if (type === "instagram") {
    return {
      button:
        "border-pink-500 bg-gradient-to-r from-fuchsia-600 via-pink-500 to-orange-400 text-white shadow-sm shadow-pink-500/20 hover:brightness-105",
      icon: "bg-white/16 text-white",
      label: "text-white/78",
      value: "text-white",
      action: "bg-white text-pink-700",
    };
  }

  if (type === "linkedin") {
    return {
      button:
        "border-blue-700 bg-blue-700 text-white shadow-sm shadow-blue-700/20 hover:bg-blue-800 hover:border-blue-800",
      icon: "bg-white/16 text-white",
      label: "text-white/78",
      value: "text-white",
      action: "bg-white text-blue-700",
    };
  }

  return {
    button:
      "border-red-600 bg-red-600 text-white shadow-sm shadow-red-600/20 hover:bg-red-700 hover:border-red-700",
    icon: "bg-white/16 text-white",
    label: "text-white/78",
    value: "text-white",
    action: "bg-white text-red-700",
  };
}

function normalizeErrorMessage(value: unknown) {
  if (!value || typeof value !== "object") return "Não foi possível enviar agora. Tente novamente.";
  const error = (value as { error?: { message?: unknown } }).error;
  return typeof error?.message === "string" ? error.message : "Não foi possível enviar agora. Tente novamente.";
}

function formatPhoneDisplay(value: string) {
  const digits = value.replace(/\D/g, "");
  const localDigits = digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;

  if (localDigits.length === 11) {
    return `(${localDigits.slice(0, 2)}) ${localDigits.slice(2, 7)}-${localDigits.slice(7)}`;
  }

  if (localDigits.length === 10) {
    return `(${localDigits.slice(0, 2)}) ${localDigits.slice(2, 6)}-${localDigits.slice(6)}`;
  }

  return value;
}

function getChannelActionText(channel: PublicContactChannel) {
  if (channel.type === "whatsapp") return "Iniciar conversa no WhatsApp";
  if (channel.type === "phone") return `Ligar ${formatPhoneDisplay(channel.value)}`;
  return channel.value;
}

export function ProfileContactSection({
  brokerName,
  brokerFirstName,
  nickname,
  coverUrl,
  avatarUrl,
  channels,
}: ProfileContactSectionProps) {
  const [intent, setIntent] = useState<ContactIntent>("COMPRAR");
  const [preferredChannel, setPreferredChannel] = useState("WhatsApp");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  const primaryChannel = useMemo(() => channels.find((item) => item.type === "whatsapp") ?? channels[0], [channels]);
  const directChannels = useMemo(() => channels.filter((channel) => channel.type !== "email"), [channels]);
  const selectedIntent = INTENT_OPTIONS.find((item) => item.value === intent) ?? INTENT_OPTIONS[0];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("submitting");
    setFeedback(null);

    try {
      const response = await fetch(`/api/public/profiles/${nickname}/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          nome: name,
          telefone: phone,
          email,
          mensagem: message,
          preferred_channel: preferredChannel,
          website,
        }),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        setSubmitState("error");
        setFeedback(normalizeErrorMessage(payload));
        return;
      }

      setSubmitState("success");
      setFeedback(`Pronto. ${brokerFirstName} recebeu seu pedido e deve responder pelo canal escolhido.`);
      setMessage("");
    } catch {
      setSubmitState("error");
      setFeedback("Não foi possível enviar agora. Verifique sua conexão e tente novamente.");
    }
  }

  return (
    <section id="contato" className="border-t border-slate-200 bg-white">
      <div className="relative overflow-hidden bg-slate-950 text-white">
        <Image src={coverUrl} alt="" fill sizes="100vw" className="object-cover opacity-35" unoptimized />
        <div className="absolute inset-0 bg-slate-950/72" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-slate-950 to-transparent" />

        <div className="relative mx-auto flex min-h-[420px] max-w-7xl items-end px-5 py-14">
          <div className="grid w-full gap-8 lg:grid-cols-[1fr_0.72fr] lg:items-end">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-white/82 backdrop-blur">
                <Sparkle size={14} weight="fill" />
                Atendimento consultivo
              </span>
              <h2 className="mt-5 max-w-4xl text-4xl font-bold leading-tight md:text-6xl">
                Pronto para comprar, vender ou alugar com mais segurança?
              </h2>
              <p className="mt-5 max-w-2xl text-lg font-light leading-8 text-white/76">
                Fale com {brokerFirstName} e receba uma orientação clara para o seu momento: encontrar o imóvel certo,
                vender melhor ou tirar dúvidas antes de decidir.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#contato-form"
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-95"
                >
                  Enviar pedido
                  <ArrowRight size={18} />
                </a>
                {primaryChannel ? (
                  <a
                    href={primaryChannel.href}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/18"
                  >
                    {getChannelIcon(primaryChannel.type)}
                    {primaryChannel.type === "whatsapp" ? "Falar agora" : primaryChannel.label}
                  </a>
                ) : null}
              </div>
            </div>

            <div className="rounded-lg border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-white/20 bg-white/10">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt={brokerName} fill sizes="56px" className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-bold">
                      {brokerFirstName.slice(0, 1)}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-white/62">Atendimento por</p>
                  <p className="font-bold">{brokerName}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-2 text-sm text-white/78">
                <span className="rounded-lg bg-white/10 px-3 py-2">Curadoria para compra e locação</span>
                <span className="rounded-lg bg-white/10 px-3 py-2">Estratégia para vender seu imóvel</span>
                <span className="rounded-lg bg-white/10 px-3 py-2">Atendimento direto, sem compromisso</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-12 lg:grid-cols-[1.15fr_0.85fr]">
        <form
          id="contato-form"
          onSubmit={handleSubmit}
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-7"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--primary-scarlet)]">Formulário</p>
              <h3 className="mt-2 text-3xl font-bold text-slate-950">Comece por aqui</h3>
              <p className="mt-2 max-w-2xl font-light leading-7 text-slate-600">
                Escolha o objetivo e deixe seus dados para {brokerFirstName} preparar o melhor retorno.
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700">
              <CheckCircle size={16} weight="fill" />
              Resposta personalizada
            </span>
          </div>

          <input
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            className="hidden"
            aria-hidden="true"
          />

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {INTENT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setIntent(option.value)}
                className={[
                  "rounded-lg border p-4 text-left transition",
                  option.value === intent
                    ? "border-[var(--primary-scarlet)] bg-red-50 text-slate-950 shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                ].join(" ")}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={[
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      option.value === intent ? "bg-[var(--primary-scarlet)] text-white" : "bg-slate-100 text-slate-600",
                    ].join(" ")}
                  >
                    {option.icon}
                  </span>
                  <span>
                    <span className="block font-bold">{option.label}</span>
                    <span className="mt-1 block text-sm font-light leading-5 text-slate-500">{option.description}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Nome</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--primary-scarlet)] focus:ring-4 focus:ring-red-100"
                placeholder="Seu nome"
                autoComplete="name"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Canal preferido</span>
              <select
                value={preferredChannel}
                onChange={(event) => setPreferredChannel(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-[var(--primary-scarlet)] focus:ring-4 focus:ring-red-100"
              >
                <option>WhatsApp</option>
                <option>Email</option>
                <option>Telefone</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">WhatsApp ou telefone</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--primary-scarlet)] focus:ring-4 focus:ring-red-100"
                placeholder="(11) 99999-0000"
                autoComplete="tel"
                inputMode="tel"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">E-mail</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--primary-scarlet)] focus:ring-4 focus:ring-red-100"
                placeholder="voce@email.com"
                autoComplete="email"
                inputMode="email"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Mensagem</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--primary-scarlet)] focus:ring-4 focus:ring-red-100"
              placeholder={`Ex.: ${selectedIntent.description}`}
            />
          </label>

          {feedback ? (
            <div
              className={[
                "mt-4 rounded-lg border px-4 py-3 text-sm font-bold",
                submitState === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700",
              ].join(" ")}
            >
              {feedback}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitState === "submitting"}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-5 py-3 font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
          >
            <PaperPlaneTilt size={18} weight="fill" />
            {submitState === "submitting" ? "Enviando..." : "Enviar para o corretor"}
          </button>
        </form>

        <aside className="rounded-lg border border-slate-200 bg-slate-50 p-5 md:p-6">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Canais diretos</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">Prefere abrir uma conversa?</h3>
          <p className="mt-2 font-light leading-7 text-slate-600">
            Escolha um canal rápido ou envie o formulário para receber um retorno mais completo.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {directChannels.map((channel) => {
              const style = getChannelStyle(channel.type);

              return (
                <a
                  key={`${channel.type}-${channel.href}`}
                  href={channel.href}
                  className={[
                    "group inline-flex max-w-full items-center gap-2 rounded-full border py-2 pl-2 pr-4 text-sm font-bold transition hover:-translate-y-0.5",
                    style.button,
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition group-hover:scale-105",
                      style.icon,
                    ].join(" ")}
                  >
                    {getChannelIcon(channel.type)}
                  </span>
                  <span className={["min-w-0 truncate", style.value].join(" ")}>{getChannelActionText(channel)}</span>
                </a>
              );
            })}
          </div>
        </aside>
      </div>
    </section>
  );
}
