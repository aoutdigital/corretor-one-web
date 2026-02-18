"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import DualImageCropper from "@/app/_components/cropimage";
import { apiFetchWithAuth, getAccessToken } from "@/lib/client/auth-api";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  primeiro_nome: string | null;
  sobrenome: string | null;
  nickname: string | null;
  genero: "MASCULINO" | "FEMININO" | "NAO_INFORMAR" | null;
  uf: string | null;
  cidades_foco: string[] | null;
  telefone: string | null;
  whatsapp_verificado_em: string | null;
  plano_id: string | null;
  avatar_url: string | null;
  imoveis_residenciais: boolean;
  imoveis_comerciais: boolean;
  imoveis_industriais: boolean;
  imoveis_alto_padrao: boolean;
  imoveis_luxo: boolean;
  imoveis_medio_padrao: boolean;
  imoveis_baixa_renda: boolean;
  creci_uf?: string | null;
  creci_numero?: string | null;
  creci_sufixo?: string | null;
};

type CidadeOption = {
  codigo_ibge: number;
  nome: string;
  uf: string;
};

type NicknameCheckResponse = {
  ok: boolean;
  data?: {
    available: boolean;
    reason: "INVALID_FORMAT" | "BLOCKED_TERM" | "TAKEN" | null;
  };
  error?: {
    message: string;
  };
};

type NicknameState = "idle" | "checking" | "available" | "unavailable";
type Plano = {
  id: string;
  nome: string;
  slug: string;
  preco_mensal: number;
  preco_anual: number | null;
  limite_imoveis: number | null;
  limite_emails_mes: number | null;
  limite_whatsapp_mes: number | null;
  ayka_franquia_mensal: number;
};

type CheckoutPeriod = "MENSAL" | "ANUAL";

const UF_OPTIONS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

const TOTAL_STEPS = 8;

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const [primeiroNome, setPrimeiroNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [nickname, setNickname] = useState("");
  const [originalNickname, setOriginalNickname] = useState<string | null>(null);
  const [genero, setGenero] = useState<"" | "MASCULINO" | "FEMININO" | "NAO_INFORMAR">("");
  const [uf, setUf] = useState("");
  const [cidadesFoco, setCidadesFoco] = useState<CidadeOption[]>([]);
  const [cidadeInput, setCidadeInput] = useState("");
  const [cidadeOptions, setCidadeOptions] = useState<CidadeOption[]>([]);
  const [cidadeLoading, setCidadeLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarVerticalPreviewUrl, setAvatarVerticalPreviewUrl] = useState<string | null>(null);
  const [avatarSquareFile, setAvatarSquareFile] = useState<File | null>(null);
  const [avatarCropSourceUrl, setAvatarCropSourceUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [smsSentTo, setSmsSentTo] = useState<string | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [sendingSmsCode, setSendingSmsCode] = useState(false);
  const [verifyingSmsCode, setVerifyingSmsCode] = useState(false);
  const [smsCooldownSeconds, setSmsCooldownSeconds] = useState(0);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [selectedPlanoId, setSelectedPlanoId] = useState<string | null>(null);
  const [checkoutPeriod, setCheckoutPeriod] = useState<CheckoutPeriod>("MENSAL");
  const [loadingPlanos, setLoadingPlanos] = useState(false);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [desiredPlanSlug, setDesiredPlanSlug] = useState<string | null>(null);

  const [focoImoveis, setFocoImoveis] = useState({
    imoveis_residenciais: true,
    imoveis_comerciais: false,
    imoveis_industriais: false,
    imoveis_alto_padrao: false,
    imoveis_luxo: false,
    imoveis_medio_padrao: false,
    imoveis_baixa_renda: false,
  });

  const [nicknameState, setNicknameState] = useState<NicknameState>("idle");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progress = useMemo(() => Math.round((step / TOTAL_STEPS) * 100), [step]);

  useEffect(() => {
    async function bootstrap() {
      setError(null);

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/entrar");
        return;
      }

      const bootstrapResult = await apiFetchWithAuth<{ id: string; created: boolean }>(
        "/api/profile/bootstrap",
        { method: "POST" },
      );

      if (!bootstrapResult.ok) {
        setError(bootstrapResult.error);
        setLoading(false);
        return;
      }

      const profileResult = await apiFetchWithAuth<Profile>("/api/profile");
      if (!profileResult.ok) {
        setError(profileResult.error);
        setLoading(false);
        return;
      }

      const profile = profileResult.data;

      const pendingCreciRaw =
        typeof window !== "undefined" ? window.localStorage.getItem("co_signup_creci") : null;

      if (pendingCreciRaw && !profile.creci_uf && !profile.creci_numero) {
        try {
          const pending = JSON.parse(pendingCreciRaw) as
            | { creci_uf?: string; creci_numero?: string; creci_sufixo?: string }
            | null;

          if (pending?.creci_uf && pending?.creci_numero) {
            await apiFetchWithAuth<{ id: string }>("/api/profile", {
              method: "PATCH",
              body: JSON.stringify({
                creci_uf: pending.creci_uf,
                creci_numero: pending.creci_numero,
                creci_sufixo: pending.creci_sufixo ?? "F",
              }),
            });
          }
        } catch {
          // ignore invalid payload
        }

        window.localStorage.removeItem("co_signup_creci");
      }

      setPrimeiroNome(profile.primeiro_nome ?? "");
      setSobrenome(profile.sobrenome ?? "");
      setNickname(profile.nickname ?? "");
      setOriginalNickname(profile.nickname ?? null);
      setGenero(profile.genero ?? "");
      setUf(profile.uf ?? "");
      setCidadesFoco(
        (profile.cidades_foco ?? []).map((nome, index) => ({
          codigo_ibge: -(index + 1),
          nome,
          uf: profile.uf ?? "",
        })),
      );
      setAvatarUrl(profile.avatar_url ?? "");
      setAvatarPreviewUrl(profile.avatar_url ?? null);
      setTelefone(formatPhoneDisplay(profile.telefone ?? ""));
      setPhoneVerified(Boolean(profile.telefone && profile.whatsapp_verificado_em));
      setSmsSentTo(profile.telefone ?? null);
      setSelectedPlanoId(profile.plano_id ?? null);
      setFocoImoveis({
        imoveis_residenciais: profile.imoveis_residenciais,
        imoveis_comerciais: profile.imoveis_comerciais,
        imoveis_industriais: profile.imoveis_industriais,
        imoveis_alto_padrao: profile.imoveis_alto_padrao,
        imoveis_luxo: profile.imoveis_luxo,
        imoveis_medio_padrao: profile.imoveis_medio_padrao,
        imoveis_baixa_renda: profile.imoveis_baixa_renda,
      });
      setStep(findFirstIncompleteStep(profile));
      setLoading(false);
    }

    void bootstrap();
  }, [router]);

  useEffect(() => {
    const fromQuery = (searchParams.get("plano") ?? "").toLowerCase().trim();
    const querySlug = /^[a-z0-9-]{2,35}$/.test(fromQuery) ? fromQuery : null;
    const fromStorage =
      typeof window !== "undefined" ? window.localStorage.getItem("co_signup_plano_slug") : null;
    const storageSlug =
      fromStorage && /^[a-z0-9-]{2,35}$/.test(fromStorage) ? fromStorage : null;

    const resolved = querySlug ?? storageSlug ?? null;
    setDesiredPlanSlug(resolved);

    if (resolved && typeof window !== "undefined") {
      window.localStorage.setItem("co_signup_plano_slug", resolved);
    }
  }, [searchParams]);

  useEffect(() => {
    if (step !== 8) return;
    if (planos.length > 0) return;

    let active = true;
    setLoadingPlanos(true);

    apiFetchWithAuth<Plano[]>("/api/planos")
      .then((result) => {
        if (!active) return;
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setPlanos(result.data);
      })
      .finally(() => {
        if (active) setLoadingPlanos(false);
      });

    return () => {
      active = false;
    };
  }, [step, planos.length]);

  useEffect(() => {
    if (step !== 8) return;
    if (!desiredPlanSlug) return;
    if (!planos.length) return;
    if (selectedPlanoId) return;

    const desired = planos.find((item) => item.slug === desiredPlanSlug);
    if (desired) {
      setSelectedPlanoId(desired.id);
    }
  }, [step, desiredPlanSlug, planos, selectedPlanoId]);

  useEffect(() => {
    if (smsCooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setSmsCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [smsCooldownSeconds]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      [avatarCropSourceUrl, avatarPreviewUrl, avatarVerticalPreviewUrl].forEach((url) => {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, [avatarCropSourceUrl, avatarPreviewUrl, avatarVerticalPreviewUrl]);

  async function uploadAvatarAndSave(): Promise<boolean> {
    if (!avatarSquareFile) return true;

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setError("Sessão expirada. Faça login novamente.");
      return false;
    }

    setUploadingAvatar(true);
    const form = new FormData();
    form.append("file", avatarSquareFile);
    form.append("ref_tipo", "OUTRO");
    form.append("grupo", "avatar_profile");
    form.append("titulo", "Avatar de perfil");

    const response = await fetch("/api/midia/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          ok: boolean;
          data?: { url: string };
          error?: { message?: string };
        }
      | null;

    if (!response.ok || !payload?.ok || !payload.data?.url) {
      setUploadingAvatar(false);
      setError(payload?.error?.message ?? "Falha ao enviar avatar.");
      return false;
    }

    const saveResult = await savePatch({ avatar_url: payload.data.url });
    setUploadingAvatar(false);

    if (!saveResult) {
      return false;
    }

    setAvatarUrl(payload.data.url);
    setAvatarSquareFile(null);
    return true;
  }

  async function savePatch(patch: Record<string, unknown>) {
    const result = await apiFetchWithAuth<{ id: string }>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });

    if (!result.ok) {
      setError(result.error);
      return false;
    }

    return true;
  }

  async function startCheckout(planoId: string, periodicidade: CheckoutPeriod): Promise<boolean> {
    setStartingCheckout(true);
    const result = await apiFetchWithAuth<{ url: string }>("/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({
        plano_id: planoId,
        periodicidade,
      }),
    });
    setStartingCheckout(false);

    if (!result.ok) {
      setError(result.error);
      return false;
    }

    if (typeof window !== "undefined") {
      window.location.href = result.data.url;
    }
    return true;
  }

  async function checkNicknameAvailability() {
    const normalizedNickname = nickname.trim().toLowerCase();
    const normalizedOriginal = originalNickname?.trim().toLowerCase() ?? null;

    if (normalizedOriginal && normalizedNickname === normalizedOriginal) {
      setNicknameState("available");
      return true;
    }

    if (!normalizedNickname) {
      setNicknameState("idle");
      return false;
    }

    setNicknameState("checking");

    const response = await fetch(
      `/api/nickname/check?nickname=${encodeURIComponent(normalizedNickname)}`,
    );
    const payload = (await response.json().catch(() => null)) as NicknameCheckResponse | null;

    if (!response.ok || !payload?.ok || !payload.data) {
      setNicknameState("unavailable");
      setError(payload?.error?.message ?? "Não foi possível validar o nickname agora.");
      return false;
    }

    if (!payload.data.available) {
      setNicknameState("unavailable");
      return false;
    }

    setNicknameState("available");
    return true;
  }

  function showToast(message: string) {
    setToastMessage(message);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }

  function normalizePhone(input: string) {
    const digitsRaw = input.replace(/\D/g, "");
    if (!digitsRaw) return "";
    const localDigits =
      digitsRaw.startsWith("55") && digitsRaw.length >= 12 ? digitsRaw.slice(2) : digitsRaw;
    const withCountry = `55${localDigits}`;
    return `+${withCountry}`;
  }

  function formatCountdown(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function formatPhoneDisplay(input: string) {
    const digitsRaw = input.replace(/\D/g, "");
    const localDigits =
      digitsRaw.startsWith("55") && digitsRaw.length >= 12 ? digitsRaw.slice(2) : digitsRaw;
    const digits = localDigits.slice(0, 11);

    if (!digits) return "";
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  async function sendSmsCode() {
    setError(null);
    const phoneE164 = normalizePhone(telefone);
    if (!phoneE164 || phoneE164.length < 13) {
      setError("Informe um telefone celular válido com DDD.");
      return;
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setError("Sessão expirada. Faça login novamente.");
      return;
    }

    setSendingSmsCode(true);
    const response = await fetch("/api/auth/phone/send-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        phone: phoneE164,
        provider: "smtp2go",
      }),
    });
    setSendingSmsCode(false);

    const payload = (await response.json().catch(() => null)) as
      | {
          ok: boolean;
          data?: { phone_e164: string; expires_at: string; retry_after_seconds?: number };
          error?: { code?: string; message?: string; retry_after_seconds?: number };
        }
      | null;

    if (!response.ok || !payload?.ok || !payload.data) {
      const retryAfter = payload?.error?.retry_after_seconds ?? 0;
      if (retryAfter > 0) {
        setSmsCooldownSeconds(retryAfter);
      }
      setError(payload?.error?.message ?? "Falha ao enviar código SMS.");
      return;
    }

    setSmsSentTo(payload.data.phone_e164);
    setSmsCooldownSeconds(payload.data.retry_after_seconds ?? 300);
    setSmsCode("");
    setPhoneVerified(false);
    showToast("Código enviado por SMS.");
  }

  async function verifySmsCode() {
    setError(null);
    const phoneE164 = normalizePhone(telefone);
    if (!phoneE164 || phoneE164.length < 13) {
      setError("Informe um telefone celular válido com DDD.");
      return;
    }

    if (!/^[0-9]{6}$/.test(smsCode)) {
      setError("Informe o código de 6 dígitos.");
      return;
    }

    setVerifyingSmsCode(true);
    const result = await apiFetchWithAuth<{ phone_e164: string; verified_at: string }>(
      "/api/auth/phone/verify-code",
      {
        method: "POST",
        body: JSON.stringify({
          phone: phoneE164,
          code: smsCode,
        }),
      },
    );
    setVerifyingSmsCode(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setTelefone(formatPhoneDisplay(result.data.phone_e164));
    setSmsSentTo(result.data.phone_e164);
    setPhoneVerified(true);
    setSmsCode("");
    showToast("Número verificado com sucesso.");
  }

  function selectCidade(cidade: CidadeOption) {
    const exists = cidadesFoco.some((item) => item.codigo_ibge === cidade.codigo_ibge);
    if (exists) {
      setCidadeInput("");
      setCidadeOptions([]);
      return;
    }
    setCidadesFoco((prev) => [...prev, cidade]);
    setCidadeInput("");
    setCidadeOptions([]);
  }

  function removeCidade(codigoIbge: number) {
    setCidadesFoco((prev) => prev.filter((item) => item.codigo_ibge !== codigoIbge));
  }

  function focusSelectedCount() {
    return Object.values(focoImoveis).filter(Boolean).length;
  }

  async function handleNext(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    if (step === 1) {
      if (primeiroNome.trim().length < 2 || sobrenome.trim().length < 2) {
        setSaving(false);
        setError("Informe nome e sobrenome com pelo menos 2 caracteres.");
        return;
      }

      const ok = await savePatch({
        primeiro_nome: primeiroNome.trim(),
        sobrenome: sobrenome.trim(),
      });

      if (!ok) {
        setSaving(false);
        return;
      }
    }

    if (step === 2) {
      const normalizedNickname = nickname.trim().toLowerCase();

      if (!normalizedNickname) {
        setSaving(false);
        setError("Informe seu nickname.");
        return;
      }

      const available = await checkNicknameAvailability();
      if (!available) {
        setSaving(false);
        setError("Nickname indisponível. Escolha outro para continuar.");
        return;
      }

      const ok = await savePatch({ nickname: normalizedNickname });
      if (!ok) {
        setSaving(false);
        return;
      }

      setNickname(normalizedNickname);
      setOriginalNickname(normalizedNickname);
    }

    if (step === 3) {
      if (!genero) {
        setSaving(false);
        setError("Selecione o gênero para continuar.");
        return;
      }

      const ok = await savePatch({ genero });
      if (!ok) {
        setSaving(false);
        return;
      }
    }

    if (step === 4) {
      if (!uf || cidadesFoco.length === 0) {
        setSaving(false);
        setError("Selecione a UF e ao menos uma cidade foco.");
        return;
      }

      const result = await apiFetchWithAuth<{ id: string }>("/api/profile/cidades-foco", {
        method: "PATCH",
        body: JSON.stringify({
          uf,
          cidades: cidadesFoco,
        }),
      });
      if (!result.ok) {
        setError(result.error);
        setSaving(false);
        return;
      }
    }

    if (step === 5) {
      if (focusSelectedCount() === 0) {
        setSaving(false);
        setError("Selecione ao menos um foco de imóveis.");
        return;
      }

      const ok = await savePatch({ ...focoImoveis });
      if (!ok) {
        setSaving(false);
        return;
      }
    }

    if (step === 6) {
      if (avatarSquareFile) {
        const ok = await uploadAvatarAndSave();
        if (!ok) {
          setSaving(false);
          return;
        }
      }
    }

    if (step === 7) {
      const phoneE164 = normalizePhone(telefone);
      if (!phoneE164 || phoneE164.length < 13) {
        setSaving(false);
        setError("Informe um telefone celular válido com DDD.");
        return;
      }

      if (!phoneVerified || smsSentTo !== phoneE164) {
        setSaving(false);
        setError("Valide o código SMS para continuar.");
        return;
      }
    }

    if (step === 8) {
      if (!selectedPlanoId) {
        setSaving(false);
        setError("Selecione um plano para concluir.");
        return;
      }

      const selectedPlano = planos.find((item) => item.id === selectedPlanoId) ?? null;
      const isPaid = Number(selectedPlano?.preco_mensal ?? 0) > 0;

      if (isPaid) {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("co_signup_plano_slug");
        }
        setSaving(false);
        await startCheckout(selectedPlanoId, checkoutPeriod);
        return;
      } else {
        const ok = await savePatch({ plano_id: selectedPlanoId });
        if (!ok) {
          setSaving(false);
          return;
        }

        if (typeof window !== "undefined") {
          window.localStorage.removeItem("co_signup_plano_slug");
        }
      }
    }

    setSaving(false);

    if (step >= TOTAL_STEPS) {
      showToast("Onboarding concluído.");
      router.push("/dashboard");
      return;
    }

    setStep((prev) => Math.min(TOTAL_STEPS, prev + 1));
    showToast("Etapa salva com sucesso.");
  }

  useEffect(() => {
    if (step !== 4) return;
    if (!uf) return;
    if (cidadeInput.trim().length < 1) {
      setCidadeOptions([]);
      setCidadeLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setCidadeLoading(true);
        const query = cidadeInput.trim();
        const params = new URLSearchParams({ uf });
        params.set("q", query);

        const result = await apiFetchWithAuth<CidadeOption[]>(
          `/api/localidades/cidades?${params.toString()}`,
          {
            signal: controller.signal,
          },
        );

        if (result.ok) {
          const selectedIds = new Set(cidadesFoco.map((item) => item.codigo_ibge));
          setCidadeOptions(result.data.filter((item) => !selectedIds.has(item.codigo_ibge)));
        } else {
          setCidadeOptions([]);
          setError(result.error);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setCidadeOptions([]);
          setError("Falha ao carregar cidades do IBGE.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setCidadeLoading(false);
        }
      }
    }, 250);

    return () => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
      clearTimeout(timeout);
    };
  }, [step, uf, cidadeInput, cidadesFoco]);

  if (loading) {
    return <main className="min-h-screen px-6 py-12">Carregando onboarding...</main>;
  }

  return (
    <main className="min-h-screen bg-[color:var(--white)] px-6 py-10 text-[color:var(--black)]">
      <div className="mx-auto w-full max-w-3xl">
        {toastMessage ? (
          <div className="fixed right-5 top-5 z-50 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-md">
            {toastMessage}
          </div>
        ) : null}
        <Image
          src="/logo.svg"
          alt="Corretor.one"
          width={180}
          height={50}
          className="h-8 w-auto"
          style={{ aspectRatio: "25 / 7" }}
          priority
        />

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--grey-olive)]">
            Onboarding do Corretor
          </p>
          <h1 className="mt-2 text-3xl font-bold">Vamos completar seu perfil</h1>
          <p className="mt-2 text-sm font-light text-[var(--blue-slate)]">
            Etapa {step} de {TOTAL_STEPS}
          </p>

          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[var(--primary-scarlet)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <form onSubmit={handleNext} className="mt-6 space-y-5">
            {step === 1 ? (
              <div className="space-y-4">
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Use o mesmo nome do seu cadastro no CRECI. Isso ajuda na verificação do perfil.
                </p>

                <div>
                  <label className="mb-1 block text-sm font-light text-[var(--blue-slate)]">Nome</label>
                  <input
                    value={primeiroNome}
                    onChange={(event) => setPrimeiroNome(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--blue-slate)]"
                    placeholder="Seu nome"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-light text-[var(--blue-slate)]">Sobrenome</label>
                  <input
                    value={sobrenome}
                    onChange={(event) => setSobrenome(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--blue-slate)]"
                    placeholder="Seu sobrenome"
                  />
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4">
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  O nickname não poderá ser alterado depois.
                </p>
                <div>
                  <label className="mb-1 block text-sm font-light text-[var(--blue-slate)]">Nickname</label>
                  <input
                    value={nickname}
                    disabled={Boolean(originalNickname)}
                    onBlur={checkNicknameAvailability}
                    onChange={(event) => {
                      setNickname(event.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""));
                      setNicknameState("idle");
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--blue-slate)] disabled:bg-slate-100"
                    placeholder="ex: aykafelix"
                  />
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <p>corretor.one/{nickname || "seu-nickname"}</p>
                  <p>{nickname || "seu-nickname"}@corretor.one</p>
                </div>

                {nicknameState === "checking" ? <p className="text-sm text-slate-500">Validando nickname...</p> : null}
                {nicknameState === "available" ? (
                  <p className="text-sm text-emerald-700">Disponível</p>
                ) : null}
                {nicknameState === "unavailable" ? (
                  <p className="text-sm text-rose-700">Indisponível</p>
                ) : null}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-2">
                <label className="mb-1 block text-sm font-light text-[var(--blue-slate)]">Gênero</label>
                <select
                  value={genero}
                  onChange={(event) =>
                    setGenero(event.target.value as "MASCULINO" | "FEMININO" | "NAO_INFORMAR" | "")
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--blue-slate)]"
                >
                  <option value="">Selecione</option>
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMININO">Feminino</option>
                  <option value="NAO_INFORMAR">Prefiro não informar</option>
                </select>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-light text-[var(--blue-slate)]">UF</label>
                  <select
                    value={uf}
                    onChange={(event) => {
                      setUf(event.target.value);
                      setCidadeInput("");
                      setCidadeOptions([]);
                      setCidadesFoco([]);
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--blue-slate)]"
                  >
                    <option value="">Selecione seu estado</option>
                    {UF_OPTIONS.map((itemUf) => (
                      <option key={itemUf} value={itemUf}>
                        {itemUf}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-light text-[var(--blue-slate)]">Cidades foco</label>
                  <div className="relative">
                    <input
                      disabled={!uf}
                      value={cidadeInput}
                      onChange={(event) => setCidadeInput(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--blue-slate)] disabled:cursor-not-allowed disabled:bg-slate-100"
                      placeholder={uf ? "Digite a cidade e selecione na lista" : "Selecione primeiro a UF"}
                    />
                    {uf && cidadeOptions.length > 0 ? (
                      <div className="absolute left-0 top-[calc(100%+4px)] z-20 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                        {cidadeOptions.map((option) => (
                          <button
                            key={option.codigo_ibge}
                            type="button"
                            onClick={() => selectCidade(option)}
                            className="block w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-slate-50"
                          >
                            {option.nome}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs font-light text-[var(--blue-slate)]">
                    Somente cidades oficiais do IBGE podem ser selecionadas.
                    {cidadeLoading ? " Carregando opções..." : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {cidadesFoco.map((cidade) => (
                      <button
                        key={cidade.codigo_ibge}
                        type="button"
                        onClick={() => removeCidade(cidade.codigo_ibge)}
                        className="cursor-pointer rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs"
                      >
                        {cidade.nome} ×
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {step === 5 ? (
              <div>
                <p className="mb-2 text-sm font-light text-[var(--blue-slate)]">
                  Selecione os segmentos em que você atua:
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  {[
                    ["imoveis_residenciais", "Imóveis residenciais"],
                    ["imoveis_comerciais", "Imóveis comerciais"],
                    ["imoveis_industriais", "Imóveis industriais"],
                    ["imoveis_alto_padrao", "Alto padrão"],
                    ["imoveis_luxo", "Luxo"],
                    ["imoveis_medio_padrao", "Médio padrão"],
                    ["imoveis_baixa_renda", "Baixa renda"],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={focoImoveis[key as keyof typeof focoImoveis]}
                        onChange={(event) =>
                          setFocoImoveis((prev) => ({
                            ...prev,
                            [key]: event.target.checked,
                          }))
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {step === 6 ? (
              <div className="space-y-4">
                {avatarUrl ? (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    Detectamos sua foto de perfil atual. Você pode manter como está ou enviar outra.
                  </p>
                ) : (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    Etapa opcional. Você pode pular e configurar depois.
                  </p>
                )}
                <div>
                  <label className="mb-1 block text-sm font-light text-[var(--blue-slate)]">
                    Avatar (opcional, recorte 1:1)
                  </label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setError(null);
                      if (avatarCropSourceUrl?.startsWith("blob:")) {
                        URL.revokeObjectURL(avatarCropSourceUrl);
                      }
                      const sourceUrl = URL.createObjectURL(file);
                      setAvatarCropSourceUrl(sourceUrl);
                      event.currentTarget.value = "";
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--blue-slate)]"
                  />
                </div>
                {avatarPreviewUrl ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="mb-2 text-xs font-light text-[var(--blue-slate)]">Recorte 1:1</p>
                      <div className="w-32 overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <Image
                          src={avatarPreviewUrl}
                          alt="Preview do avatar 1:1"
                          width={128}
                          height={128}
                          className="h-32 w-32 object-cover"
                        />
                      </div>
                    </div>
                    {avatarVerticalPreviewUrl ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="mb-2 text-xs font-light text-[var(--blue-slate)]">Recorte 4:5</p>
                        <div className="w-24 overflow-hidden rounded-lg border border-slate-200 bg-white">
                          <Image
                            src={avatarVerticalPreviewUrl}
                            alt="Preview do avatar 4:5"
                            width={96}
                            height={120}
                            className="h-[120px] w-24 object-cover"
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 7 ? (
              <div className="space-y-4">
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Esta etapa é obrigatória. Enviaremos um código por SMS para validar seu número.
                </p>
                <div>
                  <label className="mb-1 block text-sm font-light text-[var(--blue-slate)]">
                    Telefone celular (com DDD)
                  </label>
                  <input
                    value={telefone}
                    onChange={(event) => {
                      const next = formatPhoneDisplay(event.target.value);
                      setTelefone(next);
                      const normalizedNext = normalizePhone(next);
                      if (normalizedNext !== smsSentTo) {
                        setPhoneVerified(false);
                      }
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--blue-slate)]"
                    placeholder="(31) 99999-0000"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void sendSmsCode()}
                    disabled={sendingSmsCode || smsCooldownSeconds > 0}
                    className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sendingSmsCode
                      ? "Enviando..."
                      : smsCooldownSeconds > 0
                        ? `Reenviar em ${formatCountdown(smsCooldownSeconds)}`
                        : "Enviar código SMS"}
                  </button>
                  {smsSentTo ? (
                    <p className="text-xs font-light text-[var(--blue-slate)]">
                      Código enviado para {smsSentTo}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-light text-[var(--blue-slate)]">
                    Código de verificação
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      value={smsCode}
                      onChange={(event) =>
                        setSmsCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      className="w-44 rounded-lg border border-slate-300 px-3 py-2 tracking-[0.25em] outline-none focus:border-[var(--blue-slate)]"
                      placeholder="123456"
                      inputMode="numeric"
                    />
                    <button
                      type="button"
                      onClick={() => void verifySmsCode()}
                      disabled={verifyingSmsCode || !smsSentTo}
                      className="cursor-pointer rounded-lg bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {verifyingSmsCode ? "Validando..." : "Validar código"}
                    </button>
                  </div>
                </div>
                {phoneVerified ? (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    Número validado com sucesso.
                  </p>
                ) : null}
              </div>
            ) : null}

            {step === 8 ? (
              <div className="space-y-4">
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  Escolha o plano inicial. Plano grátis conclui agora. Plano pago segue para checkout Stripe.
                </p>
                <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setCheckoutPeriod("MENSAL")}
                    className={`cursor-pointer rounded-md px-3 py-1 text-sm ${
                      checkoutPeriod === "MENSAL"
                        ? "bg-[var(--primary-scarlet)] text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Mensal
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckoutPeriod("ANUAL")}
                    className={`cursor-pointer rounded-md px-3 py-1 text-sm ${
                      checkoutPeriod === "ANUAL"
                        ? "bg-[var(--primary-scarlet)] text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Anual
                  </button>
                </div>
                {checkoutPeriod === "ANUAL" ? (
                  <p className="text-xs font-semibold text-emerald-700">Economize 25% no pagamento anual.</p>
                ) : null}
                {loadingPlanos ? (
                  <p className="text-sm text-slate-500">Carregando planos...</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {planos.map((plano) => {
                      const selected = selectedPlanoId === plano.id;
                      return (
                        <button
                          key={plano.id}
                          type="button"
                          onClick={() => setSelectedPlanoId(plano.id)}
                          className={`cursor-pointer rounded-xl border p-4 text-left transition ${
                            selected
                              ? "border-[var(--primary-scarlet)] bg-rose-50"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-lg">{plano.nome}</p>
                            {checkoutPeriod === "ANUAL" && Number(plano.preco_mensal ?? 0) > 0 ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                                Economize 25%
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm font-light text-[var(--blue-slate)]">
                            {checkoutPeriod === "ANUAL" && plano.preco_anual !== null
                              ? `R$ ${Number(plano.preco_anual).toFixed(2)}/ano`
                              : `R$ ${Number(plano.preco_mensal ?? 0).toFixed(2)}/mês`}
                          </p>
                          {checkoutPeriod === "MENSAL" && Number(plano.preco_mensal ?? 0) > 0 ? (
                            <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1">
                              <p className="text-[11px] font-semibold text-emerald-700">
                                Economize 25% no anual
                              </p>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setCheckoutPeriod("ANUAL");
                                }}
                                className="mt-1 cursor-pointer text-[11px] font-semibold text-emerald-700 underline underline-offset-2"
                              >
                                Ver preço anual
                              </button>
                            </div>
                          ) : null}
                          <div className="mt-2 space-y-1 text-xs text-slate-600">
                            <p>
                              Imóveis:{" "}
                              {plano.limite_imoveis === null ? "Ilimitado" : plano.limite_imoveis}
                            </p>
                            <p>
                              E-mail:{" "}
                              {plano.limite_emails_mes === null
                                ? "Ilimitado"
                                : plano.limite_emails_mes}
                            </p>
                            <p>
                              WhatsApp:{" "}
                              {plano.limite_whatsapp_mes === null
                                ? "Ilimitado"
                                : plano.limite_whatsapp_mes}
                            </p>
                            <p>Créditos AYKA: {plano.ayka_franquia_mensal}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep((prev) => Math.max(1, prev - 1))}
                disabled={step === 1 || saving}
                className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Voltar
              </button>

              <button
                type="submit"
                disabled={saving || uploadingAvatar || startingCheckout}
                className="cursor-pointer rounded-lg bg-[var(--primary-scarlet)] px-5 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving || uploadingAvatar || startingCheckout
                  ? "Salvando..."
                  : step === TOTAL_STEPS
                    ? "Concluir / Ir para pagamento"
                    : "Salvar e continuar"}
              </button>
            </div>
          </form>

          {error ? <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        </div>
      </div>

      {avatarCropSourceUrl ? (
        <DualImageCropper
          imageSrc={avatarCropSourceUrl}
          onCancel={() => {
            if (avatarCropSourceUrl.startsWith("blob:")) {
              URL.revokeObjectURL(avatarCropSourceUrl);
            }
            setAvatarCropSourceUrl(null);
          }}
          onComplete={(squareBlob, verticalBlob) => {
            const squareFile = new File([squareBlob], `avatar-square-${Date.now()}.jpg`, {
              type: "image/jpeg",
            });
            if (avatarPreviewUrl?.startsWith("blob:")) {
              URL.revokeObjectURL(avatarPreviewUrl);
            }
            if (avatarVerticalPreviewUrl?.startsWith("blob:")) {
              URL.revokeObjectURL(avatarVerticalPreviewUrl);
            }
            if (avatarCropSourceUrl.startsWith("blob:")) {
              URL.revokeObjectURL(avatarCropSourceUrl);
            }

            setAvatarSquareFile(squareFile);
            setAvatarPreviewUrl(URL.createObjectURL(squareBlob));
            setAvatarVerticalPreviewUrl(URL.createObjectURL(verticalBlob));
            setAvatarCropSourceUrl(null);
          }}
        />
      ) : null}
    </main>
  );
}

function findFirstIncompleteStep(profile: Profile): number {
  const nomeOk = (profile.primeiro_nome?.trim().length ?? 0) >= 2 && (profile.sobrenome?.trim().length ?? 0) >= 2;
  if (!nomeOk) return 1;

  if (!profile.nickname) return 2;
  if (!profile.genero) return 3;
  if (!profile.uf || !profile.cidades_foco || profile.cidades_foco.length === 0) return 4;

  const focusCount = [
    profile.imoveis_residenciais,
    profile.imoveis_comerciais,
    profile.imoveis_industriais,
    profile.imoveis_alto_padrao,
    profile.imoveis_luxo,
    profile.imoveis_medio_padrao,
    profile.imoveis_baixa_renda,
  ].filter(Boolean).length;

  if (focusCount === 0) return 5;
  if (!profile.telefone || !profile.whatsapp_verificado_em) return 7;
  if (!profile.plano_id) return 8;

  return TOTAL_STEPS;
}
