"use client";

import { useState } from "react";

const integerFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

type MaskedIntegerInputProps = {
  name: string;
  label: string;
  value: number | null;
  prefix?: string;
  placeholder?: string;
};

export function MaskedIntegerInput({ name, label, value, prefix, placeholder }: MaskedIntegerInputProps) {
  const [digits, setDigits] = useState(value ? String(value) : "");
  const displayValue = digits ? integerFormatter.format(Number(digits)) : "";

  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <span className="mt-2 flex items-center rounded-lg border border-stone-200 bg-white px-3 py-3 transition focus-within:border-[var(--grey-olive)]">
        {prefix ? <span className="mr-2 text-sm font-bold text-slate-400">{prefix}</span> : null}
        <input
          value={displayValue}
          onChange={(event) => setDigits(event.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          type="text"
          placeholder={placeholder}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-300"
        />
      </span>
      <input type="hidden" name={name} value={digits} />
    </label>
  );
}
