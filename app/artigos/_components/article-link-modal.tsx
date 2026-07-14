"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { SpinnerGap, X } from "@phosphor-icons/react";

import { apiFetchWithAuth } from "@/lib/client/auth-api";

export type ArticleLinkSelection = {
  range: Range | null;
  href: string;
  label: string;
};

type ArticleLinkTarget = {
  id: string;
  type: "imovel" | "empreendimento" | "artigo";
  label: string;
  description: string;
  href: string;
  status: string | null;
};

type LinkTargetsResponse = { items: ArticleLinkTarget[] };

export function ArticleLinkModal({
  editor,
  selection,
  onClose,
  onApply,
}: {
  editor: HTMLDivElement | null | undefined;
  selection: ArticleLinkSelection;
  onClose: () => void;
  onApply: () => void;
}) {
  const [mode, setMode] = useState<"internal" | "url">(selection.href.startsWith("http") ? "url" : "internal");
  const [url, setUrl] = useState(selection.href);
  const [anchorText, setAnchorText] = useState(selection.label);
  const [query, setQuery] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<ArticleLinkTarget | null>(null);
  const [targets, setTargets] = useState<ArticleLinkTarget[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const currentHref = mode === "internal" ? selectedTarget?.href || selection.href : url;

  useEffect(() => {
    let ignore = false;
    setLoadingTargets(true);
    apiFetchWithAuth<LinkTargetsResponse>(`/api/artigos/link-targets?q=${encodeURIComponent(query.trim())}`).then((result) => {
      if (ignore) return;
      setLoadingTargets(false);
      setTargets(result.ok ? result.data.items : []);
    });
    return () => {
      ignore = true;
    };
  }, [query]);

  function restoreSelection() {
    if (!editor) return false;
    editor.focus();
    const browserSelection = window.getSelection();
    if (!browserSelection || !selection.range) return false;
    browserSelection.removeAllRanges();
    browserSelection.addRange(selection.range.cloneRange());
    return true;
  }

  function applyHref(nextUrl: string, nextLabel?: string) {
    const safeUrl = nextUrl.trim();
    if (!editor || !safeUrl) return;
    const linkText = anchorText.trim() || selection.label.trim() || nextLabel || safeUrl;
    restoreSelection();
    const browserSelection = window.getSelection();

    if (browserSelection?.rangeCount) {
      const range = browserSelection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(createAnchorNode(safeUrl, linkText));
      browserSelection.removeAllRanges();
    } else {
      document.execCommand("insertHTML", false, `<a href="${escapeAttribute(safeUrl)}">${escapeHtml(linkText)}</a>`);
    }

    editor.dispatchEvent(new Event("input", { bubbles: true }));
    onApply();
  }

  function removeLink() {
    if (!editor || !selection.href) return;
    restoreSelection();
    document.execCommand("unlink");
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    onApply();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-light">{selection.href ? "Editar link" : "Inserir link"}</h2>
          <button type="button" onClick={onClose} className="h-10 w-10 rounded-xl border border-slate-200">
            <X size={18} className="mx-auto" />
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-500">Busque um conteúdo interno do corretor ou informe uma URL externa segura.</p>

        <div className="mt-4 grid gap-2">
          <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Texto âncora</label>
          <input value={anchorText} onChange={(event) => setAnchorText(event.target.value)} placeholder="Texto que ficará clicável no artigo" className="input-base" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
          <button type="button" onClick={() => setMode("internal")} className={`rounded-xl px-4 py-2 text-sm font-bold ${mode === "internal" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>
            Conteúdo interno
          </button>
          <button type="button" onClick={() => setMode("url")} className={`rounded-xl px-4 py-2 text-sm font-bold ${mode === "url" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>
            URL externa
          </button>
        </div>

        {mode === "internal" ? (
          <div className="mt-4">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar imóveis, empreendimentos ou artigos..." className="input-base" autoFocus />
            <div className="mt-3 max-h-72 overflow-y-auto rounded-2xl border border-slate-200">
              {loadingTargets ? (
                <div className="flex items-center gap-2 p-4 text-sm text-slate-500">
                  <SpinnerGap size={16} className="animate-spin" />
                  Buscando conteúdos...
                </div>
              ) : targets.length > 0 ? (
                targets.map((target) => (
                  <button key={`${target.type}-${target.id}`} type="button" onClick={() => setSelectedTarget(target)} className={`grid w-full gap-1 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50 ${selectedTarget?.href === target.href ? "bg-stone-50" : ""}`}>
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--grey-olive)]">{getTargetTypeLabel(target.type)}</span>
                    <span className="text-sm font-bold text-slate-950">{target.label}</span>
                    <span className="text-xs text-slate-500">{target.description}</span>
                  </button>
                ))
              ) : (
                <div className="p-4 text-sm text-slate-500">Nenhum conteúdo encontrado.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." className="input-base" autoFocus />
            <p className="mt-2 text-xs text-slate-500">Links externos serão tratados na publicação com proteção editorial.</p>
          </div>
        )}

        {currentHref ? (
          <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--grey-olive)]">
              {selectedTarget ? "Link selecionado" : selection.href ? "Link atual" : "Destino do link"}
            </p>
            <p className="mt-1 break-all text-sm font-medium text-slate-700">{currentHref}</p>
            {selectedTarget ? <p className="mt-1 text-xs text-slate-500">{selectedTarget.label}</p> : null}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {selection.href ? (
            <button type="button" onClick={removeLink} className="mr-auto rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600">
              Remover link
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold">
            Cancelar
          </button>
          {currentHref ? (
            <button type="button" onClick={() => applyHref(currentHref, selectedTarget?.label)} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">
              Aplicar link
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function getArticleLinkSelection(editor: HTMLDivElement): ArticleLinkSelection {
  const browserSelection = window.getSelection();
  const range = browserSelection?.rangeCount ? browserSelection.getRangeAt(0) : null;
  const isEditorSelection = Boolean(range && editor.contains(range.commonAncestorContainer));
  const anchor = findClosestArticleAnchor(browserSelection?.anchorNode, editor) ?? findClosestArticleAnchor(range?.commonAncestorContainer, editor);

  if (anchor) {
    const linkRange = document.createRange();
    linkRange.selectNode(anchor);
    return { range: linkRange, href: anchor.getAttribute("href") ?? "", label: anchor.textContent ?? "" };
  }

  return {
    range: isEditorSelection && range ? range.cloneRange() : null,
    href: "",
    label: isEditorSelection && range ? range.toString() : "",
  };
}

export function findClosestArticleAnchor(target: EventTarget | Node | null | undefined, editor: HTMLDivElement | null | undefined) {
  if (!target || !editor || !(target instanceof Node)) return null;
  const element = target.nodeType === Node.ELEMENT_NODE ? (target as Element) : target.parentElement;
  const anchor = element?.closest("a");
  return anchor instanceof HTMLAnchorElement && editor.contains(anchor) ? anchor : null;
}

function getTargetTypeLabel(type: ArticleLinkTarget["type"]) {
  if (type === "imovel") return "Imóvel";
  if (type === "empreendimento") return "Empreendimento";
  return "Artigo";
}

function createAnchorNode(href: string, label: string) {
  const anchor = document.createElement("a");
  anchor.setAttribute("href", href);
  anchor.textContent = label;
  return anchor;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/'/g, "&#039;");
}
