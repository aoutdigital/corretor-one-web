"use client";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ClipboardText, CopySimple } from "@phosphor-icons/react";
import { AdminShell } from "@/app/admin/_components/admin-shell";
import { apiFetchWithAuth } from "@/lib/client/auth-api";
import {
  buildPropertyEssentialHtml,
  CREATIVE_DIMENSIONS,
  type CreativeFormat,
  type CreativeFormatConfig,
  type CreativeTemplateConfig,
  type CreativeTextElement,
  type CreativeTypography,
  type PropertyCreativePayload,
} from "@/lib/creatives/static-template";
type Detail = {
  id: string;
  nome: string;
  version: number;
  draft_config: CreativeTemplateConfig;
  config: CreativeTemplateConfig;
};
const textElements: Array<[CreativeTextElement, string]> = [
  ["title", "Título"],
  ["broker", "Nome do corretor"],
  ["creci", "CRECI"],
  ["location", "Empreendimento / localização"],
  ["code", "Código do imóvel"],
  ["factValue", "Valores dos atributos"],
  ["factLabel", "Legendas dos atributos"],
  ["price", "Preço"],
  ["cta", "Texto do CTA"],
];
export default function TemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Detail | null>(null);
  const [format, setFormat] = useState<CreativeFormat>("PORTRAIT");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showToast(message: string, tone: "success" | "error" = "success") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, tone });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }
  async function load() {
    const result = await apiFetchWithAuth<Detail>(`/api/admin/templates/${id}`);
    if (result.ok) setData(result.data);
    else setError(result.error);
  }
  useEffect(() => {
    void load();
  }, [id]);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );
  if (!data)
    return (
      <AdminShell title="Editor de template">
        <p>{error ?? "Carregando..."}</p>
      </AdminShell>
    );
  const current = data.draft_config.formats?.[format] as CreativeFormatConfig;
  function updateFormat(values: Partial<CreativeFormatConfig>) {
    setData((old) =>
      old
        ? {
            ...old,
            draft_config: {
              ...old.draft_config,
              formats: {
                ...old.draft_config.formats,
                [format]: { ...old.draft_config.formats?.[format], ...values },
              },
            },
          }
        : old,
    );
  }
  function updateText(
    key: CreativeTextElement,
    values: Partial<CreativeTypography>,
  ) {
    updateFormat({
      typography: {
        ...current.typography,
        [key]: { ...current.typography[key], ...values },
      },
    });
  }
  async function persist(config: CreativeTemplateConfig) {
    setSaving(true);
    const result = await apiFetchWithAuth(`/api/admin/templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ config }),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      showToast(result.error, "error");
      return false;
    }
    setError(null);
    return true;
  }
  async function save(silent = false) {
    if (!data) return false;
    const saved = await persist(data.draft_config);
    if (saved && !silent) showToast("Rascunho salvo com sucesso.");
    return saved;
  }
  async function resetDraft() {
    if (
      !data ||
      !confirm("Descartar o rascunho e restaurar a versão publicada?")
    )
      return;
    const published = structuredClone(data.config);
    if (!(await persist(published))) return;
    setData((old) => (old ? { ...old, draft_config: published } : old));
    showToast("Rascunho restaurado para a versão publicada.");
  }
  async function publish() {
    if (!confirm("Publicar este rascunho para todos os novos criativos?"))
      return;
    if (!(await save(true))) return;
    const result = await apiFetchWithAuth<{ version: number }>(
      `/api/admin/templates/${id}/publish`,
      { method: "POST" },
    );
    if (!result.ok) {
      setError(result.error);
      showToast(result.error, "error");
      return;
    }
    setData((old) =>
      old
        ? { ...old, version: result.data.version, config: old.draft_config }
        : old,
    );
    showToast(`Versão ${result.data.version} publicada com sucesso.`);
  }
  return (
    <AdminShell title={data.nome}>
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={`fixed right-5 top-5 z-[100] rounded-xl px-5 py-3 text-sm font-bold text-white shadow-xl ${toast.tone === "success" ? "bg-emerald-600" : "bg-red-600"}`}
        >
          {toast.message}
        </div>
      ) : null}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["SQUARE", "PORTRAIT", "VERTICAL"] as CreativeFormat[]).map(
            (item) => (
              <button
                type="button"
                key={item}
                onClick={() => setFormat(item)}
                className={`rounded-lg px-4 py-2 text-sm font-bold ${format === item ? "bg-slate-950 text-white" : "bg-white"}`}
              >
                {CREATIVE_DIMENSIONS[item].label}
              </button>
            ),
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void resetDraft()}
            disabled={saving}
            className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-3 font-bold text-amber-800"
          >
            Restaurar publicada
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="rounded-xl border bg-white px-5 py-3 font-bold"
          >
            Salvar rascunho
          </button>
          <button
            type="button"
            onClick={() => void publish()}
            disabled={saving}
            className="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white"
          >
            Publicar v{data.version + 1}
          </button>
        </div>
      </div>
      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
        <section className="space-y-3">
          <details open className="rounded-2xl bg-white p-5 shadow-sm">
            <summary className="cursor-pointer font-bold">Identidade</summary>
            <div className="mt-5 space-y-5">
              <StyleActions
                storageKey="identity"
                value={{
                  avatarSize: current.avatarSize,
                  avatarTop: current.avatarTop,
                  logoWidth: current.logoWidth,
                  logoTop: current.logoTop,
                }}
                onPaste={(values) =>
                  updateFormat(values as Partial<CreativeFormatConfig>)
                }
              />
              <Range
                label="Tamanho do avatar"
                value={current.avatarSize}
                min={40}
                max={120}
                onChange={(avatarSize) => updateFormat({ avatarSize })}
              />
              <Range
                label="Top do avatar"
                value={current.avatarTop}
                min={0}
                max={500}
                onChange={(avatarTop) => updateFormat({ avatarTop })}
              />
              <Range
                label="Largura do logo"
                value={current.logoWidth}
                min={120}
                max={400}
                onChange={(logoWidth) => updateFormat({ logoWidth })}
              />
              <Range
                label="Top do logo"
                value={current.logoTop}
                min={0}
                max={500}
                onChange={(logoTop) => updateFormat({ logoTop })}
              />
            </div>
          </details>
          {textElements.map(([key, label]) => (
            <TypographyPanel
              key={key}
              label={label}
              styleKey={key}
              value={current.typography[key]}
              onChange={(values) => updateText(key, values)}
            />
          ))}
          <details className="rounded-2xl bg-white p-5 shadow-sm">
            <summary className="cursor-pointer font-bold">Aparência</summary>
            <div className="mt-5 space-y-4">
              <StyleActions
                storageKey="appearance"
                value={{
                  contentBackground: current.contentBackground,
                  ctaBackground: current.ctaBackground,
                  accentColor: current.accentColor,
                  factIconSize: current.factIconSize,
                }}
                onPaste={(values) =>
                  updateFormat(values as Partial<CreativeFormatConfig>)
                }
              />
              <Color
                label="Fundo do conteúdo"
                value={current.contentBackground}
                onChange={(contentBackground) =>
                  updateFormat({ contentBackground })
                }
              />
              <Color
                label="Fundo do CTA"
                value={current.ctaBackground}
                onChange={(ctaBackground) => updateFormat({ ctaBackground })}
              />
              <Color
                label="Ícones e destaque"
                value={current.accentColor}
                onChange={(accentColor) => updateFormat({ accentColor })}
              />
              <Range
                label="Tamanho dos ícones"
                value={current.factIconSize}
                min={16}
                max={48}
                onChange={(factIconSize) => updateFormat({ factIconSize })}
              />
            </div>
          </details>
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-sm xl:sticky xl:top-5 xl:self-start">
          <h2 className="mb-4 font-bold">Preview exato</h2>
          <TemplatePreview format={format} config={data.draft_config} />
        </section>
      </div>
    </AdminShell>
  );
}
function TypographyPanel({
  label,
  styleKey,
  value,
  onChange,
}: {
  label: string;
  styleKey: CreativeTextElement;
  value: CreativeTypography;
  onChange: (value: Partial<CreativeTypography>) => void;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const storageKey = `corretor-one:template-style:typography:${styleKey}`;
  function copyStyle() {
    localStorage.setItem(storageKey, JSON.stringify(value));
    setFeedback("Estilo copiado");
  }
  function pasteStyle() {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        setFeedback("Nenhum estilo copiado");
        return;
      }
      onChange(JSON.parse(stored) as CreativeTypography);
      setFeedback("Estilo aplicado");
    } catch {
      setFeedback("Estilo inválido");
    }
  }
  return (
    <details className="rounded-2xl bg-white p-5 shadow-sm">
      <summary className="cursor-pointer font-bold">{label}</summary>
      <div className="mt-5 space-y-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyStyle}
            aria-label="Copiar estilo"
            title="Copiar estilo"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border"
          >
            <CopySimple size={17} />
          </button>
          <button
            type="button"
            onClick={pasteStyle}
            aria-label="Colar estilo"
            title="Colar estilo"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border"
          >
            <ClipboardText size={17} />
          </button>
          {feedback ? (
            <span className="text-xs text-slate-500">{feedback}</span>
          ) : null}
        </div>
        <Range
          label="Tamanho da fonte"
          value={value.fontSize}
          min={8}
          max={96}
          onChange={(fontSize) => onChange({ fontSize })}
        />
        <Range
          label="Line height"
          value={value.lineHeight}
          min={0.8}
          max={2}
          step={0.05}
          suffix=""
          onChange={(lineHeight) => onChange({ lineHeight })}
        />
        <Color
          label="Cor"
          value={value.color}
          onChange={(color) => onChange({ color })}
        />
        <label className="grid gap-2 text-sm font-semibold">
          Peso da fonte
          <select
            value={value.fontWeight}
            onChange={(event) =>
              onChange({
                fontWeight: Number(event.target.value) as 300 | 400 | 700,
              })
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal"
          >
            <option value={300}>Dunbar Light</option>
            <option value={400}>Dunbar Regular</option>
            <option value={700}>Dunbar Bold</option>
          </select>
        </label>
      </div>
    </details>
  );
}
function StyleActions({
  storageKey,
  value,
  onPaste,
}: {
  storageKey: string;
  value: Record<string, unknown>;
  onPaste: (value: Record<string, unknown>) => void;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const key = `corretor-one:template-style:${storageKey}`;
  function copy() {
    localStorage.setItem(key, JSON.stringify(value));
    setFeedback("Estilo copiado");
  }
  function paste() {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) {
        setFeedback("Nenhum estilo copiado");
        return;
      }
      onPaste(JSON.parse(stored) as Record<string, unknown>);
      setFeedback("Estilo aplicado");
    } catch {
      setFeedback("Estilo inválido");
    }
  }
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={copy}
        aria-label="Copiar estilo"
        title="Copiar estilo"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border"
      >
        <CopySimple size={17} />
      </button>
      <button
        type="button"
        onClick={paste}
        aria-label="Colar estilo"
        title="Colar estilo"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border"
      >
        <ClipboardText size={17} />
      </button>
      {feedback ? (
        <span className="text-xs text-slate-500">{feedback}</span>
      ) : null}
    </div>
  );
}
function Range({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "px",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="flex justify-between">
        <b>{label}</b>
        <span>
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
function Color({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const normalized = /^#[0-9a-f]{8}$/i.test(value)
    ? value
    : `${value.slice(0, 7)}ff`;
  const solid = normalized.slice(0, 7);
  const opacity = Math.round(
    (parseInt(normalized.slice(7, 9), 16) / 255) * 100,
  );
  function withOpacity(percent: number) {
    const alpha = Math.round((percent / 100) * 255)
      .toString(16)
      .padStart(2, "0");
    onChange(`${solid}${alpha}`);
  }
  return (
    <div className="grid gap-2 text-sm">
      <div className="flex items-center justify-between">
        <b>{label}</b>
        <input
          aria-label={`Cor: ${label}`}
          type="color"
          value={solid}
          onChange={(event) =>
            onChange(`${event.target.value}${normalized.slice(7, 9)}`)
          }
          className="h-10 w-16"
        />
      </div>
      <label className="grid gap-1.5">
        <span className="flex justify-between text-xs text-slate-500">
          <span>Opacidade</span>
          <span>{opacity}%</span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={opacity}
          onChange={(event) => withOpacity(Number(event.target.value))}
        />
      </label>
    </div>
  );
}
function TemplatePreview({
  format,
  config,
}: {
  format: CreativeFormat;
  config: CreativeTemplateConfig;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const dimensions = CREATIVE_DIMENSIONS[format];
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setScale(element.clientWidth / dimensions.width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [dimensions.width]);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const payload: PropertyCreativePayload = {
    property: {
      id: "preview",
      title:
        "Apartamento à venda, 168m², 3 Dormitórios, 2 Suítes, Jardim Paulista - São Paulo/SP",
      location: "Edifício Parque Paulista",
      price: "R$ 2.480.000",
      code: "ONE-1001-0001",
      imageUrl: `${origin}/images/corretor-one-criar-conta.jpeg`,
      stats: [
        { kind: "AREA", value: "168", label: "m² úteis" },
        { kind: "BED", value: "3", label: "Dormitórios" },
        { kind: "SUITE", value: "2", label: "Suítes" },
        { kind: "CAR", value: "2", label: "Vagas" },
      ],
    },
    broker: {
      name: "Marina Oliveira",
      nickname: "marinaoliveira",
      creci: "SP 123456-F",
      avatarUrl: null,
      logoUrl: null,
      logoWhiteUrl: null,
    },
    copy: {
      headline: "",
      supportingText: "",
      cta: "Conheça todos os detalhes",
      titleMode: "FULL",
    },
    format,
    templateConfig: config,
  };
  return (
    <div
      ref={ref}
      className="relative mx-auto w-full max-w-[620px] overflow-hidden bg-slate-200"
      style={{ aspectRatio: `${dimensions.width}/${dimensions.height}` }}
    >
      <iframe
        title="Preview do template"
        srcDoc={buildPropertyEssentialHtml(payload)}
        className="pointer-events-none absolute left-0 top-0 border-0"
        style={{
          width: dimensions.width,
          height: dimensions.height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      />
    </div>
  );
}
