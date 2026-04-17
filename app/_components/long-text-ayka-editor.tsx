"use client";

import { Info, ListBullets, TextB, TextItalic, TextUnderline, X } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AykaNeuralLoading } from "@/app/_components/ayka-neural-loading";

const AYKA_TOM_OPTIONS = ["Sofisticado", "Acolhedor", "Objetivo", "Inspiracional"] as const;
const AYKA_TOM_DESCRICOES: Record<(typeof AYKA_TOM_OPTIONS)[number], string> = {
  Sofisticado: "Linguagem premium, elegante e voltada a público exigente.",
  Acolhedor: "Tom próximo, humano e convidativo, com foco em bem-estar.",
  Objetivo: "Texto direto ao ponto, claro e sem excessos.",
  Inspiracional: "Narrativa emocional, com foco em estilo de vida e aspiração.",
};

const AYKA_VOZ_OPTIONS = [
  "Consultiva",
  "Especialista local",
  "Institucional",
  "Comercial leve",
] as const;
const AYKA_VOZ_DESCRICOES: Record<(typeof AYKA_VOZ_OPTIONS)[number], string> = {
  Consultiva: "Atua como assessor, explicando benefícios com orientação prática.",
  "Especialista local": "Valoriza contexto de bairro, mobilidade e conveniência regional.",
  Institucional: "Comunicação mais formal, neutra e corporativa.",
  "Comercial leve": "Tom de venda suave, persuasivo sem pressão.",
};

const AYKA_ESTILO_OPTIONS = [
  "Foco em benefícios",
  "Foco em diferenciais técnicos",
  "Foco em estilo de vida",
  "Foco em investimento",
] as const;
const AYKA_ESTILO_DESCRICOES: Record<(typeof AYKA_ESTILO_OPTIONS)[number], string> = {
  "Foco em benefícios": "Destaca ganhos práticos e valor percebido pelo comprador.",
  "Foco em diferenciais técnicos": "Prioriza dados de produto, estrutura e especificações.",
  "Foco em estilo de vida": "Enfatiza rotina, conforto e experiências no imóvel.",
  "Foco em investimento": "Ressalta potencial de valorização, liquidez e renda.",
};

const AYKA_FORMATO_DESCRICAO_OPTIONS = [
  {
    value: "SECOES",
    label: "Dividir a descrição em partes",
    descricao:
      "Estrutura em blocos: introdução e público-alvo, detalhes do imóvel, empreendimento e localização.",
  },
  {
    value: "FLUIDO",
    label: "Texto fluído",
    descricao:
      "Texto contínuo, sem divisão explícita de blocos, integrando os pontos de forma natural.",
  },
] as const;

const AYKA_PUBLICOS: ReadonlyArray<{ categoria: string; subcategorias: string[] }> = [
  {
    categoria: "Famílias",
    subcategorias: [
      "Famílias com crianças pequenas",
      "Famílias com adolescentes",
      "Famílias grandes ou multigeracionais",
      "Famílias em busca de lazer e convivência",
      "Famílias em transição",
      "Famílias com pets",
      "Famílias que valorizam educação",
      "Famílias amantes de natureza",
      "Famílias de alto padrão",
      "Imóveis para famílias em viagem",
    ],
  },
  {
    categoria: "Casais",
    subcategorias: [
      "Jovens casais",
      "Casais aposentados",
      "Casais sem filhos",
      "Casais com pets",
      "Casais em home office",
      "Casais de meia-idade",
      "Casais em busca de luxo",
      "Casais aventureiros ou minimalistas",
    ],
  },
  {
    categoria: "Solteiros",
    subcategorias: [
      "Profissionais que trabalham na região",
      "Estudantes",
      "Solteiros que valorizam vida urbana",
      "Solteiros que priorizam conforto e tranquilidade",
      "Solteiros minimalistas",
      "Solteiros com foco em investimentos",
      "Solteiros que viajam frequentemente",
      "Solteiros amantes de pets",
      "Solteiros fitness",
      "Solteiros que desejam exclusividade",
    ],
  },
  {
    categoria: "Investidores",
    subcategorias: [
      "Investidores em busca de imóveis para locação",
      "Investidores em busca de imóveis de alto padrão",
      "Investidores em imóveis comerciais",
      "Investidores em imóveis de temporada",
      "Investidores em imóveis para revenda",
      "Investidores em regiões em expansão",
    ],
  },
];

export type AykaPublicoSelecao = {
  categoria: string;
  subcategoria: string;
};

export type AykaFormatoDescricao = (typeof AYKA_FORMATO_DESCRICAO_OPTIONS)[number]["value"];

export type AykaConfig = {
  tom: (typeof AYKA_TOM_OPTIONS)[number];
  voz: (typeof AYKA_VOZ_OPTIONS)[number];
  estilo: (typeof AYKA_ESTILO_OPTIONS)[number];
  formatoDescricao: AykaFormatoDescricao;
  incluirCta: boolean;
  publicosSelecionados: AykaPublicoSelecao[];
  observacaoGeral: string;
};

type LongTextAykaEditorProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxChars: number;
  plainTextLength: number;
  prompt: string;
  showPrompt: boolean;
  onTogglePrompt: () => void;
  showPromptControls?: boolean;
  actionCodeLabel: string;
  checkingAyka: boolean;
  generatingAyka: boolean;
  enableFormatoDescricao?: boolean;
  onRequestOpenAyka: () => Promise<string | null>;
  onGenerateAyka: (config: AykaConfig) => Promise<string | null>;
};

function InlineOptionTooltip({ text }: { text: string }) {
  return (
    <span
      tabIndex={0}
      aria-label={text}
      className="group relative inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-300 text-slate-500 transition hover:border-slate-400 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-scarlet)]"
    >
      <Info size={11} weight="bold" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-72 -translate-x-1/2 rounded-md bg-slate-900 px-2.5 py-2 text-[11px] leading-snug text-white shadow-lg group-hover:block group-focus:block">
        {text}
      </span>
    </span>
  );
}

export function LongTextAykaEditor({
  label,
  value,
  onChange,
  maxChars,
  plainTextLength,
  prompt,
  showPrompt,
  onTogglePrompt,
  showPromptControls = true,
  actionCodeLabel,
  checkingAyka,
  generatingAyka,
  enableFormatoDescricao = false,
  onRequestOpenAyka,
  onGenerateAyka,
}: LongTextAykaEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [showAykaModal, setShowAykaModal] = useState(false);
  const [aykaModalStep, setAykaModalStep] = useState(1);
  const [aykaTom, setAykaTom] = useState<((typeof AYKA_TOM_OPTIONS)[number] | "")>("");
  const [aykaVoz, setAykaVoz] = useState<((typeof AYKA_VOZ_OPTIONS)[number] | "")>("");
  const [aykaEstilo, setAykaEstilo] = useState<((typeof AYKA_ESTILO_OPTIONS)[number] | "")>("");
  const [aykaFormatoDescricao, setAykaFormatoDescricao] = useState<AykaFormatoDescricao>("FLUIDO");
  const [aykaIncluirCta, setAykaIncluirCta] = useState(true);
  const [aykaPublicoCategoria, setAykaPublicoCategoria] = useState(AYKA_PUBLICOS[0]?.categoria ?? "");
  const [aykaPublicosSelecionados, setAykaPublicosSelecionados] = useState<AykaPublicoSelecao[]>([]);
  const [aykaObservacaoGeral, setAykaObservacaoGeral] = useState("");
  const [aykaError, setAykaError] = useState<string | null>(null);
  const aykaModalTotalSteps = enableFormatoDescricao ? 6 : 5;
  const aykaPublicoStep = enableFormatoDescricao ? 5 : 4;
  const aykaObservacaoStep = aykaPublicoStep + 1;

  const aykaSubcategoriasDaCategoria = useMemo(
    () => AYKA_PUBLICOS.find((item) => item.categoria === aykaPublicoCategoria)?.subcategorias ?? [],
    [aykaPublicoCategoria],
  );

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== (value || "")) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  function applyDescricaoCommand(command: "bold" | "italic" | "underline" | "insertUnorderedList") {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command);
    if (command === "insertUnorderedList") {
      editorRef.current.querySelectorAll("ul").forEach((element) => {
        const ul = element as HTMLUListElement;
        ul.style.listStyleType = "disc";
        ul.style.paddingLeft = "1.25rem";
        ul.style.margin = "0.25rem 0";
      });
      editorRef.current.querySelectorAll("li").forEach((element) => {
        const li = element as HTMLLIElement;
        li.style.margin = "0.125rem 0";
      });
    }
    onChange(editorRef.current.innerHTML);
  }

  function toggleAykaPublico(categoria: string, subcategoria: string) {
    setAykaPublicosSelecionados((current) => {
      const exists = current.some(
        (item) => item.categoria === categoria && item.subcategoria === subcategoria,
      );
      if (exists) {
        return current.filter(
          (item) => !(item.categoria === categoria && item.subcategoria === subcategoria),
        );
      }
      if (current.length >= 3) return current;
      return [...current, { categoria, subcategoria }];
    });
  }

  async function openAykaModal() {
    setAykaError(null);
    const maybeError = await onRequestOpenAyka();
    if (maybeError) {
      setAykaError(maybeError);
      return;
    }
    setAykaModalStep(1);
    setShowAykaModal(true);
  }

  async function runAykaGeneration() {
    if (!aykaTom || !aykaVoz || !aykaEstilo) {
      setAykaError("Selecione tom, voz e estilo para gerar com a Ayka.");
      return;
    }
    setAykaError(null);
    // Fecha o modal antes da geração para não manter dois estados visuais ativos.
    setShowAykaModal(false);
    setAykaModalStep(1);
    const maybeError = await onGenerateAyka({
      tom: aykaTom,
      voz: aykaVoz,
      estilo: aykaEstilo,
      formatoDescricao: aykaFormatoDescricao,
      incluirCta: aykaIncluirCta,
      publicosSelecionados: aykaPublicosSelecionados,
      observacaoGeral: aykaObservacaoGeral.trim(),
    });
    if (maybeError) {
      setAykaError(maybeError);
      return;
    }
  }

  return (
    <div className="relative space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      {generatingAyka ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/85">
          <AykaNeuralLoading
            title="Ayka está estruturando o anúncio do imóvel"
            subtitle="Analisando contexto, negociação e diferenciais para gerar uma descrição comercial."
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <div className="flex items-center gap-2">
          {showPromptControls ? (
            <button
              type="button"
              onClick={onTogglePrompt}
              className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:border-slate-400"
            >
              {showPrompt ? "Ocultar prompt" : "Mostrar prompt"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              void openAykaModal();
            }}
            disabled={checkingAyka || generatingAyka}
            className="cursor-pointer rounded-lg border border-[var(--primary-scarlet)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--primary-scarlet)] hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checkingAyka ? "Validando créditos..." : "Gerar com Ayka"}
          </button>
        </div>
      </div>

      {showPromptControls && showPrompt ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-800">
              Prompt Ayka (temporariamente visível)
            </p>
            <span className="text-[11px] text-amber-700">Ação: {actionCodeLabel}</span>
          </div>
          <textarea
            readOnly
            value={prompt}
            rows={10}
            className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none"
          />
        </div>
      ) : null}

      <div className="block text-sm">
        <span className="mb-1 block text-slate-500">{label} (rich text)</span>
        <div className="rounded-t-lg border border-b-0 border-slate-300 bg-slate-50 p-2">
          <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => applyDescricaoCommand("bold")}
            className="inline-flex cursor-pointer rounded-md border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100"
            title="Negrito"
          >
            <TextB size={15} />
          </button>
          <button
            type="button"
            onClick={() => applyDescricaoCommand("italic")}
            className="inline-flex cursor-pointer rounded-md border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100"
            title="Itálico"
          >
            <TextItalic size={15} />
          </button>
          <button
            type="button"
            onClick={() => applyDescricaoCommand("underline")}
            className="inline-flex cursor-pointer rounded-md border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100"
            title="Sublinhado"
          >
            <TextUnderline size={15} />
          </button>
          <button
            type="button"
            onClick={() => applyDescricaoCommand("insertUnorderedList")}
            className="inline-flex cursor-pointer rounded-md border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100"
            title="Lista"
          >
            <ListBullets size={15} />
          </button>
        </div>
        </div>
        <div
          ref={editorRef}
          contentEditable
          onInput={(event) => onChange((event.target as HTMLDivElement).innerHTML)}
          className="min-h-[340px] rounded-b-lg border border-slate-300 px-3 py-3 text-sm leading-7 outline-none focus:border-[var(--blue-slate)] [&_p]:mb-4 [&_p:last-child]:mb-0 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1.5"
          style={{ whiteSpace: "pre-wrap" }}
        />
      </div>

      <p className={`text-xs ${plainTextLength > maxChars ? "text-rose-600" : "text-slate-500"}`}>
        Caracteres: {plainTextLength}/{maxChars} (sem contar tags HTML)
      </p>

      {aykaError ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {aykaError}
        </div>
      ) : null}

      {showAykaModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-lg text-slate-900">Configuração neural da Ayka</h4>
              <button
                type="button"
                onClick={() => {
                  setShowAykaModal(false);
                  setAykaModalStep(1);
                }}
                className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Etapa {aykaModalStep} de {aykaModalTotalSteps}
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[var(--primary-scarlet)] transition-all"
                  style={{ width: `${(aykaModalStep / aykaModalTotalSteps) * 100}%` }}
                />
              </div>
            </div>

            {aykaModalStep === 1 ? (
              <div>
                <p className="mb-1 text-sm font-medium text-slate-900">Escolha o tom</p>
                <p className="mb-3 text-xs text-slate-500">
                  Define a sensação do texto. Ao clicar em uma opção, avançamos automaticamente.
                </p>
                <div className="space-y-2">
                  {AYKA_TOM_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setAykaTom(option);
                        setAykaModalStep(2);
                      }}
                      className={`w-full cursor-pointer rounded-lg border px-3 py-2 text-left text-sm ${
                        aykaTom === option
                          ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span>{option}</span>
                        <InlineOptionTooltip text={AYKA_TOM_DESCRICOES[option]} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {aykaModalStep === 2 ? (
              <div>
                <p className="mb-1 text-sm font-medium text-slate-900">Escolha a voz</p>
                <p className="mb-3 text-xs text-slate-500">
                  Define quem está “falando” no texto: especialista, consultor, institucional.
                </p>
                <div className="space-y-2">
                  {AYKA_VOZ_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setAykaVoz(option);
                        setAykaModalStep(3);
                      }}
                      className={`w-full cursor-pointer rounded-lg border px-3 py-2 text-left text-sm ${
                        aykaVoz === option
                          ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span>{option}</span>
                        <InlineOptionTooltip text={AYKA_VOZ_DESCRICOES[option]} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {aykaModalStep === 3 ? (
              <div>
                <p className="mb-1 text-sm font-medium text-slate-900">Escolha o estilo principal</p>
                <p className="mb-3 text-xs text-slate-500">Define o foco narrativo da descrição.</p>
                <div className="space-y-2">
                  {AYKA_ESTILO_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setAykaEstilo(option);
                        setAykaModalStep(4);
                      }}
                      className={`w-full cursor-pointer rounded-lg border px-3 py-2 text-left text-sm ${
                        aykaEstilo === option
                          ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span>{option}</span>
                        <InlineOptionTooltip text={AYKA_ESTILO_DESCRICOES[option]} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {enableFormatoDescricao && aykaModalStep === 4 ? (
              <div>
                <p className="mb-1 text-sm font-medium text-slate-900">Formato da descrição</p>
                <p className="mb-3 text-xs text-slate-500">
                  Define como o texto será estruturado quando houver empreendimento associado.
                </p>
                <div className="space-y-2">
                  {AYKA_FORMATO_DESCRICAO_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setAykaFormatoDescricao(option.value);
                        setAykaModalStep(5);
                      }}
                      className={`w-full cursor-pointer rounded-lg border px-3 py-2 text-left text-sm ${
                        aykaFormatoDescricao === option.value
                          ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span>{option.label}</span>
                        <InlineOptionTooltip text={option.descricao} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {aykaModalStep === aykaPublicoStep ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    As keywords serão geradas automaticamente pela Ayka e ficam bloqueadas para edição.
                  </div>
                  <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={aykaIncluirCta}
                      onChange={(event) => setAykaIncluirCta(event.target.checked)}
                    />
                    Incluir CTA final
                  </label>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Público-alvo (até 3)
                  </p>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {AYKA_PUBLICOS.map((item) => (
                      <button
                        key={item.categoria}
                        type="button"
                        onClick={() => setAykaPublicoCategoria(item.categoria)}
                        className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs ${
                          aykaPublicoCategoria === item.categoria
                            ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {item.categoria}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-2 md:grid-cols-2">
                    {aykaSubcategoriasDaCategoria.map((subcategoria) => {
                      const active = aykaPublicosSelecionados.some(
                        (item) =>
                          item.categoria === aykaPublicoCategoria &&
                          item.subcategoria === subcategoria,
                      );
                      const disabled = !active && aykaPublicosSelecionados.length >= 3;
                      return (
                        <button
                          key={subcategoria}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleAykaPublico(aykaPublicoCategoria, subcategoria)}
                          className={`cursor-pointer rounded-lg border px-3 py-2 text-left text-xs ${
                            active
                              ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          {subcategoria}
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-3 text-xs text-slate-500">Selecionados: {aykaPublicosSelecionados.length}/3</p>
                  {aykaPublicosSelecionados.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {aykaPublicosSelecionados.map((item) => (
                        <button
                          key={`${item.categoria}:${item.subcategoria}`}
                          type="button"
                          onClick={() => toggleAykaPublico(item.categoria, item.subcategoria)}
                          className="cursor-pointer rounded-full border border-[var(--primary-scarlet)] bg-white px-2 py-0.5 text-xs text-[var(--primary-scarlet)]"
                          title="Clique para remover"
                        >
                          {item.categoria} &gt; {item.subcategoria}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {aykaModalStep === aykaObservacaoStep ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-900">Observação geral final</p>
                <p className="text-xs text-slate-500">
                  Use este campo para orientar a Ayka com algum direcionamento específico do anúncio.
                </p>
                <textarea
                  value={aykaObservacaoGeral}
                  onChange={(event) => setAykaObservacaoGeral(event.target.value)}
                  maxLength={300}
                  rows={5}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[var(--blue-slate)]"
                  placeholder="Ex.: enfatizar praticidade para família com crianças e destacar o perfil residencial da região."
                />
                <p className="text-right text-xs text-slate-500">{aykaObservacaoGeral.length}/300</p>
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                disabled={aykaModalStep === 1}
                onClick={() => setAykaModalStep((current) => Math.max(1, current - 1))}
                className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Voltar
              </button>
              {aykaModalStep === aykaModalTotalSteps ? (
                <button
                  type="button"
                  onClick={() => {
                    void runAykaGeneration();
                  }}
                  disabled={generatingAyka}
                  className="cursor-pointer rounded-xl bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {generatingAyka ? "Gerando descrição..." : "Gerar descrição com a Ayka"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setAykaModalStep((current) => Math.min(aykaModalTotalSteps, current + 1))}
                  className="cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
                >
                  Avançar
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
