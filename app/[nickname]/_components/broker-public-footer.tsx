import Link from "next/link";
import { ArrowRight, Buildings, Check, HouseLine, SealCheck, WhatsappLogo } from "@phosphor-icons/react/dist/ssr";

import { LeadCuradoriaButton } from "./lead-curadoria-button";
import { LeadWhatsAppButton } from "./lead-whatsapp-button";

type BrokerPublicFooterProps = {
  nickname: string;
  brokerName: string;
  creci?: string | null;
  avatarUrl?: string | null;
  title?: string;
  description?: string;
  imovelId?: string | null;
  imovelTitulo?: string | null;
  imovelTipo?: string | null;
  imovelSubtipo?: string | null;
  initialObjective?: "COMPRAR" | "ALUGAR" | "VENDER";
};

export function BrokerPublicFooter({
  nickname,
  brokerName,
  creci,
  avatarUrl,
  title = "Me conte o que você procura e eu preparo uma curadoria para o seu momento.",
  description = "Posso te mostrar imóveis publicados, oportunidades parecidas e caminhos que façam sentido para compra, locação ou venda.",
  imovelId,
  imovelTitulo,
  imovelTipo,
  imovelSubtipo,
  initialObjective,
}: BrokerPublicFooterProps) {
  return (
    <footer className="relative isolate overflow-hidden bg-white pb-0 pt-10">
      <div
        className="relative w-full overflow-hidden bg-gradient-to-br from-slate-950 via-[#171717] to-[color:rgba(145,139,118,0.92)] px-5 pb-10 pt-16 text-white shadow-[0_-18px_55px_rgba(15,23,42,0.16),0_30px_85px_rgba(15,23,42,0.32)] md:pb-12 md:pt-20"
        style={{ clipPath: "polygon(0 4%, 100% 0, 100% 100%, 0% 100%)" }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.08),transparent_34%,rgba(255,255,255,0.1)_78%,transparent)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--grey-olive)]">
              Ainda pesquisando?
            </p>
            <h2 className="mt-5 max-w-3xl text-4xl font-light leading-[1.05] md:text-6xl">
              {title}
            </h2>
            <p className="mt-5 max-w-2xl text-lg font-light leading-8 text-white/68">
              {description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LeadCuradoriaButton
                nickname={nickname}
                brokerName={brokerName}
                avatarUrl={avatarUrl}
                creci={creci}
                imovelId={imovelId}
                imovelTitulo={imovelTitulo}
                imovelTipo={imovelTipo}
                imovelSubtipo={imovelSubtipo}
                initialObjective={initialObjective}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--grey-olive)] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-black/20 transition hover:brightness-110"
              >
                Pedir curadoria
                <ArrowRight size={18} />
              </LeadCuradoriaButton>
              <LeadWhatsAppButton
                nickname={nickname}
                brokerName={brokerName}
                avatarUrl={avatarUrl}
                creci={creci}
                imovelId={imovelId}
                imovelTitulo={imovelTitulo}
                label="Falar no WhatsApp"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/18 bg-white/8 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/14"
              >
                <WhatsappLogo size={18} />
                Falar no WhatsApp
              </LeadWhatsAppButton>
            </div>
          </div>

          <div className="grid content-end gap-5">
            <div className="rounded-xl border border-white/12 bg-slate-950/36 p-5 backdrop-blur">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/8 text-[var(--grey-olive)]">
                  <SealCheck size={22} weight="light" />
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-white">{brokerName}</p>
                  {creci ? <p className="mt-1 text-sm font-light text-white/58">{creci}</p> : null}
                  <p className="mt-3 text-sm font-light leading-6 text-white/58">Site profissional no Corretor.one.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mx-auto mt-10 max-w-7xl border-t border-white/12 pt-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-lg font-light text-white">Corretor.one</p>
              <p className="mt-1 max-w-2xl text-sm font-light leading-6 text-white/58">
                Perfil gratuito para corretores de imóveis com CRECI ativo, pensado para transformar presença digital em relacionamento.
              </p>
            </div>
            <Link
              href="/criar-conta"
              className="inline-flex w-fit items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-white/90"
            >
              Criar perfil grátis
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-4 text-xs font-light text-white/48">
            <span className="inline-flex items-center gap-1.5">
              <Check size={14} className="text-[var(--grey-olive)]" />
              Exclusivo para corretores
            </span>
            <span className="inline-flex items-center gap-1.5">
              <HouseLine size={14} className="text-[var(--grey-olive)]" />
              Imóveis, perfil e captação
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Buildings size={14} className="text-[var(--grey-olive)]" />
              Empreendimentos e páginas públicas
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
