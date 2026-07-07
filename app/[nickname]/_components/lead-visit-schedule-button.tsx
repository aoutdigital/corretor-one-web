"use client";

import Image from "next/image";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, CalendarBlank, CaretLeft, CaretRight, CheckCircle, Clock, SpinnerGap, X } from "@phosphor-icons/react";

type LeadVisitScheduleButtonProps = {
  nickname: string;
  brokerName: string;
  label?: string;
  className?: string;
  children?: ReactNode;
  avatarUrl?: string | null;
  creci?: string | null;
  imovelId: string;
  imovelTitulo: string;
  permiteVisitaImediata?: boolean | null;
};

type SubmitState = "idle" | "submitting" | "success" | "error";

type VisitCalendarDay = {
  date: Date;
  value: string;
  isCurrentMonth: boolean;
  isDisabled: boolean;
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Não foi possível solicitar a visita agora.";
  const error = (payload as { error?: { message?: unknown } }).error;
  return typeof error?.message === "string" ? error.message : "Não foi possível solicitar a visita agora.";
}

function getUtmParams() {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};

  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const value = params.get(key);
    if (value) utm[key] = value;
  }

  return utm;
}

function formatBrPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  const ddd = digits.slice(0, 2);
  const prefix = digits.length > 10 ? digits.slice(2, 7) : digits.slice(2, 6);
  const suffix = digits.length > 10 ? digits.slice(7, 11) : digits.slice(6, 10);

  if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : "";
  if (!prefix) return `(${ddd})`;
  if (!suffix) return `(${ddd}) ${prefix}`;
  return `(${ddd}) ${prefix}-${suffix}`;
}

function formatDateInput(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function parseLocalDateInput(value: string) {
  if (!value) return null;
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function formatCalendarHeader(date: Date) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatVisitDateLabel(value: string) {
  const parsed = parseLocalDateInput(value);
  if (!parsed) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(parsed);
}

function buildCalendarGrid(monthAnchor: Date, minDate: Date, maxDate: Date): VisitCalendarDay[] {
  const monthStart = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
  const startWeekday = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - startWeekday);
  const minDateStart = startOfDay(minDate);
  const maxDateStart = startOfDay(maxDate);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const dayStart = startOfDay(date);

    return {
      date,
      value: formatDateInput(date),
      isCurrentMonth: date.getMonth() === monthAnchor.getMonth(),
      isDisabled: dayStart < minDateStart || dayStart > maxDateStart,
    };
  });
}

function buildTimeSlots() {
  const slots: string[] = [];
  for (let hour = 8; hour <= 20; hour += 1) {
    for (const minute of [0, 30]) {
      if (hour === 20 && minute > 0) continue;
      slots.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    }
  }
  return slots;
}

function isValidTimeSlotForDate(input: {
  date: string;
  time: string;
  allowsImmediateVisit: boolean;
}) {
  return !validateVisitStep({
    visitDate: input.date,
    visitTime: input.time,
    permiteVisitaImediata: input.allowsImmediateVisit,
  });
}

function parseScheduledDate(date: string, time: string) {
  const scheduledAt = new Date(`${date}T${time}:00-03:00`);
  return Number.isNaN(scheduledAt.getTime()) ? null : scheduledAt;
}

function validateVisitStep(input: {
  visitDate: string;
  visitTime: string;
  permiteVisitaImediata: boolean;
}) {
  if (!input.visitDate) return "Escolha a data da visita.";
  if (!input.visitTime) return "Escolha o horário da visita.";

  const scheduledAt = parseScheduledDate(input.visitDate, input.visitTime);
  if (!scheduledAt) return "Escolha uma data e horário válidos.";

  const [hourText, minuteText] = input.visitTime.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 8 || hour > 20 || (hour === 20 && minute > 0)) {
    return "Escolha um horário entre 08:00 e 20:00.";
  }

  const now = new Date();
  const today = formatDateInput(now);
  const maxDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  if (scheduledAt <= now) return "Escolha uma data e horário futuros.";
  if (scheduledAt > maxDate) return "Agende uma visita para os próximos 14 dias.";
  if (!input.permiteVisitaImediata && input.visitDate === today) {
    return "Este imóvel não permite visita para hoje. Escolha uma data a partir de amanhã.";
  }

  if (input.visitDate === today) {
    const minimumSameDayDate = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    if (scheduledAt < minimumSameDayDate) {
      return "Para visitas hoje, escolha um horário com pelo menos 4 horas de antecedência.";
    }
  }

  return null;
}

export function LeadVisitScheduleButton({
  nickname,
  brokerName,
  label = "Agendar visita",
  className,
  children,
  avatarUrl,
  creci,
  imovelId,
  imovelTitulo,
  permiteVisitaImediata,
}: LeadVisitScheduleButtonProps) {
  const allowsImmediateVisit = permiteVisitaImediata !== false;
  const today = useMemo(() => new Date(), []);
  const minDateObject = useMemo(() => {
    if (allowsImmediateVisit) return startOfDay(today);
    return startOfDay(new Date(today.getTime() + 24 * 60 * 60 * 1000));
  }, [allowsImmediateVisit, today]);
  const maxDateObject = useMemo(() => startOfDay(new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)), [today]);
  const timeSlots = useMemo(() => buildTimeSlots(), []);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(minDateObject.getFullYear(), minDateObject.getMonth(), 1));
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(`Tenho interesse em visitar este imóvel: ${imovelTitulo}`);
  const [website, setWebsite] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const calendarDays = useMemo(
    () => buildCalendarGrid(calendarMonth, minDateObject, maxDateObject),
    [calendarMonth, maxDateObject, minDateObject],
  );
  const availableTimeSlots = useMemo(() => {
    if (!visitDate) return [];
    return timeSlots.filter((time) =>
      isValidTimeSlotForDate({
        date: visitDate,
        time,
        allowsImmediateVisit,
      }),
    );
  }, [allowsImmediateVisit, timeSlots, visitDate]);

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

  function resetAndClose() {
    setOpen(false);
    window.setTimeout(() => {
      setStep(1);
      setSubmitState("idle");
      setFeedback(null);
      setCalendarMonth(new Date(minDateObject.getFullYear(), minDateObject.getMonth(), 1));
    }, 250);
  }

  function handleSelectDate(day: VisitCalendarDay) {
    if (day.isDisabled) return;
    setVisitDate(day.value);
    setVisitTime((current) =>
      current &&
      isValidTimeSlotForDate({
        date: day.value,
        time: current,
        allowsImmediateVisit,
      })
        ? current
        : "",
    );
    setSubmitState("idle");
    setFeedback(null);
    setStep(2);
  }

  function handleSelectTime(time: string) {
    if (!visitDate) return;
    if (
      !isValidTimeSlotForDate({
        date: visitDate,
        time,
        allowsImmediateVisit,
      })
    ) {
      setSubmitState("error");
      setFeedback("Escolha outro horário disponível para esta data.");
      return;
    }

    setVisitTime(time);
    setSubmitState("idle");
    setFeedback(null);
    setStep(3);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("submitting");
    setFeedback(null);

    const validationMessage = validateVisitStep({
      visitDate,
      visitTime,
      permiteVisitaImediata: allowsImmediateVisit,
    });
    if (validationMessage) {
      setSubmitState("error");
      setFeedback(validationMessage);
      setStep(visitDate ? 2 : 1);
      return;
    }

    try {
      const response = await fetch("/api/public/lead-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_key: "visit_schedule",
          nickname,
          nome: firstName,
          sobrenome: lastName,
          telefone: phone,
          email,
          mensagem: message,
          visit_date: visitDate,
          visit_time: visitTime,
          website,
          page_url: window.location.href,
          referrer: document.referrer,
          utm: getUtmParams(),
          context: {
            imovel_id: imovelId,
            imovel_titulo: imovelTitulo,
            permite_visita_imediata: allowsImmediateVisit,
          },
        }),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        setSubmitState("error");
        setFeedback(getErrorMessage(payload));
        return;
      }

      setSubmitState("success");
      setFeedback("Visita solicitada. Vou te retornar para confirmar os detalhes.");
    } catch {
      setSubmitState("error");
      setFeedback("Não foi possível solicitar a visita agora. Verifique sua conexão e tente novamente.");
    }
  }

  function handlePhoneChange(value: string) {
    setPhone(formatBrPhone(value));
  }

  const modal =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
            <div className="relative max-h-[calc(100vh-4rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl shadow-slate-950/25">
              <button
                type="button"
                className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                aria-label="Fechar"
                onClick={resetAndClose}
              >
                <X size={18} />
              </button>

              <div className="border-b border-slate-200 px-6 py-6 pr-16">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--grey-olive)]">Agendar visita</p>
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
                <h2 className="mt-4 text-3xl font-light leading-tight text-slate-950">
                  Vamos encontrar o melhor horário para você conhecer este imóvel.
                </h2>
                <p className="mt-3 text-sm font-light leading-6 text-slate-600">{imovelTitulo}</p>
              </div>

              {submitState === "success" ? (
                <div className="px-6 py-10 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[color:rgba(145,139,118,0.12)] text-[var(--grey-olive)]">
                    <CheckCircle size={28} weight="fill" />
                  </div>
                  <h3 className="mt-5 text-3xl font-light leading-tight text-slate-950">Pedido de visita recebido.</h3>
                  <p className="mx-auto mt-3 max-w-md text-sm font-light leading-6 text-slate-600">
                    Vou revisar sua solicitação e confirmar o melhor horário com você.
                  </p>
                  {feedback ? <p className="mt-4 text-sm font-medium text-emerald-700">{feedback}</p> : null}
                  <button
                    type="button"
                    onClick={resetAndClose}
                    className="mt-7 inline-flex items-center justify-center rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="px-6 py-6">
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                    className="hidden"
                    aria-hidden="true"
                  />

                  {step === 1 ? (
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-semibold text-slate-950">Escolha o dia da visita</p>
                          <p className="mt-1 text-sm font-light leading-6 text-slate-600">
                            {allowsImmediateVisit
                              ? "Para hoje, os horários consideram pelo menos 4 horas de antecedência."
                              : "Este imóvel agenda visitas a partir de amanhã."}
                          </p>
                        </div>
                        <CalendarBlank className="hidden shrink-0 text-[var(--grey-olive)] sm:block" size={26} />
                      </div>

                      <div className="mx-auto mt-5 w-full rounded-2xl border border-slate-200 bg-white p-3 sm:max-w-[500px] sm:p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-base font-semibold text-slate-950">{formatCalendarHeader(calendarMonth)}</p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                              disabled={
                                calendarMonth.getFullYear() === minDateObject.getFullYear() &&
                                calendarMonth.getMonth() === minDateObject.getMonth()
                              }
                              aria-label="Mês anterior"
                            >
                              <CaretLeft size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                              disabled={
                                calendarMonth.getFullYear() === maxDateObject.getFullYear() &&
                                calendarMonth.getMonth() === maxDateObject.getMonth()
                              }
                              aria-label="Próximo mês"
                            >
                              <CaretRight size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"].map((weekday) => (
                            <span key={weekday}>{weekday}</span>
                          ))}
                        </div>

                        <div className="mt-2 grid grid-cols-7 gap-1.5">
                          {calendarDays.map((day) => (
                            <button
                              key={day.value}
                              type="button"
                              disabled={day.isDisabled}
                              onClick={() => handleSelectDate(day)}
                              className={[
                                "aspect-square rounded-xl border text-sm transition sm:rounded-lg sm:text-xs",
                                day.isDisabled
                                  ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                                  : visitDate === day.value
                                    ? "border-[var(--grey-olive)] bg-[color:rgba(145,139,118,0.12)] font-semibold text-[var(--grey-olive)]"
                                    : day.isCurrentMonth
                                      ? "border-slate-200 bg-white text-slate-700 hover:border-[var(--grey-olive)] hover:bg-[color:rgba(145,139,118,0.06)]"
                                      : "border-slate-100 bg-white text-slate-400 hover:bg-slate-50",
                              ].join(" ")}
                            >
                              {day.date.getDate()}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : step === 2 ? (
                    <div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-lg font-semibold text-slate-950">Escolha o horário</p>
                          <p className="mt-1 text-sm font-light leading-6 text-slate-600">
                            {formatVisitDateLabel(visitDate) || "Selecione uma data no calendário."}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                          Trocar data
                        </button>
                      </div>

                      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        {availableTimeSlots.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                            {timeSlots.map((time) => {
                              const enabled = availableTimeSlots.includes(time);
                              return (
                                <button
                                  key={time}
                                  type="button"
                                  disabled={!enabled}
                                  onClick={() => handleSelectTime(time)}
                                  className={[
                                    "inline-flex h-11 items-center justify-center rounded-xl border text-sm font-semibold transition",
                                    !enabled
                                      ? "cursor-not-allowed border-slate-100 bg-white/60 text-slate-300"
                                      : visitTime === time
                                        ? "border-[var(--grey-olive)] bg-[var(--grey-olive)] text-white"
                                        : "border-slate-200 bg-white text-slate-700 hover:border-[var(--grey-olive)] hover:text-[var(--grey-olive)]",
                                  ].join(" ")}
                                >
                                  {time}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-light leading-6 text-slate-600">
                            Não encontrei horários disponíveis para este dia dentro das regras de agendamento.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--grey-olive)]">Visita</p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-700">
                          <span className="inline-flex items-center gap-2">
                            <CalendarBlank size={17} className="text-[var(--grey-olive)]" />
                            {formatVisitDateLabel(visitDate)}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <Clock size={17} className="text-[var(--grey-olive)]" />
                            {visitTime}
                          </span>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          value={firstName}
                          onChange={(event) => setFirstName(event.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--grey-olive)] focus:ring-4 focus:ring-[var(--grey-olive)]/10"
                          placeholder="Nome"
                          autoComplete="given-name"
                        />
                        <input
                          value={lastName}
                          onChange={(event) => setLastName(event.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--grey-olive)] focus:ring-4 focus:ring-[var(--grey-olive)]/10"
                          placeholder="Sobrenome"
                          autoComplete="family-name"
                        />
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <input
                          value={phone}
                          onChange={(event) => handlePhoneChange(event.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--grey-olive)] focus:ring-4 focus:ring-[var(--grey-olive)]/10"
                          placeholder="(11) 99999-9999"
                          autoComplete="tel"
                          inputMode="tel"
                        />
                        <input
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--grey-olive)] focus:ring-4 focus:ring-[var(--grey-olive)]/10"
                          placeholder="E-mail"
                          autoComplete="email"
                          inputMode="email"
                          required
                        />
                      </div>

                      <textarea
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        rows={4}
                        className="mt-3 w-full resize-none rounded-lg border border-slate-300 px-3 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--grey-olive)] focus:ring-4 focus:ring-[var(--grey-olive)]/10"
                        placeholder="Mensagem"
                      />
                    </>
                  )}

                  {feedback ? (
                    <div
                      className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
                    >
                      {feedback}
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                      onClick={step === 1 ? resetAndClose : () => setStep(step === 3 ? 2 : 1)}
                    >
                      {step === 1 ? "Cancelar" : "Voltar"}
                    </button>
                    {step === 3 ? (
                      <button
                        type="submit"
                        disabled={submitState === "submitting"}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--grey-olive)] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {submitState === "submitting" ? <SpinnerGap size={18} className="animate-spin" /> : <CalendarBlank size={18} />}
                        Solicitar visita
                      </button>
                    ) : null}
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children ?? (
          <>
            {label}
            <ArrowRight size={16} />
          </>
        )}
      </button>
      {modal}
    </>
  );
}
