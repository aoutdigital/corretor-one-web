"use client";

import Image from "next/image";
import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, PhoneCall, SpinnerGap, X } from "@phosphor-icons/react";

type ProtectedPhoneButtonProps = {
  nickname: string;
  brokerName: string;
  className?: string;
  children?: ReactNode;
  avatarUrl?: string | null;
  creci?: string | null;
  imovelId?: string | null;
  imovelTitulo?: string | null;
};

type LoadState = "idle" | "loading" | "ready" | "error";

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Não foi possível carregar o telefone agora.";
  const error = (payload as { error?: { message?: unknown } }).error;
  return typeof error?.message === "string" ? error.message : "Não foi possível carregar o telefone agora.";
}

export function ProtectedPhoneButton({
  nickname,
  brokerName,
  className,
  children,
  avatarUrl,
  creci,
  imovelId,
  imovelTitulo,
}: ProtectedPhoneButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [phone, setPhone] = useState<string | null>(null);
  const [telHref, setTelHref] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [website, setWebsite] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

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

  async function loadPhone() {
    setOpen(true);
    setLoadState("loading");
    setFeedback(null);

    try {
      const response = await fetch("/api/public/contact-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname,
          imovel_id: imovelId ?? null,
          website,
        }),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        setLoadState("error");
        setFeedback(getErrorMessage(payload));
        return;
      }

      const data = (payload as { data?: { phone?: unknown; tel_href?: unknown } }).data;
      const nextPhone = typeof data?.phone === "string" ? data.phone : null;
      const nextHref = typeof data?.tel_href === "string" ? data.tel_href : null;

      if (!nextPhone || !nextHref) {
        setLoadState("error");
        setFeedback("Telefone indisponível no momento.");
        return;
      }

      setPhone(nextPhone);
      setTelHref(nextHref);
      setLoadState("ready");
    } catch {
      setLoadState("error");
      setFeedback("Não foi possível carregar o telefone agora. Verifique sua conexão e tente novamente.");
    }
  }

  const modal =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
            <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl shadow-slate-950/25">
              <button
                type="button"
                className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                aria-label="Fechar"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>

              <div className="px-6 py-6 pr-16">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--grey-olive)]">Ligação direta</p>
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
                <h2 className="mt-5 text-3xl font-light leading-tight text-slate-950">
                  Uma conversa rápida pode acelerar sua decisão.
                </h2>
                <p className="mt-3 text-sm font-light leading-6 text-slate-600">
                  Ligue para tirar dúvidas sobre disponibilidade, visita e próximos passos
                  {imovelTitulo ? ` deste imóvel.` : "."}
                </p>
              </div>

              <div className="border-t border-slate-200 px-6 py-6">
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  className="hidden"
                  aria-hidden="true"
                />

                {loadState === "loading" ? (
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-700">
                    <SpinnerGap size={18} className="animate-spin" />
                    Carregando telefone com segurança...
                  </div>
                ) : null}

                {loadState === "ready" && telHref ? (
                  <div className="grid gap-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Telefone</p>
                      <p className="mt-1 text-2xl font-light text-slate-950">{phone}</p>
                    </div>
                    <a
                      href={telHref}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                    >
                      <PhoneCall size={18} />
                      Ligar agora
                      <ArrowRight size={16} />
                    </a>
                  </div>
                ) : null}

                {loadState === "error" ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-bold text-red-700">
                    {feedback}
                  </div>
                ) : null}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button type="button" className={className} onClick={loadPhone}>
        {children ?? (
          <>
            <PhoneCall size={18} />
            Ligar agora
          </>
        )}
      </button>
      {modal}
    </>
  );
}
