import Image from "next/image";
import Link from "next/link";
import {
  Briefcase,
  Buildings,
  ChartLineUp,
  CheckCircle,
  EnvelopeSimple,
  Megaphone,
  PhoneCall,
  PresentationChart,
  RocketLaunch,
  Star,
  TrendUp,
  UserSwitch,
} from "@phosphor-icons/react/dist/ssr";

const dores = [
  "Depende da estrutura da imobiliária",
  "Paga portais caros sem previsibilidade",
  "Não constrói marca própria",
  "Perde comissão para ter suporte",
  "Trabalha muito, mas cresce pouco",
];

const transformacao = [
  "Constrói sua própria marca",
  "Tem perfil profissional validado e estrutura digital",
  "Publica em portais com autonomia",
  "Organiza imóveis com eficiência",
  "Gera autoridade local",
  "Aumenta sua margem de lucro",
];

const ferramentas = [
  {
    titulo: "Seu portal profissional",
    descricao:
      "Perfil profissional em corretor.one/nickname com identidade personalizada para fortalecer sua marca.",
    icon: Buildings,
  },
  {
    titulo: "Organização inteligente",
    descricao: "Cadastre, organize e publique imóveis com eficiência e sem depender de terceiros.",
    icon: PresentationChart,
  },
  {
    titulo: "Marketing pronto para usar",
    descricao: "Posts profissionais para WhatsApp e Instagram, economizando tempo e elevando seu posicionamento.",
    icon: Megaphone,
  },
  {
    titulo: "Alcance ampliado",
    descricao: "Publique em portais como Zap e VivaReal com poucos cliques.",
    icon: TrendUp,
  },
  {
    titulo: "Autoridade no detalhe",
    descricao: "Email profissional para transmitir credibilidade e organização.",
    icon: EnvelopeSimple,
  },
  {
    titulo: "Seu negócio no bolso",
    descricao: "Gerencie tudo pelo celular, com mobilidade total.",
    icon: RocketLaunch,
  },
];

const metricas = [
  { valor: "500+", label: "Corretores ativos" },
  { valor: "2.000+", label: "Imóveis gerenciados" },
  { valor: "50.000+", label: "Visitas geradas" },
  { valor: "98%", label: "Recomendam a plataforma" },
];

export default function HomePage() {
  return (
    <div className="bg-white text-black">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" aria-label="corretor.one">
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
          <div className="flex items-center gap-3">
            <Link href="/entrar" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-light text-slate-700">
              Entrar
            </Link>
            <Link
              href="/criar-conta"
              className="rounded-lg bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-bold text-white transition hover:brightness-95"
            >
              Criar Conta Grátis
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-slate-200">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(229,35,43,0.12),transparent_40%),radial-gradient(circle_at_85%_0%,rgba(89,101,111,0.18),transparent_33%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-20 md:grid-cols-2 md:py-24">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--grey-olive)]/40 bg-[var(--grey-olive)]/10 px-3 py-1 text-xs font-light text-[var(--blue-slate)]">
                <Star size={14} weight="fill" />
                Plataforma de independência para corretores autônomos
              </p>
              <h1 className="text-4xl font-bold leading-tight md:text-6xl">
                Independência para o corretor autônomo construir sua própria marca.
              </h1>
              <p className="mt-5 max-w-xl text-lg font-light text-[var(--blue-slate)]">
                O corretor.one entrega estrutura profissional e validação pública para você atuar com credibilidade e
                autonomia. Tudo centralizado no seu perfil.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/criar-conta"
                  className="rounded-xl bg-[var(--primary-scarlet)] px-6 py-3 text-sm font-bold text-white transition hover:brightness-95"
                >
                  Criar Conta Grátis
                </Link>
                <a
                  href="#plataforma"
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-light text-slate-700 transition hover:bg-slate-100"
                >
                  Conhecer a Plataforma
                </a>
              </div>
              <div className="mt-6 flex flex-wrap gap-4 text-sm text-[var(--blue-slate)]">
                <span className="inline-flex items-center gap-1"><CheckCircle size={16} /> Perfil validado</span>
                <span className="inline-flex items-center gap-1"><CheckCircle size={16} /> Sem taxa escondida</span>
                <span className="inline-flex items-center gap-1"><CheckCircle size={16} /> 100% no seu nome</span>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-light text-[var(--blue-slate)]">Visão do dia</p>
                <p className="mt-2 text-3xl font-bold">0</p>
                <p className="font-light text-[var(--blue-slate)]">Negócios em aberto</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-light text-[var(--blue-slate)]">Sua marca própria</p>
                <p className="mt-2 text-xl font-bold">corretor.one/nickname</p>
                <p className="mt-1 text-sm font-light text-[var(--blue-slate)]">Presença profissional validada</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <h2 className="text-3xl font-bold">O corretor autônomo vive assim:</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {dores.map((item) => (
              <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-light text-[var(--blue-slate)]">{item}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xl font-bold text-[var(--primary-scarlet)]">Não precisa ser assim.</p>
        </section>

        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <h2 className="text-3xl font-bold">Com o corretor.one você:</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {transformacao.map((item) => (
                <div key={item} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-4">
                  <CheckCircle size={20} className="mt-0.5 text-[var(--primary-scarlet)]" />
                  <p className="font-light text-[var(--blue-slate)]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="plataforma" className="mx-auto max-w-7xl px-6 py-16">
          <p className="text-sm font-light uppercase tracking-widest text-[var(--grey-olive)]">Estrutura completa no seu nome</p>
          <h2 className="mt-2 text-3xl font-bold">Tudo que uma imobiliária oferece. Agora no seu controle.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ferramentas.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.titulo} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 inline-flex rounded-lg bg-slate-100 p-2">
                    <Icon size={22} className="text-[var(--primary-scarlet)]" />
                  </div>
                  <h3 className="text-xl font-bold">{card.titulo}</h3>
                  <p className="mt-2 font-light text-[var(--blue-slate)]">{card.descricao}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-2xl font-bold">Sua operação organizada. Do lead ao fechamento.</h3>
              <p className="mt-2 font-light text-[var(--blue-slate)]">
                Controle total dos seus contatos, propostas e atividades em um único lugar.
              </p>
              <ul className="mt-5 space-y-3 font-light text-[var(--blue-slate)]">
                <li className="flex items-center gap-2"><UserSwitch size={20} /> Leads centralizados</li>
                <li className="flex items-center gap-2"><Briefcase size={20} /> Propostas organizadas</li>
                <li className="flex items-center gap-2"><PhoneCall size={20} /> Gestão de atividades</li>
              </ul>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-2xl font-bold">Marketing profissional no seu controle.</h3>
              <p className="mt-2 font-light text-[var(--blue-slate)]">
                Construa audiência, ative sua base e fortaleça sua marca com ferramentas integradas.
              </p>
              <ul className="mt-5 space-y-3 font-light text-[var(--blue-slate)]">
                <li className="flex items-center gap-2"><ChartLineUp size={20} /> Gestão de audiência</li>
                <li className="flex items-center gap-2"><EnvelopeSimple size={20} /> Email marketing</li>
                <li className="flex items-center gap-2"><Megaphone size={20} /> Disparo de WhatsApp</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(120deg,#000000,#1f2937)] p-8 text-white">
            <p className="text-sm font-light uppercase tracking-widest text-white/60">Central de Criativos</p>
            <h2 className="mt-2 text-3xl font-bold">Crie postagens com um clique.</h2>
            <p className="mt-3 max-w-2xl font-light text-white/80">
              Use modelos profissionais prontos e, com poucos cliques, gere materiais incríveis para Instagram,
              WhatsApp, Email, TikTok e YouTube.
            </p>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <h2 className="text-3xl font-bold">Corretores que decidiram ser independentes.</h2>
            <p className="mt-2 font-light text-[var(--blue-slate)]">
              Profissionais que estão construindo sua própria marca com o corretor.one.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-4">
              {metricas.map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-5 text-center">
                  <p className="text-3xl font-bold text-[var(--primary-scarlet)]">{item.valor}</p>
                  <p className="mt-1 font-light text-[var(--blue-slate)]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="planos" className="mx-auto max-w-7xl px-6 py-16">
          <h2 className="text-3xl font-bold">Comece grátis. Cresça com estrutura.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { nome: "Grátis", destaque: "Entrada no ecossistema", cor: "border-slate-300" },
              { nome: "Presença", destaque: "Imagem profissional", cor: "border-[var(--grey-olive)]" },
              { nome: "Destaque", destaque: "Mais visibilidade", cor: "border-[var(--blue-slate)]" },
              { nome: "Autoridade", destaque: "Posicionamento premium", cor: "border-[var(--primary-scarlet)]" },
            ].map((plano) => (
              <article key={plano.nome} className={`rounded-2xl border bg-white p-5 ${plano.cor}`}>
                <h3 className="text-xl font-bold">{plano.nome}</h3>
                <p className="mt-2 font-light text-[var(--blue-slate)]">{plano.destaque}</p>
                <Link
                  href="/criar-conta"
                  className="mt-6 inline-flex rounded-lg bg-black px-4 py-2 text-sm font-light text-white transition hover:bg-slate-800"
                >
                  Começar agora
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-200 bg-[var(--black)]">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-16 md:flex-row md:items-center">
            <div>
              <p className="text-3xl font-bold text-white">Você vai continuar dependente?</p>
              <p className="mt-2 font-light text-white/70">Construa sua própria estrutura e aumente sua margem de lucro.</p>
            </div>
            <Link
              href="/criar-conta"
              className="rounded-xl bg-[var(--primary-scarlet)] px-6 py-3 text-sm font-bold text-white transition hover:brightness-95"
            >
              Criar minha conta grátis
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
