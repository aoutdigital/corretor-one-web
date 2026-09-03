"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  EnvelopeSimple,
  FacebookLogo,
  ShareNetwork,
  WhatsappLogo,
  XLogo,
} from "@phosphor-icons/react";
import type { ComponentType } from "react";

type ArticleShareBarProps = {
  title: string;
  sharePath: string;
};

type ShareAction = {
  key: string;
  label: string;
  icon: ComponentType<{ size?: number; weight?: "regular" | "bold" | "fill"; className?: string }>;
  href?: string;
  onClick?: () => void;
};

export function ArticleShareBar({ title, sharePath }: ArticleShareBarProps) {
  const { actions, copiedKey } = useArticleShareActions({ title, sharePath });

  return (
    <>
      <aside aria-label="Compartilhar artigo" className="hidden xl:sticky xl:top-28 xl:block xl:self-start">
        <div className="w-16 rounded-full border border-stone-200 bg-white/92 p-2 shadow-[0_18px_45px_rgba(15,23,42,0.10)] backdrop-blur">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-stone-50 text-[var(--grey-olive)]">
            <ShareNetwork size={18} />
          </div>
          <div className="flex flex-col gap-1.5">
            {actions.map((action) => (
              <ShareButton key={action.key} action={action} compact />
            ))}
          </div>
        </div>
      </aside>
      <ShareToast visible={copiedKey === "copy"} />
    </>
  );
}

export function ArticleShareFooter({ title, sharePath }: ArticleShareBarProps) {
  const { actions, copiedKey } = useArticleShareActions({ title, sharePath });

  return (
    <div className="mx-auto mt-16 max-w-3xl border-y border-stone-200 py-8 text-center">
      <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--grey-olive)]">
        <ShareNetwork size={16} />
        Compartilhe
      </div>
      <p className="mt-3 text-lg font-light text-slate-700">Envie este artigo para quem também pode gostar do assunto.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {actions.map((action) => (
          <ShareButton key={action.key} action={action} compact={false} />
        ))}
      </div>
      <ShareToast visible={copiedKey === "copy"} />
    </div>
  );
}

function useArticleShareActions({ title, sharePath }: ArticleShareBarProps) {
  const [shareUrl, setShareUrl] = useState(sharePath);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    setShareUrl(`${window.location.origin}${sharePath}`);
  }, [sharePath]);

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(title);

  async function copyText(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1800);
    } catch {
      setCopiedKey(null);
    }
  }

  const actions: ShareAction[] = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      icon: WhatsappLogo,
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    },
    {
      key: "email",
      label: "E-mail",
      icon: EnvelopeSimple,
      href: `mailto:?subject=${encodedText}&body=${encodedText}%0A%0A${encodedUrl}`,
    },
    {
      key: "facebook",
      label: "Facebook",
      icon: FacebookLogo,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      key: "x",
      label: "X",
      icon: XLogo,
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    },
    {
      key: "copy",
      label: copiedKey === "copy" ? "Link copiado" : "Copiar",
      icon: copiedKey === "copy" ? Check : Copy,
      onClick: () => void copyText(shareUrl, "copy"),
    },
  ];

  return { actions, copiedKey };
}

function ShareButton({ action, compact }: { action: ShareAction; compact: boolean }) {
  const Icon = action.icon;
  const className = compact
    ? "group flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-stone-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-[var(--grey-olive)]/35"
    : "inline-flex shrink-0 items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-[color:rgba(145,139,118,0.48)] hover:text-slate-950";

  if (action.href) {
    return (
      <a href={action.href} target="_blank" rel="noopener noreferrer" className={className} title={action.label} aria-label={action.label}>
        <Icon size={compact ? 18 : 16} />
        {compact ? <span className="sr-only">{action.label}</span> : <span>{action.label}</span>}
      </a>
    );
  }

  return (
    <button type="button" onClick={action.onClick} className={className} title={action.label} aria-label={action.label}>
      <Icon size={compact ? 18 : 16} />
      {compact ? <span className="sr-only">{action.label}</span> : <span>{action.label}</span>}
    </button>
  );
}

function ShareToast({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-full border border-stone-200 bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-2xl"
    >
      Link copiado para a área de transferência.
    </div>
  );
}
