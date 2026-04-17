"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";

export type CompactDateCalendarDay = {
  date: Date;
  value: string;
  isCurrentMonth: boolean;
  isDisabled: boolean;
};

function formatCalendarHeader(date: Date) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function CompactDateCalendar({
  month,
  days,
  selectedDate,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
  size = "sm",
}: {
  month: Date;
  days: CompactDateCalendarDay[];
  selectedDate: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (day: CompactDateCalendarDay) => void;
  size?: "sm" | "md";
}) {
  const isSmall = size === "sm";

  return (
    <div className={`rounded-[20px] border border-slate-200 bg-white ${isSmall ? "p-2.5" : "p-3.5"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className={`${isSmall ? "text-[13px]" : "text-sm"} font-semibold text-slate-900`}>{formatCalendarHeader(month)}</p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPrevMonth}
            className={`inline-flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 ${
              isSmall ? "h-7 w-7" : "h-8 w-8"
            }`}
            aria-label="Mes anterior"
          >
            <CaretLeft size={isSmall ? 13 : 14} />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className={`inline-flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 ${
              isSmall ? "h-7 w-7" : "h-8 w-8"
            }`}
            aria-label="Proximo mes"
          >
            <CaretRight size={isSmall ? 13 : 14} />
          </button>
        </div>
      </div>

      <div
        className={`grid grid-cols-7 text-center font-semibold uppercase tracking-[0.14em] text-slate-400 ${
          isSmall ? "mt-2.5 gap-1 text-[9px]" : "mt-3 gap-1.5 text-[10px]"
        }`}
      >
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className={`grid grid-cols-7 ${isSmall ? "mt-2 gap-1" : "mt-2 gap-1.5"}`}>
        {days.map((day) => (
          <button
            key={day.value}
            type="button"
            disabled={day.isDisabled}
            onClick={() => onSelectDate(day)}
            className={`aspect-square border transition ${isSmall ? "rounded-[11px] text-[11px]" : "rounded-[13px] text-xs"} ${
              day.isDisabled
                ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                : selectedDate === day.value
                  ? "border-[var(--blue-slate)] bg-[var(--blue-slate)]/8 font-semibold text-[var(--blue-slate)]"
                  : day.isCurrentMonth
                    ? "border-slate-200 bg-white text-slate-700 hover:border-[var(--blue-slate)]/30 hover:bg-slate-50"
                    : "border-slate-100 bg-white text-slate-400 hover:bg-slate-50"
            }`}
          >
            {day.date.getDate()}
          </button>
        ))}
      </div>
    </div>
  );
}
