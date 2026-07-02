"use client";

import Image from "next/image";
import {
  Camera,
  ChatCircleText,
  CheckCircle,
  Crown,
  DotsSixVertical,
  EnvelopeSimple,
  GlobeHemisphereWest,
  HouseLine,
  ImageSquare,
  InstagramLogo,
  Key,
  LinkedinLogo,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  NotePencil,
  PinterestLogo,
  Phone,
  Plus,
  SealCheck,
  ShieldCheck,
  Signature,
  Spinner,
  TextB,
  TextItalic,
  TextUnderline,
  ListBullets,
  TiktokLogo,
  Trash,
  XLogo,
  UploadSimple,
  UserCircle,
  X,
  YoutubeLogo,
} from "@phosphor-icons/react";
import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { AppShell } from "@/app/_components/app-shell";
import DualImageCropper from "@/app/_components/cropimage";
import { apiFetchWithAuth, getAccessToken } from "@/lib/client/auth-api";
import {
  evaluatePasswordPolicy,
  passwordStrengthLabel,
} from "@/lib/security/password-policy";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  email: string;
  primeiro_nome: string | null;
  sobrenome: string | null;
  telefone: string | null;
  whatsapp: string | null;
  whatsapp_verificado_em: string | null;
  frase_impacto: string | null;
  bio: string | null;
  nickname: string | null;
  avatar_url: string | null;
  imagem_capa_url: string | null;
  instagram: string | null;
  linkedin: string | null;
  pinterest: string | null;
  tiktok: string | null;
  twitter: string | null;
  youtube: string | null;
  uf: string | null;
  cidades_foco: string[] | null;
  imoveis_residenciais: boolean;
  imoveis_comerciais: boolean;
  imoveis_industriais: boolean;
  imoveis_alto_padrao: boolean;
  imoveis_luxo: boolean;
  imoveis_medio_padrao: boolean;
  imoveis_baixa_renda: boolean;
  creci_uf: string | null;
  creci_numero: string | null;
  creci_sufixo: string | null;
  creci_documento_midia_id: string | null;
  creci_aprovacao: boolean;
  plano_id: string | null;
};

type PlanoLite = {
  id: string;
  nome: string;
  slug: string;
  preco_mensal: number;
  is_paid?: boolean;
};

type EmailProfissional = {
  id: string;
  owner_id: string;
  email: string;
  status: "SOLICITADO" | "ATIVO" | "SUSPENSO" | "DESATIVADO" | "ERRO";
  usar_senha_login: boolean;
  solicitado_em: string;
  ativado_em: string | null;
  desativado_em: string | null;
  erro_detalhe?: string | null;
};

type EmailProfissionalStatusPayload = {
  profile: { id: string; nickname: string | null; plano_id: string | null };
  plano: PlanoLite | null;
  email_profissional: EmailProfissional | null;
};

type SocialProofStatus = "RASCUNHO" | "PUBLICADO" | "ARQUIVADO";
type SocialProofType =
  | "ENTREGA_CHAVES"
  | "ASSINATURA_CONTRATO"
  | "ASSINATURA_ESCRITURA"
  | "DEPOIMENTO"
  | "COMPRA_REALIZADA"
  | "VENDA_REALIZADA"
  | "LOCACAO_REALIZADA"
  | "POS_VENDA";

type SocialProof = {
  id: string;
  owner_id: string;
  midia_id: string | null;
  tipo: SocialProofType;
  titulo: string;
  descricao: string | null;
  depoimento: string | null;
  cliente_nome_publico: string | null;
  localidade: string | null;
  data_momento: string | null;
  tags: string[];
  imagem_url: string | null;
  imagem_alt: string | null;
  consentimento_imagem_confirmado: boolean;
  status: SocialProofStatus;
  ordem: number;
  destaque: boolean;
  publicado_em: string | null;
  created_at: string;
  updated_at: string;
};

type SocialProofDraft = {
  tipo: SocialProofType;
  titulo: string;
  descricao: string;
  depoimento: string;
  cliente_nome_publico: string;
  localidade: string;
  data_momento: string;
  imagem_alt: string;
  consentimento_imagem_confirmado: boolean;
  status: SocialProofStatus;
  ordem: string;
  destaque: boolean;
};

type ProfileTab = "dadosprincipais" | "contato" | "creci" | "redessociais" | "provassociais";
type CropPoint = { x: number; y: number };
type NaturalSize = { width: number; height: number };
type CidadeOption = { codigo_ibge: number; nome: string; uf: string };

type CoverCropperProps = {
  imageSrc: string;
  onCancel: () => void;
  onComplete: (blob: Blob) => void;
};

const COVER_FRAME = { width: 960, height: 300 };
const COVER_OUTPUT = { width: 1600, height: 500 };
const SOCIAL_PROOF_TYPE_OPTIONS: Array<{ value: SocialProofType; label: string }> = [
  { value: "ENTREGA_CHAVES", label: "Entrega de chaves" },
  { value: "ASSINATURA_CONTRATO", label: "Assinatura de contrato" },
  { value: "ASSINATURA_ESCRITURA", label: "Assinatura de escritura" },
  { value: "DEPOIMENTO", label: "Depoimento" },
  { value: "COMPRA_REALIZADA", label: "Compra realizada" },
  { value: "VENDA_REALIZADA", label: "Venda realizada" },
  { value: "LOCACAO_REALIZADA", label: "Locação realizada" },
  { value: "POS_VENDA", label: "Pós-venda" },
];
const SOCIAL_PROOF_STATUS_LABELS: Record<SocialProofStatus, string> = {
  RASCUNHO: "Rascunho",
  PUBLICADO: "Publicado",
  ARQUIVADO: "Arquivado",
};
const DEFAULT_PROFILE_TAB: ProfileTab = "dadosprincipais";
const PROFILE_TAB_VALUES = new Set<ProfileTab>([
  "dadosprincipais",
  "contato",
  "creci",
  "redessociais",
  "provassociais",
]);
const PROFILE_TABS: Array<{
  value: ProfileTab;
  label: string;
  description: string;
}> = [
  { value: "dadosprincipais", label: "Dados Principais", description: "identidade e atuação" },
  { value: "contato", label: "Contato e Acesso", description: "telefone, e-mail e login" },
  { value: "creci", label: "CRECI e Documentos", description: "registro e comprovante" },
  { value: "redessociais", label: "Redes Sociais", description: "canais públicos" },
  { value: "provassociais", label: "Provas Sociais", description: "depoimentos e momentos" },
];
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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getScale(natural: NaturalSize, frameWidth: number, frameHeight: number, zoom: number) {
  const base = Math.max(frameWidth / natural.width, frameHeight / natural.height);
  return base * zoom;
}

function getLimits(
  natural: NaturalSize,
  frameWidth: number,
  frameHeight: number,
  zoom: number,
): CropPoint {
  const scale = getScale(natural, frameWidth, frameHeight, zoom);
  const renderedWidth = natural.width * scale;
  const renderedHeight = natural.height * scale;
  return {
    x: Math.max(0, (renderedWidth - frameWidth) / 2),
    y: Math.max(0, (renderedHeight - frameHeight) / 2),
  };
}

async function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.src = url;
  });
}

async function buildCroppedBlob(params: {
  imageSrc: string;
  natural: NaturalSize;
  frameWidth: number;
  frameHeight: number;
  outputWidth: number;
  outputHeight: number;
  zoom: number;
  offset: CropPoint;
}): Promise<Blob> {
  const {
    imageSrc,
    natural,
    frameWidth,
    frameHeight,
    outputWidth,
    outputHeight,
    zoom,
    offset,
  } = params;
  const image = await createImage(imageSrc);
  const scale = getScale(natural, frameWidth, frameHeight, zoom);
  const renderedWidth = natural.width * scale;
  const renderedHeight = natural.height * scale;
  const left = (frameWidth - renderedWidth) / 2 + offset.x;
  const top = (frameHeight - renderedHeight) / 2 + offset.y;

  const sx = Math.max(0, (0 - left) / scale);
  const sy = Math.max(0, (0 - top) / scale);
  const sw = Math.min(natural.width - sx, frameWidth / scale);
  const sh = Math.min(natural.height - sy, frameHeight / scale);

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Falha ao preparar canvas.");

  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((value) => resolve(value), "image/jpeg", 0.95),
  );
  if (!blob) throw new Error("Falha ao gerar recorte.");
  return blob;
}

function normalizePhone(input: string) {
  const digitsRaw = input.replace(/\D/g, "");
  if (!digitsRaw) return "";
  const localDigits =
    digitsRaw.startsWith("55") && digitsRaw.length >= 12 ? digitsRaw.slice(2) : digitsRaw;
  const withCountry = `55${localDigits}`;
  return `+${withCountry}`;
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

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function CoverCropper({ imageSrc, onCancel, onComplete }: CoverCropperProps) {
  const [naturalSize, setNaturalSize] = useState<NaturalSize | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<CropPoint>({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const dragRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
  }>({
    dragging: false,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  });

  useEffect(() => {
    let active = true;
    createImage(imageSrc)
      .then((image) => {
        if (!active) return;
        setNaturalSize({ width: image.width, height: image.height });
      })
      .catch(() => {
        if (!active) return;
        setError("Não foi possível carregar a imagem.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [imageSrc]);

  const limits = useMemo(() => {
    if (!naturalSize) return { x: 0, y: 0 };
    return getLimits(naturalSize, COVER_FRAME.width, COVER_FRAME.height, zoom);
  }, [naturalSize, zoom]);

  function handleZoom(nextZoom: number) {
    if (!naturalSize) return;
    const nextLimits = getLimits(naturalSize, COVER_FRAME.width, COVER_FRAME.height, nextZoom);
    setZoom(nextZoom);
    setOffset((prev) => ({
      x: clamp(prev.x, -nextLimits.x, nextLimits.x),
      y: clamp(prev.y, -nextLimits.y, nextLimits.y),
    }));
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      dragging: true,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current.dragging) return;
    const deltaX = event.clientX - dragRef.current.startX;
    const deltaY = event.clientY - dragRef.current.startY;
    setOffset({
      x: clamp(dragRef.current.startOffsetX + deltaX, -limits.x, limits.x),
      y: clamp(dragRef.current.startOffsetY + deltaY, -limits.y, limits.y),
    });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current.dragging) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current.dragging = false;
  }

  function getImageStyle() {
    if (!naturalSize) return undefined;
    const scale = getScale(naturalSize, COVER_FRAME.width, COVER_FRAME.height, zoom);
    const width = naturalSize.width * scale;
    const height = naturalSize.height * scale;
    return {
      width,
      height,
      left: (COVER_FRAME.width - width) / 2 + offset.x,
      top: (COVER_FRAME.height - height) / 2 + offset.y,
    };
  }

  async function finalizeCrop() {
    if (!naturalSize) return;
    try {
      setError(null);
      const blob = await buildCroppedBlob({
        imageSrc,
        natural: naturalSize,
        frameWidth: COVER_FRAME.width,
        frameHeight: COVER_FRAME.height,
        outputWidth: COVER_OUTPUT.width,
        outputHeight: COVER_OUTPUT.height,
        zoom,
        offset,
      });
      onComplete(blob);
    } catch {
      setError("Não foi possível concluir o recorte da capa.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center p-4">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl md:p-6">
          <div className="mb-5">
            <h2 className="text-2xl">Ajuste sua imagem de capa</h2>
            <p className="text-sm font-light text-[var(--blue-slate)]">
              Formato 16:5. Arraste e ajuste o zoom até encontrar o enquadramento ideal.
            </p>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Carregando editor...
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {!loading && naturalSize ? (
            <div className="space-y-4">
              <div
                className="relative mx-auto w-full max-w-[960px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                style={{ aspectRatio: "16 / 5" }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                <Image
                  src={imageSrc}
                  alt="Recorte da capa"
                  width={naturalSize.width}
                  height={naturalSize.height}
                  className="pointer-events-none absolute max-w-none select-none"
                  style={getImageStyle()}
                  unoptimized
                />
              </div>
              <div className="mx-auto flex w-full max-w-[960px] items-center gap-3">
                <MagnifyingGlassMinus size={16} className="text-[var(--blue-slate)]" />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(event) => handleZoom(Number(event.target.value))}
                  className="w-full cursor-pointer accent-[var(--primary-scarlet)]"
                />
                <MagnifyingGlassPlus size={16} className="text-[var(--blue-slate)]" />
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <X size={16} />
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void finalizeCrop()}
              disabled={loading || !naturalSize}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle size={16} />
              Confirmar capa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type PhoneEditModalProps = {
  initialPhone: string;
  onClose: () => void;
  onSuccess: (phoneE164: string) => void;
};

type EmailEditModalProps = {
  currentEmail: string;
  onClose: () => void;
  onSuccess: (newEmail: string) => void;
};

function PhoneEditModal({ initialPhone, onClose, onSuccess }: PhoneEditModalProps) {
  const [phone, setPhone] = useState(formatPhoneDisplay(initialPhone));
  const [smsCode, setSmsCode] = useState("");
  const [smsSentTo, setSmsSentTo] = useState<string | null>(null);
  const [sendingSmsCode, setSendingSmsCode] = useState(false);
  const [verifyingSmsCode, setVerifyingSmsCode] = useState(false);
  const [smsCooldownSeconds, setSmsCooldownSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (smsCooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setSmsCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [smsCooldownSeconds]);

  async function sendSmsCode() {
    setError(null);
    const phoneE164 = normalizePhone(phone);
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
          data?: { phone_e164: string; retry_after_seconds?: number };
          error?: { message?: string; retry_after_seconds?: number };
        }
      | null;

    if (!response.ok || !payload?.ok || !payload.data) {
      const retryAfter = payload?.error?.retry_after_seconds ?? 0;
      if (retryAfter > 0) setSmsCooldownSeconds(retryAfter);
      setError(payload?.error?.message ?? "Falha ao enviar código SMS.");
      return;
    }

    setSmsSentTo(payload.data.phone_e164);
    setSmsCooldownSeconds(payload.data.retry_after_seconds ?? 300);
    setSmsCode("");
  }

  async function verifySmsCode() {
    setError(null);
    const phoneE164 = normalizePhone(phone);
    if (!phoneE164 || phoneE164.length < 13) {
      setError("Informe um telefone celular válido com DDD.");
      return;
    }

    if (!/^[0-9]{6}$/.test(smsCode)) {
      setError("Informe o código de 6 dígitos.");
      return;
    }

    setVerifyingSmsCode(true);
    const result = await apiFetchWithAuth<{ phone_e164: string }>("/api/auth/phone/verify-code", {
      method: "POST",
      body: JSON.stringify({
        phone: phoneE164,
        code: smsCode,
      }),
    });
    setVerifyingSmsCode(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onSuccess(result.data.phone_e164);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl">Editar telefone</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex cursor-pointer rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-50"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Para alterar o número, confirme via SMS. O campo principal só muda após validação.
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-slate-600">Novo telefone</label>
            <input
              value={phone}
              onChange={(event) => setPhone(formatPhoneDisplay(event.target.value))}
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
              <span className="text-xs text-slate-500">Código enviado para {smsSentTo}</span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              value={smsCode}
              onChange={(event) => setSmsCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-44 rounded-lg border border-slate-300 px-3 py-2 tracking-[0.22em] outline-none focus:border-[var(--blue-slate)]"
              placeholder="123456"
            />
            <button
              type="button"
              onClick={() => void verifySmsCode()}
              disabled={verifyingSmsCode || !smsSentTo}
              className="cursor-pointer rounded-lg bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {verifyingSmsCode ? "Validando..." : "Confirmar número"}
            </button>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function EmailEditModal({ currentEmail, onClose, onSuccess }: EmailEditModalProps) {
  const [email, setEmail] = useState(currentEmail);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEmailUpdate() {
    setError(null);
    const normalized = email.trim().toLowerCase();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError("Informe um e-mail válido.");
      return;
    }

    if (normalized === currentEmail.trim().toLowerCase()) {
      setError("Informe um e-mail diferente do atual.");
      return;
    }

    setSending(true);
    const { error: updateError } = await supabase.auth.updateUser({ email: normalized });
    setSending(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onSuccess(normalized);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl">Alterar e-mail de acesso</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex cursor-pointer rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-50"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          O Supabase enviará confirmação para o novo e-mail. A troca só é concluída após validação.
        </p>

        <div>
          <label className="mb-1 block text-sm text-slate-600">Novo e-mail</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--blue-slate)]"
            placeholder="voce@dominio.com"
          />
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleEmailUpdate()}
            disabled={sending}
            className="cursor-pointer rounded-lg bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? "Enviando..." : "Enviar confirmação"}
          </button>
        </div>
      </div>
    </div>
  );
}

function buildSocialProofDraft(item?: SocialProof | null): SocialProofDraft {
  return {
    tipo: item?.tipo ?? "ENTREGA_CHAVES",
    titulo: item?.titulo ?? "",
    descricao: item?.descricao ?? "",
    depoimento: item?.depoimento ?? "",
    cliente_nome_publico: item?.cliente_nome_publico ?? "",
    localidade: item?.localidade ?? "",
    data_momento: item?.data_momento ?? "",
    imagem_alt: item?.imagem_alt ?? "",
    consentimento_imagem_confirmado: item?.consentimento_imagem_confirmado ?? false,
    status: item?.status ?? "RASCUNHO",
    ordem: String(item?.ordem ?? 0),
    destaque: item?.destaque ?? false,
  };
}

function getSocialProofTitlePlaceholder(type: SocialProofType) {
  if (type === "DEPOIMENTO") return "Ex.: Depoimento após a compra do primeiro imóvel";
  if (type === "ASSINATURA_CONTRATO") return "Ex.: Contrato assinado com segurança";
  if (type === "ASSINATURA_ESCRITURA") return "Ex.: Escritura concluída no cartório";
  if (type === "VENDA_REALIZADA") return "Ex.: Venda concluída no melhor timing";
  if (type === "LOCACAO_REALIZADA") return "Ex.: Locação fechada para mudança imediata";
  if (type === "COMPRA_REALIZADA") return "Ex.: Primeiro imóvel comprado";
  if (type === "POS_VENDA") return "Ex.: Atendimento que continuou depois da entrega";
  return "Ex.: Chaves entregues no Vila Mariana";
}

function getSocialProofDescriptionLabel(type: SocialProofType) {
  if (type === "DEPOIMENTO" || type === "POS_VENDA") return "Contexto do depoimento";
  if (type === "ASSINATURA_CONTRATO") return "Contexto da negociação";
  if (type === "ASSINATURA_ESCRITURA") return "Contexto da escritura";
  return "Contexto do momento";
}

function isSocialProofTestimonial(type: SocialProofType) {
  return type === "DEPOIMENTO" || type === "POS_VENDA";
}

function normalizeProfileTab(value: string | null): ProfileTab {
  const normalized = (value ?? "").trim().toLowerCase();
  return PROFILE_TAB_VALUES.has(normalized as ProfileTab) ? (normalized as ProfileTab) : DEFAULT_PROFILE_TAB;
}

function getSocialProofTypeIcon(type: SocialProofType) {
  if (type === "ENTREGA_CHAVES") return <Key size={18} weight="fill" />;
  if (type === "ASSINATURA_CONTRATO" || type === "ASSINATURA_ESCRITURA") return <Signature size={18} />;
  if (type === "DEPOIMENTO") return <ChatCircleText size={18} />;
  if (type === "POS_VENDA") return <SealCheck size={18} />;
  return <HouseLine size={18} />;
}

function formatSocialProofMomentDate(value: string) {
  if (!value) return null;
  const [year, month] = value.split("-");
  if (!year || !month) return null;

  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function SocialProofPublicPreview({
  draft,
  previewUrl,
}: {
  draft: SocialProofDraft;
  previewUrl: string | null;
}) {
  const typeLabel = SOCIAL_PROOF_TYPE_OPTIONS.find((option) => option.value === draft.tipo)?.label ?? draft.tipo;
  const isTestimonial = isSocialProofTestimonial(draft.tipo);
  const bodyText = isTestimonial && draft.depoimento.trim() ? draft.depoimento.trim() : draft.descricao.trim();
  const dateLabel = formatSocialProofMomentDate(draft.data_momento);
  const meta = [draft.cliente_nome_publico.trim(), draft.localidade.trim(), dateLabel].filter(Boolean).join(" - ");

  return (
    <div className="rounded-xl bg-slate-950 p-4 text-white">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary-scarlet)]">Prévia pública</p>
      <div className="mt-3 overflow-hidden rounded-lg border border-white/12 bg-white text-slate-950 shadow-sm">
        <div className="relative aspect-[4/3] bg-slate-100">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={draft.imagem_alt.trim() || draft.titulo.trim() || "Imagem da prova social"}
              fill
              sizes="(min-width: 768px) 360px, 100vw"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[var(--blue-slate)]">
              <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-white shadow-sm">
                {getSocialProofTypeIcon(draft.tipo)}
              </span>
            </div>
          )}
          <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-sm">
            <span className="text-[var(--primary-scarlet)]">{getSocialProofTypeIcon(draft.tipo)}</span>
            {typeLabel}
          </span>
        </div>

        <div className="p-5">
          <h3 className="text-xl font-bold leading-tight text-slate-950">
            {draft.titulo.trim() || "Título da prova social"}
          </h3>
          {bodyText ? <p className="mt-3 line-clamp-4 font-light leading-7 text-slate-600">{bodyText}</p> : null}
          {meta ? <p className="mt-4 text-sm font-bold text-slate-700">{meta}</p> : null}
        </div>
      </div>
    </div>
  );
}

function SocialProofModal({
  item,
  onClose,
  onSave,
  saving,
  error,
}: {
  item: SocialProof | null;
  onClose: () => void;
  onSave: (draft: SocialProofDraft, imageFile: File | null) => void;
  saving: boolean;
  error: string | null;
}) {
  const [draft, setDraft] = useState<SocialProofDraft>(() => buildSocialProofDraft(item));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(item?.imagem_url ?? null);
  const [step, setStep] = useState(0);
  const isTestimonial = isSocialProofTestimonial(draft.tipo);
  const hasImage = Boolean(previewUrl);
  const steps = ["Tipo", "História", "Imagem", "Publicação"];

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function updateDraft<K extends keyof SocialProofDraft>(key: K, value: SocialProofDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleImageChange(file: File | null) {
    setImageFile(file);
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : item?.imagem_url ?? null);
  }

  function goNext() {
    if (step === 0 && !draft.titulo.trim()) return;
    setStep((current) => Math.min(steps.length - 1, current + 1));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl">{item ? "Editar prova social" : "Nova prova social"}</h2>
              <p className="text-sm text-slate-600">Construa o card público em poucos passos.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex cursor-pointer rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-50"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2">
            {steps.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(index)}
                className={[
                  "rounded-lg border px-2 py-2 text-center text-xs transition",
                  index === step
                    ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                    : index < step
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-500",
                ].join(" ")}
              >
                <span className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-current/10 text-[11px] font-semibold">
                  {index + 1}
                </span>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          {step === 0 ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-xl">Que tipo de prova social é esta?</h3>
                <p className="mt-1 text-sm text-slate-600">
                  O tipo define quais campos aparecem nos próximos passos.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {SOCIAL_PROOF_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateDraft("tipo", option.value)}
                    className={[
                      "cursor-pointer rounded-xl border p-3 text-left transition",
                      draft.tipo === option.value
                        ? "border-[var(--primary-scarlet)] bg-rose-50 text-slate-950"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {isSocialProofTestimonial(option.value)
                        ? "Foco no texto do cliente e relacionamento."
                        : "Foco em um marco visual da jornada."}
                    </span>
                  </button>
                ))}
              </div>

              <label className="block text-sm">
                <span className="mb-1 flex items-center justify-between gap-3 text-slate-500">
                  <span>Título público</span>
                  <span className="text-xs tabular-nums text-slate-400">{draft.titulo.length}/120</span>
                </span>
                <input
                  value={draft.titulo}
                  onChange={(event) => updateDraft("titulo", event.target.value.slice(0, 120))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none"
                  placeholder={getSocialProofTitlePlaceholder(draft.tipo)}
                />
              </label>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-xl">Conte a história essencial</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Use nomes públicos curtos, iniciais ou uma descrição sem expor dados sensíveis.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-500">Cliente público</span>
                  <input
                    value={draft.cliente_nome_publico}
                    onChange={(event) => updateDraft("cliente_nome_publico", event.target.value.slice(0, 80))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none"
                    placeholder={isTestimonial ? "Ex.: Mariana S." : "Ex.: Família M."}
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-slate-500">Localidade</span>
                  <input
                    value={draft.localidade}
                    onChange={(event) => updateDraft("localidade", event.target.value.slice(0, 120))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none"
                    placeholder="Ex.: São Paulo/SP"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-slate-500">Data do momento</span>
                  <input
                    type="date"
                    value={draft.data_momento}
                    onChange={(event) => updateDraft("data_momento", event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none"
                  />
                </label>
              </div>

              <label className="block text-sm">
                <span className="mb-1 flex items-center justify-between gap-3 text-slate-500">
                  <span>{getSocialProofDescriptionLabel(draft.tipo)}</span>
                  <span className="text-xs tabular-nums text-slate-400">{draft.descricao.length}/260</span>
                </span>
                <textarea
                  value={draft.descricao}
                  onChange={(event) => updateDraft("descricao", event.target.value.slice(0, 260))}
                  className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none"
                  placeholder="Uma frase curta com o contexto e o resultado desse atendimento."
                />
              </label>

              {isTestimonial ? (
                <label className="block text-sm">
                  <span className="mb-1 flex items-center justify-between gap-3 text-slate-500">
                    <span>Depoimento do cliente</span>
                    <span className="text-xs tabular-nums text-slate-400">{draft.depoimento.length}/520</span>
                  </span>
                  <textarea
                    value={draft.depoimento}
                    onChange={(event) => updateDraft("depoimento", event.target.value.slice(0, 520))}
                    className="min-h-32 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none"
                    placeholder="Texto do cliente sobre o atendimento, compra, venda ou pós-venda."
                  />
                </label>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-3">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  {previewUrl ? (
                    <Image src={previewUrl} alt="Imagem da prova social" fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      <ImageSquare size={42} />
                    </div>
                  )}
                </div>
                <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <UploadSimple size={16} />
                  {previewUrl ? "Trocar imagem" : "Selecionar imagem"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      handleImageChange(event.target.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl">Imagem do momento</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    A imagem é opcional. Quando usada, ela aparece sem marca d&apos;água no perfil público.
                  </p>
                </div>

                {hasImage ? (
                  <>
                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-500">Texto alternativo da imagem</span>
                      <input
                        value={draft.imagem_alt}
                        onChange={(event) => updateDraft("imagem_alt", event.target.value.slice(0, 180))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none"
                        placeholder="Ex.: Cliente recebendo as chaves do imóvel"
                      />
                    </label>

                    <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={draft.consentimento_imagem_confirmado}
                        onChange={(event) => updateDraft("consentimento_imagem_confirmado", event.target.checked)}
                        className="mt-1"
                      />
                      <span>Confirmo que tenho autorização para publicar esta imagem no perfil público.</span>
                    </label>
                  </>
                ) : (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    Sem imagem, o card usará um ícone do tipo escolhido.
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-xl">Publicação e organização</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Status publicado exibe no perfil público. Destaque só prioriza o card dentro da seção.
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)]">
                <SocialProofPublicPreview draft={draft} previewUrl={previewUrl} />

                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-500">Status</span>
                      <select
                        value={draft.status}
                        onChange={(event) => updateDraft("status", event.target.value as SocialProofStatus)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none"
                      >
                        {Object.entries(SOCIAL_PROOF_STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <span className="mt-1 block text-xs text-slate-500">
                        Apenas publicado aparece no perfil público.
                      </span>
                    </label>

                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-500">Ordem</span>
                      <input
                        type="number"
                        value={draft.ordem}
                        onChange={(event) => updateDraft("ordem", event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none"
                      />
                      <span className="mt-1 block text-xs text-slate-500">Números menores aparecem primeiro.</span>
                    </label>
                  </div>

                  <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.destaque}
                      onChange={(event) => updateDraft("destaque", event.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block font-semibold text-slate-800">Destacar no perfil</span>
                      <span className="mt-1 block text-xs text-slate-500">
                        Dá prioridade para este card entre os publicados, sem substituir o status.
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-4">
          <div>
            <p className="text-sm text-slate-500">
              Etapa {step + 1} de {steps.length}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Voltar
              </button>
            ) : null}
            {step < steps.length - 1 ? (
              <button
                type="button"
                disabled={step === 0 && !draft.titulo.trim()}
                onClick={goNext}
                className="cursor-pointer rounded-lg bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continuar
              </button>
            ) : (
              <button
                type="button"
                disabled={saving || (hasImage && !draft.consentimento_imagem_confirmado)}
                onClick={() => onSave(draft, imageFile)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Spinner size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Salvar prova social
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PerfilPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);

  const [primeiroNome, setPrimeiroNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [fraseImpacto, setFraseImpacto] = useState("");
  const [bio, setBio] = useState("");
  const bioEditorRef = useRef<HTMLDivElement | null>(null);
  const [instagram, setInstagram] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [pinterest, setPinterest] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [twitter, setTwitter] = useState("");
  const [youtube, setYoutube] = useState("");
  const [uf, setUf] = useState("");
  const [cidadesFoco, setCidadesFoco] = useState<CidadeOption[]>([]);
  const [cidadeInput, setCidadeInput] = useState("");
  const [cidadeOptions, setCidadeOptions] = useState<CidadeOption[]>([]);
  const [cidadeLoading, setCidadeLoading] = useState(false);
  const [focoImoveis, setFocoImoveis] = useState({
    imoveis_residenciais: true,
    imoveis_comerciais: false,
    imoveis_industriais: false,
    imoveis_alto_padrao: false,
    imoveis_luxo: false,
    imoveis_medio_padrao: false,
    imoveis_baixa_renda: false,
  });

  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [avatarUploadFile, setAvatarUploadFile] = useState<File | null>(null);
  const [coverUploadFile, setCoverUploadFile] = useState<File | null>(null);

  const [avatarCropSourceUrl, setAvatarCropSourceUrl] = useState<string | null>(null);
  const [coverCropSourceUrl, setCoverCropSourceUrl] = useState<string | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [uploadingCreciDoc, setUploadingCreciDoc] = useState(false);
  const [pendingEmailChange, setPendingEmailChange] = useState<string | null>(null);
  const [emailProfStatusLoading, setEmailProfStatusLoading] = useState(false);
  const [emailProfStatus, setEmailProfStatus] = useState<EmailProfissionalStatusPayload | null>(null);
  const [requestingEmailProf, setRequestingEmailProf] = useState(false);
  const [showEmailProfPasswordModal, setShowEmailProfPasswordModal] = useState(false);
  const [emailProfPassword, setEmailProfPassword] = useState("");
  const [emailProfConfirmPassword, setEmailProfConfirmPassword] = useState("");
  const [emailProfPasswordError, setEmailProfPasswordError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradePlanos, setUpgradePlanos] = useState<PlanoLite[]>([]);
  const [loadingUpgradePlanos, setLoadingUpgradePlanos] = useState(false);
  const [startingCheckoutPlanId, setStartingCheckoutPlanId] = useState<string | null>(null);
  const [openingBillingPortal, setOpeningBillingPortal] = useState(false);
  const [socialProofs, setSocialProofs] = useState<SocialProof[]>([]);
  const [loadingSocialProofs, setLoadingSocialProofs] = useState(false);
  const [savingSocialProof, setSavingSocialProof] = useState(false);
  const [editingSocialProof, setEditingSocialProof] = useState<SocialProof | null>(null);
  const [showSocialProofModal, setShowSocialProofModal] = useState(false);
  const [socialProofModalError, setSocialProofModalError] = useState<string | null>(null);
  const [deletingSocialProofId, setDeletingSocialProofId] = useState<string | null>(null);
  const [deleteSocialProofTarget, setDeleteSocialProofTarget] = useState<SocialProof | null>(null);
  const [dropTargetSocialProofId, setDropTargetSocialProofId] = useState<string | null>(null);
  const [reorderingSocialProofs, setReorderingSocialProofs] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileTab>(DEFAULT_PROFILE_TAB);

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadSocialProofs() {
    setLoadingSocialProofs(true);
    const result = await apiFetchWithAuth<SocialProof[]>("/api/profile/provas-sociais");
    if (result.ok) {
      setSocialProofs(result.data);
    } else {
      setError(result.error);
    }
    setLoadingSocialProofs(false);
  }

  useEffect(() => {
    async function loadProfile() {
      const result = await apiFetchWithAuth<Profile>("/api/profile");
      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }

      const data = result.data;
      setProfile(data);
      setPrimeiroNome(data.primeiro_nome ?? "");
      setSobrenome(data.sobrenome ?? "");
      setTelefone(data.telefone ?? "");
      setWhatsapp(data.whatsapp ?? "");
      setFraseImpacto(data.frase_impacto ?? "");
      setBio(data.bio ?? "");
      setUf(data.uf ?? "");
      setCidadesFoco(
        (data.cidades_foco ?? []).map((nome, index) => ({
          codigo_ibge: -(index + 1),
          nome,
          uf: data.uf ?? "",
        })),
      );
      setInstagram(data.instagram ?? "");
      setLinkedin(data.linkedin ?? "");
      setPinterest(data.pinterest ?? "");
      setTiktok(data.tiktok ?? "");
      setTwitter(data.twitter ?? "");
      setYoutube(data.youtube ?? "");
      setFocoImoveis({
        imoveis_residenciais: data.imoveis_residenciais,
        imoveis_comerciais: data.imoveis_comerciais,
        imoveis_industriais: data.imoveis_industriais,
        imoveis_alto_padrao: data.imoveis_alto_padrao,
        imoveis_luxo: data.imoveis_luxo,
        imoveis_medio_padrao: data.imoveis_medio_padrao,
        imoveis_baixa_renda: data.imoveis_baixa_renda,
      });
      setAvatarPreviewUrl(data.avatar_url);
      setCoverPreviewUrl(data.imagem_capa_url);
      setLoading(false);
    }

    void loadProfile();
  }, []);

  useEffect(() => {
    if (!loading) void loadSocialProofs();
  }, [loading]);

  useEffect(() => {
    function syncTabFromUrl() {
      const params = new URLSearchParams(window.location.search);
      setActiveProfileTab(normalizeProfileTab(params.get("aba")));
    }

    syncTabFromUrl();
    window.addEventListener("popstate", syncTabFromUrl);
    return () => window.removeEventListener("popstate", syncTabFromUrl);
  }, []);

  useEffect(() => {
    if (!bioEditorRef.current) return;
    if (bioEditorRef.current.innerHTML !== (bio || "")) {
      bioEditorRef.current.innerHTML = bio || "";
    }
  }, [bio]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      [avatarCropSourceUrl, coverCropSourceUrl, avatarPreviewUrl, coverPreviewUrl].forEach((url) => {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, [avatarCropSourceUrl, coverCropSourceUrl, avatarPreviewUrl, coverPreviewUrl]);

  useEffect(() => {
    if (!uf || cidadeInput.trim().length < 1) {
      setCidadeOptions([]);
      setCidadeLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setCidadeLoading(true);
        const params = new URLSearchParams({ uf, q: cidadeInput.trim() });
        const result = await apiFetchWithAuth<CidadeOption[]>(
          `/api/localidades/cidades?${params.toString()}`,
          { signal: controller.signal },
        );
        if (!result.ok) {
          setCidadeOptions([]);
          setError(result.error);
          return;
        }
        const selectedNames = new Set(cidadesFoco.map((item) => item.nome.toLowerCase()));
        setCidadeOptions(
          result.data.filter((item) => !selectedNames.has(item.nome.toLowerCase())),
        );
      } catch (requestError) {
        if (!(requestError instanceof DOMException && requestError.name === "AbortError")) {
          setError("Falha ao carregar cidades.");
        }
      } finally {
        if (!controller.signal.aborted) setCidadeLoading(false);
      }
    }, 250);

    return () => {
      if (!controller.signal.aborted) controller.abort();
      clearTimeout(timeout);
    };
  }, [uf, cidadeInput, cidadesFoco]);

  useEffect(() => {
    async function loadEmailProfStatus() {
      setEmailProfStatusLoading(true);
      const result = await apiFetchWithAuth<EmailProfissionalStatusPayload>(
        "/api/email-profissional/status",
      );
      if (result.ok) {
        setEmailProfStatus(result.data);
      }
      setEmailProfStatusLoading(false);
    }
    if (!loading) void loadEmailProfStatus();
  }, [loading]);

  function showToast(message: string) {
    setToast(message);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  }

  function selectProfileTab(tab: ProfileTab) {
    setActiveProfileTab(tab);
    const url = new URL(window.location.href);
    if (tab === DEFAULT_PROFILE_TAB) {
      url.searchParams.delete("aba");
    } else {
      url.searchParams.set("aba", tab);
    }
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  async function loadUpgradePlanos() {
    if (upgradePlanos.length > 0 || loadingUpgradePlanos) return;
    setLoadingUpgradePlanos(true);
    const result = await apiFetchWithAuth<PlanoLite[]>("/api/planos");
    if (result.ok) {
      setUpgradePlanos(result.data.filter((item) => (item.preco_mensal ?? 0) > 0));
    }
    setLoadingUpgradePlanos(false);
  }

  async function requestEmailProfissional() {
    if (!emailProfPasswordPolicy.isValid) {
      setEmailProfPasswordError(
        "Senha inválida. Use no mínimo 8 caracteres, 1 letra maiúscula e 1 número.",
      );
      return;
    }
    if (emailProfPassword !== emailProfConfirmPassword) {
      setEmailProfPasswordError("A confirmação de senha não confere.");
      return;
    }

    setEmailProfPasswordError(null);
    setRequestingEmailProf(true);
    setError(null);
    const result = await apiFetchWithAuth<EmailProfissional>("/api/email-profissional/solicitar", {
      method: "POST",
      body: JSON.stringify({ password: emailProfPassword }),
    });
    setRequestingEmailProf(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setEmailProfStatus((prev) =>
      prev
        ? {
            ...prev,
            email_profissional: result.data,
          }
        : prev,
    );
    setShowEmailProfPasswordModal(false);
    setEmailProfPassword("");
    setEmailProfConfirmPassword("");
    setEmailProfPasswordError(null);
    showToast("Solicitação enviada. O e-mail será ativado em breve.");
  }

  async function startCheckout(planoId: string, periodicidade: "MENSAL" | "ANUAL" = "MENSAL") {
    setError(null);
    setStartingCheckoutPlanId(planoId);
    const result = await apiFetchWithAuth<{ url: string }>("/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({
        plano_id: planoId,
        periodicidade,
      }),
    });
    setStartingCheckoutPlanId(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (typeof window !== "undefined") {
      window.location.href = result.data.url;
    }
  }

  async function openBillingPortal() {
    setOpeningBillingPortal(true);
    setError(null);
    const result = await apiFetchWithAuth<{ url: string }>("/api/billing/portal", {
      method: "POST",
    });
    setOpeningBillingPortal(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (typeof window !== "undefined") {
      window.location.href = result.data.url;
    }
  }

  function applyBioCommand(command: "bold" | "italic" | "underline" | "insertUnorderedList") {
    if (!bioEditorRef.current) return;
    bioEditorRef.current.focus();
    document.execCommand(command);
    if (command === "insertUnorderedList") {
      bioEditorRef.current.querySelectorAll("ul").forEach((element) => {
        const ul = element as HTMLUListElement;
        ul.style.listStyleType = "disc";
        ul.style.paddingLeft = "1.25rem";
        ul.style.margin = "0.25rem 0";
      });
      bioEditorRef.current.querySelectorAll("li").forEach((element) => {
        const li = element as HTMLLIElement;
        li.style.margin = "0.125rem 0";
      });
    }
    setBio(bioEditorRef.current.innerHTML);
  }

  function selectCidade(cidade: CidadeOption) {
    const exists = cidadesFoco.some(
      (item) => item.codigo_ibge === cidade.codigo_ibge || item.nome === cidade.nome,
    );
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

  async function uploadMediaFile(
    file: File,
    grupo: string,
    titulo: string,
    refTipo: string | null = "OUTRO",
    refId?: string,
    options?: { skipOptimization?: boolean },
  ) {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    const form = new FormData();
    form.append("file", file);
    if (refTipo) form.append("ref_tipo", refTipo);
    if (refId) form.append("ref_id", refId);
    form.append("grupo", grupo);
    form.append("titulo", titulo);
    if (options?.skipOptimization) form.append("skip_optimization", "true");

    const response = await fetch("/api/midia/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    });

    const payload = (await response.json().catch(() => null)) as
      | { ok: boolean; data?: { id: string; url: string }; error?: { message?: string } }
      | null;

    if (!response.ok || !payload?.ok || !payload.data?.url || !payload.data.id) {
      throw new Error(payload?.error?.message ?? "Falha no upload da imagem.");
    }

    return payload.data;
  }

  function buildSocialProofPayload(draft: SocialProofDraft, statusOverride?: SocialProofStatus) {
    return {
      tipo: draft.tipo,
      titulo: draft.titulo.trim(),
      descricao: draft.descricao.trim() || null,
      depoimento: draft.depoimento.trim() || null,
      cliente_nome_publico: draft.cliente_nome_publico.trim() || null,
      localidade: draft.localidade.trim() || null,
      data_momento: draft.data_momento || null,
      tags: [],
      imagem_alt: draft.imagem_alt.trim() || null,
      consentimento_imagem_confirmado: draft.consentimento_imagem_confirmado,
      status: statusOverride ?? draft.status,
      ordem: Number.isFinite(Number(draft.ordem)) ? Number(draft.ordem) : 0,
      destaque: draft.destaque,
    };
  }

  async function saveSocialProof(draft: SocialProofDraft, imageFile: File | null) {
    setError(null);
    setSocialProofModalError(null);

    if (!draft.titulo.trim()) {
      setSocialProofModalError("Informe um título para a prova social.");
      return;
    }

    if ((imageFile || editingSocialProof?.imagem_url) && !draft.consentimento_imagem_confirmado) {
      setSocialProofModalError("Confirme a autorização de uso da imagem antes de salvar.");
      return;
    }

    setSavingSocialProof(true);

    try {
      const requestedStatus = draft.status;
      const endpoint = editingSocialProof
        ? `/api/profile/provas-sociais/${editingSocialProof.id}`
        : "/api/profile/provas-sociais";
      const basePayload = buildSocialProofPayload(draft, imageFile ? "RASCUNHO" : requestedStatus);

      const firstResult = await apiFetchWithAuth<SocialProof>(endpoint, {
        method: editingSocialProof ? "PATCH" : "POST",
        body: JSON.stringify(basePayload),
      });

      if (!firstResult.ok) {
        throw new Error(firstResult.error);
      }

      let savedItem = firstResult.data;

      if (imageFile) {
        const uploadedImage = await uploadMediaFile(
          imageFile,
          "prova_social",
          draft.titulo.trim() || "Prova social",
          "PROVA_SOCIAL",
          savedItem.id,
          { skipOptimization: true },
        );

        const imagePatchResult = await apiFetchWithAuth<SocialProof>(
          `/api/profile/provas-sociais/${savedItem.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              imagem_url: uploadedImage.url,
              midia_id: uploadedImage.id,
              imagem_alt: draft.imagem_alt.trim() || draft.titulo.trim(),
              consentimento_imagem_confirmado: draft.consentimento_imagem_confirmado,
              status: requestedStatus,
            }),
          },
        );

        if (!imagePatchResult.ok) {
          throw new Error(imagePatchResult.error);
        }

        savedItem = imagePatchResult.data;
      }

      setSocialProofs((current) => {
        const exists = current.some((item) => item.id === savedItem.id);
        const next = exists
          ? current.map((item) => (item.id === savedItem.id ? savedItem : item))
          : [savedItem, ...current];
        return next.sort((a, b) => a.ordem - b.ordem || b.created_at.localeCompare(a.created_at));
      });
      setShowSocialProofModal(false);
      setEditingSocialProof(null);
      showToast("Prova social salva com sucesso.");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Não foi possível salvar a prova social.";
      setSocialProofModalError(message);
      setError(message);
    } finally {
      setSavingSocialProof(false);
    }
  }

  async function deleteSocialProof(id: string) {
    setDeletingSocialProofId(id);
    setError(null);
    const result = await apiFetchWithAuth<{ id: string }>(`/api/profile/provas-sociais/${id}`, {
      method: "DELETE",
    });
    setDeletingSocialProofId(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSocialProofs((current) => current.filter((item) => item.id !== id));
    setDeleteSocialProofTarget(null);
    showToast("Prova social removida.");
  }

  async function persistSocialProofOrder(nextItems: SocialProof[], previousItems: SocialProof[]) {
    setReorderingSocialProofs(true);
    setError(null);

    try {
      const results = await Promise.all(
        nextItems.map((item, index) =>
          apiFetchWithAuth<SocialProof>(`/api/profile/provas-sociais/${item.id}`, {
            method: "PATCH",
            body: JSON.stringify({ ordem: index }),
          }),
        ),
      );

      const failed = results.find((result) => !result.ok);
      if (failed && !failed.ok) {
        throw new Error(failed.error);
      }
    } catch (reorderError) {
      setSocialProofs(previousItems);
      setError(reorderError instanceof Error ? reorderError.message : "Não foi possível reordenar provas sociais.");
    } finally {
      setReorderingSocialProofs(false);
    }
  }

  function moveSocialProofToTarget(dragId: string, targetId: string) {
    if (!dragId || dragId === targetId || reorderingSocialProofs) return;

    setSocialProofs((current) => {
      const fromIndex = current.findIndex((item) => item.id === dragId);
      const toIndex = current.findIndex((item) => item.id === targetId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return current;

      const previousItems = current;
      const nextItems = [...current];
      const [movedItem] = nextItems.splice(fromIndex, 1);
      nextItems.splice(toIndex, 0, movedItem);
      const normalizedItems = nextItems.map((item, index) => ({ ...item, ordem: index }));
      void persistSocialProofOrder(normalizedItems, previousItems);
      return normalizedItems;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      let avatarUrlToSave = profile?.avatar_url ?? null;
      let capaUrlToSave = profile?.imagem_capa_url ?? null;

      if (avatarUploadFile || coverUploadFile) {
        setUploading(true);
      }

      if (avatarUploadFile) {
        avatarUrlToSave = (await uploadMediaFile(avatarUploadFile, "avatar_profile", "Avatar do perfil")).url;
      }

      if (coverUploadFile) {
        capaUrlToSave = (await uploadMediaFile(coverUploadFile, "cover_profile", "Capa do perfil")).url;
      }

      if (!uf || cidadesFoco.length === 0) {
        setError("Selecione UF e pelo menos uma cidade foco.");
        return;
      }

      const unresolvedCity = cidadesFoco.some((item) => item.codigo_ibge <= 0);
      if (unresolvedCity) {
        setError("Remova e selecione novamente cidades antigas para padronizar pelo IBGE.");
        return;
      }

      const cidadesResult = await apiFetchWithAuth<{ id: string }>("/api/profile/cidades-foco", {
        method: "PATCH",
        body: JSON.stringify({
          uf,
          cidades: cidadesFoco,
        }),
      });
      if (!cidadesResult.ok) {
        setError(cidadesResult.error);
        return;
      }

      const patch = {
        primeiro_nome: primeiroNome.trim(),
        sobrenome: sobrenome.trim() || null,
        frase_impacto: fraseImpacto.trim() || null,
        bio: bio.trim() || null,
        instagram: instagram.trim() || null,
        linkedin: linkedin.trim() || null,
        pinterest: pinterest.trim() || null,
        tiktok: tiktok.trim() || null,
        twitter: twitter.trim() || null,
        youtube: youtube.trim() || null,
        ...focoImoveis,
        avatar_url: avatarUrlToSave,
        imagem_capa_url: capaUrlToSave,
      };

      const result = await apiFetchWithAuth<{ id: string }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              ...patch,
              uf,
              cidades_foco: cidadesFoco.map((item) => item.nome),
            }
          : prev,
      );
      setAvatarUploadFile(null);
      setCoverUploadFile(null);
      showToast("Perfil atualizado com sucesso.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Não foi possível salvar.");
    } finally {
      setUploading(false);
      setSaving(false);
    }
  }

  async function handleUploadCreciDoc(file: File) {
    setError(null);
    setUploadingCreciDoc(true);
    try {
      const uploaded = await uploadMediaFile(file, "creci_documento", "Comprovante CRECI");
      const patchResult = await apiFetchWithAuth<{ id: string }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          creci_documento_midia_id: uploaded.id,
        }),
      });

      if (!patchResult.ok) {
        setError(patchResult.error);
        return;
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              creci_documento_midia_id: uploaded.id,
              creci_aprovacao: false,
            }
          : prev,
      );
      showToast("Comprovante enviado. Aguardando aprovação.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Falha no envio do comprovante.",
      );
    } finally {
      setUploadingCreciDoc(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Meu Perfil" subtitle="Carregando seus dados...">
        <div className="flex min-h-[260px] items-center justify-center text-slate-500">
          <Spinner size={24} className="mr-2 animate-spin" />
          Carregando perfil...
        </div>
      </AppShell>
    );
  }

  const displayName = `${primeiroNome} ${sobrenome}`.trim() || "Seu nome";
  const hasPendingUploads = Boolean(avatarUploadFile || coverUploadFile);
  const creciCode =
    profile?.creci_uf && profile?.creci_numero
      ? `${profile.creci_uf} ${profile.creci_numero}-${profile.creci_sufixo ?? "F"}`
      : "Não informado";
  const planoAtual = emailProfStatus?.plano ?? null;
  const isPaidPlan = Boolean(planoAtual && (planoAtual.is_paid ?? (planoAtual.preco_mensal ?? 0) > 0));
  const emailProfissional = emailProfStatus?.email_profissional ?? null;
  const emailProfAtivo = emailProfissional?.status === "ATIVO";
  const emailProfPasswordPolicy = evaluatePasswordPolicy(emailProfPassword);

  return (
    <AppShell title="Meu Perfil" subtitle="Gerencie presença, identidade visual e dados públicos.">
      <div className="space-y-5">
        {toast ? (
          <div className="fixed right-5 top-5 z-50 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-md">
            {toast}
          </div>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}

        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div
            className="relative w-full border-b border-slate-200 bg-slate-100"
            style={{ aspectRatio: "16 / 5" }}
          >
            {coverPreviewUrl ? (
              <Image
                src={coverPreviewUrl}
                alt="Imagem de capa"
                fill
                className="object-cover"
                sizes="(max-width: 1280px) 100vw, 1200px"
              />
            ) : (
              <div className="absolute inset-0 bg-[linear-gradient(115deg,var(--blue-slate),#8da2b6_42%,#cfd8e2)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />
            <div className="pointer-events-none absolute bottom-0 right-5 left-[9.75rem] pb-3 pt-12">
              <h1
                className="text-3xl leading-tight text-white"
                style={{ textShadow: "0 2px 16px rgba(0,0,0,0.55)" }}
              >
                {displayName}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => document.getElementById("cover-file-input")?.click()}
              className="absolute right-4 top-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/45 bg-black/35 px-3 py-2 text-sm text-white backdrop-blur-sm hover:bg-black/45"
            >
              <Camera size={16} />
              Alterar capa
            </button>
            <input
              id="cover-file-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setError(null);
                if (coverCropSourceUrl?.startsWith("blob:")) URL.revokeObjectURL(coverCropSourceUrl);
                const source = URL.createObjectURL(file);
                setCoverCropSourceUrl(source);
                event.currentTarget.value = "";
              }}
            />
          </div>

          <div className="relative px-5 pb-5 pt-0">
            <div className="-mt-16 flex flex-wrap items-end gap-4">
              <div className="relative h-28 w-28 overflow-hidden rounded-2xl border-4 border-white bg-slate-100 shadow-md">
                {avatarPreviewUrl ? (
                  <Image
                    src={avatarPreviewUrl}
                    alt="Avatar do corretor"
                    fill
                    className="object-cover"
                    sizes="112px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-500">
                    <UserCircle size={46} />
                  </div>
                )}
              </div>
              <div className="min-w-[240px] flex-1 self-end pb-2">
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span>@{profile?.nickname ?? "sem-nickname"}</span>
                  <span>•</span>
                  <span>{profile?.email ?? ""}</span>
                  {profile?.uf ? (
                    <>
                      <span>•</span>
                      <span>{profile.uf}</span>
                    </>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                onClick={() => document.getElementById("avatar-file-input")?.click()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <ImageSquare size={16} />
                Trocar avatar
              </button>

              <input
                id="avatar-file-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setError(null);
                  if (avatarCropSourceUrl?.startsWith("blob:")) URL.revokeObjectURL(avatarCropSourceUrl);
                  const source = URL.createObjectURL(file);
                  setAvatarCropSourceUrl(source);
                  event.currentTarget.value = "";
                }}
              />
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <nav className="border-b border-slate-200/70 px-4 py-3" aria-label="Navegação do perfil">
            <div className="flex flex-wrap gap-2">
              {PROFILE_TABS.map((tab, index) => {
                const isActive = activeProfileTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => selectProfileTab(tab.value)}
                    className={[
                      "group inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-left transition",
                      isActive
                        ? "border-sky-200 bg-sky-50 text-sky-700 shadow-[0_10px_22px_rgba(14,165,233,0.12)]"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800",
                    ].join(" ")}
                    aria-pressed={isActive}
                  >
                    <span
                      className={[
                        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition",
                        isActive
                          ? "border-sky-200 bg-white text-sky-600"
                          : "border-slate-200 bg-white text-slate-400 group-hover:text-slate-600",
                      ].join(" ")}
                    >
                      {index === 0 ? <UserCircle size={15} weight={isActive ? "fill" : "regular"} /> : null}
                      {index === 1 ? <EnvelopeSimple size={15} weight={isActive ? "fill" : "regular"} /> : null}
                      {index === 2 ? <ShieldCheck size={15} weight={isActive ? "fill" : "regular"} /> : null}
                      {index === 3 ? <GlobeHemisphereWest size={15} weight={isActive ? "fill" : "regular"} /> : null}
                      {index === 4 ? <CheckCircle size={15} weight={isActive ? "fill" : "regular"} /> : null}
                    </span>
                    <span className="flex flex-col">
                      <span className="whitespace-nowrap text-sm font-semibold leading-tight">{tab.label}</span>
                      <span
                        className={[
                          "mt-0.5 whitespace-nowrap text-[11px] font-medium leading-tight",
                          isActive ? "text-sky-600" : "text-slate-400",
                        ].join(" ")}
                      >
                        {tab.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="p-4">
            {activeProfileTab !== "provassociais" ? (
              <form onSubmit={handleSubmit} className="grid gap-4">
            <section
              hidden={activeProfileTab !== "dadosprincipais"}
              className="order-1 space-y-4"
            >
            <h2 className="text-xl">Dados principais</h2>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-500">Nome</span>
                <input
                  value={primeiroNome}
                  onChange={(event) => setPrimeiroNome(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--blue-slate)]"
                  placeholder="Seu nome"
                  required
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-slate-500">Sobrenome</span>
                <input
                  value={sobrenome}
                  onChange={(event) => setSobrenome(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--blue-slate)]"
                  placeholder="Seu sobrenome"
                />
              </label>
            </div>

            <label className="block text-sm">
              <span className="mb-1 flex items-center justify-between gap-3 text-slate-500">
                <span>Frase de impacto</span>
                <span className="text-xs tabular-nums text-slate-400">{fraseImpacto.length}/90</span>
              </span>
              <input
                value={fraseImpacto}
                onChange={(event) => setFraseImpacto(event.target.value.slice(0, 90))}
                maxLength={90}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--blue-slate)]"
                placeholder="Ex.: Especialista em imóveis de alto padrão em São Paulo"
              />
            </label>

            <div className="block text-sm">
              <span className="mb-1 block text-slate-500">Bio (rich text)</span>
              <div className="rounded-t-lg border border-b-0 border-slate-300 bg-slate-50 p-2">
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => applyBioCommand("bold")}
                    className="inline-flex cursor-pointer rounded-md border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100"
                    title="Negrito"
                  >
                    <TextB size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBioCommand("italic")}
                    className="inline-flex cursor-pointer rounded-md border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100"
                    title="Itálico"
                  >
                    <TextItalic size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBioCommand("underline")}
                    className="inline-flex cursor-pointer rounded-md border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100"
                    title="Sublinhado"
                  >
                    <TextUnderline size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBioCommand("insertUnorderedList")}
                    className="inline-flex cursor-pointer rounded-md border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100"
                    title="Lista"
                  >
                    <ListBullets size={15} />
                  </button>
                </div>
              </div>
              <div
                ref={bioEditorRef}
                contentEditable
                onInput={(event) => setBio((event.target as HTMLDivElement).innerHTML)}
                className="min-h-[140px] rounded-b-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--blue-slate)] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1"
                style={{ whiteSpace: "pre-wrap" }}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-500">UF</span>
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
              </label>

              <div className="block text-sm">
                <span className="mb-1 block text-slate-500">Cidades foco</span>
                <div className="relative">
                  <input
                    disabled={!uf}
                    value={cidadeInput}
                    onChange={(event) => setCidadeInput(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--blue-slate)] disabled:cursor-not-allowed disabled:bg-slate-100"
                    placeholder={uf ? "Digite a cidade e selecione na lista" : "Selecione a UF"}
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
                <p className="mt-1 text-xs text-slate-500">
                  {cidadeLoading ? "Carregando cidades..." : "Escolha cidades padronizadas do IBGE."}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="mb-2 text-slate-500">Cidades foco cadastradas</p>
              {cidadesFoco.length ? (
                <div className="flex flex-wrap gap-2">
                  {cidadesFoco.map((cidade) => (
                    <button
                      key={`${cidade.codigo_ibge}-${cidade.nome}`}
                      type="button"
                      onClick={() => removeCidade(cidade.codigo_ibge)}
                      className="cursor-pointer rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs"
                    >
                      {cidade.nome} ×
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Nenhuma cidade selecionada.</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-sm text-slate-500">Perfil de imóvel (segmentos)</p>
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
                  <label key={key} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
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
          </section>

            <section
              hidden={activeProfileTab !== "contato"}
              className="order-2 space-y-4"
            >
            <h2 className="text-xl">Contato e acesso</h2>

            <label className="block text-sm">
              <span className="mb-1 block text-slate-500">E-mail de acesso</span>
              <input
                value={profile?.email ?? ""}
                readOnly
                className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600"
                placeholder="Não informado"
              />
            </label>

            {pendingEmailChange ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Alteração pendente para <strong>{pendingEmailChange}</strong>. Confirme no e-mail
                recebido para concluir.
              </p>
            ) : null}

            <label className="block text-sm">
              <span className="mb-1 block text-slate-500">Telefone validado</span>
              <input
                value={telefone ? formatPhoneDisplay(telefone) : ""}
                readOnly
                className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600"
                placeholder="Não informado"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-slate-500">WhatsApp</span>
              <input
                value={whatsapp ? formatPhoneDisplay(whatsapp) : ""}
                readOnly
                className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600"
                placeholder="Não informado"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowPhoneModal(true)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Phone size={16} />
                Editar telefone
              </button>
              <button
                type="button"
                onClick={() => setShowEmailModal(true)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <EnvelopeSimple size={16} />
                Alterar e-mail de acesso
              </button>
            </div>

            <hr className="border-slate-200" />

            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base">E-mail profissional corretor.one</h3>
                  <p className="text-xs text-slate-500">
                    Use seu endereço profissional para fortalecer sua marca e atendimento.
                  </p>
                </div>
                {planoAtual ? (
                  <span className="rounded-full bg-slate-200 px-2 py-1 text-xs text-slate-700">
                    Plano {planoAtual.nome}
                  </span>
                ) : null}
              </div>

              {emailProfStatusLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Spinner size={14} className="animate-spin" />
                  Carregando status do e-mail profissional...
                </div>
              ) : null}

              {!emailProfStatusLoading && emailProfAtivo && emailProfissional ? (
                <div className="space-y-3">
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-500">E-mail ativo</span>
                    <input
                      value={emailProfissional.email}
                      readOnly
                      className="w-full cursor-not-allowed rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href="https://webmail.corretor.one"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-3 py-2 text-sm font-semibold text-white"
                    >
                      <GlobeHemisphereWest size={16} />
                      Acessar webmail
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        showToast("Configuração IMAP/SMTP será liberada no próximo passo da integração.")
                      }
                      className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      <ShieldCheck size={16} />
                      Configurar em app de e-mail
                    </button>
                    <button
                      type="button"
                      onClick={() => void openBillingPortal()}
                      disabled={openingBillingPortal}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {openingBillingPortal ? (
                        <Spinner size={16} className="animate-spin" />
                      ) : (
                        <Crown size={16} />
                      )}
                      Minha assinatura
                    </button>
                  </div>
                </div>
              ) : null}

              {!emailProfStatusLoading && !emailProfAtivo && isPaidPlan ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    {emailProfissional?.status === "SOLICITADO"
                      ? `Solicitação recebida para ${emailProfissional.email}.`
                      : "Seu plano permite e-mail profissional. Solicite agora para ativarmos."}
                  </p>
                  {emailProfissional?.status !== "SOLICITADO" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEmailProfPassword("");
                          setEmailProfConfirmPassword("");
                          setEmailProfPasswordError(null);
                          setShowEmailProfPasswordModal(true);
                        }}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-3 py-2 text-sm font-semibold text-white"
                      >
                        <EnvelopeSimple size={16} />
                        Solicitar e-mail profissional
                      </button>
                    </>
                  ) : (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Solicitação pendente. Assim que ativarmos, você poderá acessar o webmail.
                    </p>
                  )}
                </div>
              ) : null}

              {!emailProfStatusLoading && !emailProfAtivo && !isPaidPlan ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    O e-mail profissional está disponível em planos pagos.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUpgradeModal(true);
                      void loadUpgradePlanos();
                    }}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--primary-scarlet)] bg-white px-3 py-2 text-sm font-semibold text-[var(--primary-scarlet)] hover:bg-rose-50"
                  >
                    <Crown size={16} />
                    Solicitar e-mail profissional
                  </button>
                </div>
              ) : null}
            </div>
          </section>

            <section
              hidden={activeProfileTab !== "redessociais"}
              className="order-4 space-y-4"
            >
            <h2 className="text-xl">Redes sociais</h2>

            <label className="block text-sm">
              <span className="mb-1 block text-slate-500">Instagram</span>
              <div className="relative">
                <InstagramLogo
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={instagram}
                  onChange={(event) => setInstagram(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 outline-none focus:border-[var(--blue-slate)]"
                  placeholder="@seuusuario"
                />
              </div>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-slate-500">LinkedIn</span>
              <div className="relative">
                <LinkedinLogo
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={linkedin}
                  onChange={(event) => setLinkedin(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 outline-none focus:border-[var(--blue-slate)]"
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-slate-500">Pinterest</span>
              <div className="relative">
                <PinterestLogo
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={pinterest}
                  onChange={(event) => setPinterest(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 outline-none focus:border-[var(--blue-slate)]"
                  placeholder="https://pinterest.com/..."
                />
              </div>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-slate-500">TikTok</span>
              <div className="relative">
                <TiktokLogo
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={tiktok}
                  onChange={(event) => setTiktok(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 outline-none focus:border-[var(--blue-slate)]"
                  placeholder="@seuusuario"
                />
              </div>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-slate-500">Twitter / X</span>
              <div className="relative">
                <XLogo
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={twitter}
                  onChange={(event) => setTwitter(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 outline-none focus:border-[var(--blue-slate)]"
                  placeholder="@seuusuario"
                />
              </div>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-slate-500">YouTube</span>
              <div className="relative">
                <YoutubeLogo
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={youtube}
                  onChange={(event) => setYoutube(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 outline-none focus:border-[var(--blue-slate)]"
                  placeholder="https://youtube.com/@..."
                />
              </div>
            </label>
          </section>

            <section
              hidden={activeProfileTab !== "creci"}
              className="order-3 space-y-3"
            >
            <div className="flex items-center justify-between">
              <h2 className="text-xl">CRECI</h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  profile?.creci_aprovacao
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {profile?.creci_aprovacao ? "Aprovado" : "Pendente de aprovação"}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Número</p>
                <p className="mt-1 text-sm font-medium text-slate-800">{creciCode}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Comprovante</p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {profile?.creci_documento_midia_id ? "Documento enviado" : "Documento pendente"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <UploadSimple size={16} />
                {uploadingCreciDoc ? "Enviando..." : "Enviar comprovante"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  className="hidden"
                  disabled={uploadingCreciDoc}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void handleUploadCreciDoc(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>

              {profile?.creci_documento_midia_id ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                  <ShieldCheck size={14} />
                  Documento em análise
                </span>
              ) : null}
            </div>
          </section>

            <section className="order-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1 text-sm text-slate-600">
                <p className="inline-flex items-center gap-2">
                  <GlobeHemisphereWest size={16} />
                  URL pública:{" "}
                  <span className="font-medium text-slate-800">
                    corretor.one/{profile?.nickname ?? "seu-nickname"}
                  </span>
                </p>
                {hasPendingUploads ? (
                  <p className="text-xs text-amber-700">
                    Existem imagens novas prontas para upload. Clique em salvar para publicar.
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={saving || uploading || uploadingCreciDoc}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving || uploading ? (
                  <>
                    <Spinner size={16} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar perfil"
                )}
              </button>
            </div>
            </section>
          </form>
        ) : null}

            {activeProfileTab === "provassociais" ? (
              <section>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl">Provas sociais</h2>
              <p className="mt-1 text-sm text-slate-600">
                Depoimentos, assinaturas e entregas exibidos no seu perfil público.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingSocialProof(null);
                setSocialProofModalError(null);
                setShowSocialProofModal(true);
              }}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus size={16} />
              Nova prova social
            </button>
          </div>

          {loadingSocialProofs ? (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <Spinner size={14} className="animate-spin" />
              Carregando provas sociais...
            </div>
          ) : null}

          {!loadingSocialProofs && socialProofs.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-white text-slate-500">
                <CheckCircle size={24} />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-800">Nenhuma prova social cadastrada</p>
              <p className="mx-auto mt-1 max-w-xl text-sm text-slate-500">
                Cadastre momentos reais para fortalecer confiança antes do visitante chegar aos imóveis.
              </p>
            </div>
          ) : null}

          {socialProofs.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {reorderingSocialProofs ? (
                <p className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-sky-700">
                  Salvando nova ordem...
                </p>
              ) : null}
              {socialProofs.map((item) => {
                const typeLabel =
                  SOCIAL_PROOF_TYPE_OPTIONS.find((option) => option.value === item.tipo)?.label ?? item.tipo;
                return (
                  <article
                    key={item.id}
                    onDragEnter={(event) => {
                      const hasInternalDrag = event.dataTransfer.types?.includes("application/x-corretor-social-proof-id");
                      if (!hasInternalDrag) return;
                      event.preventDefault();
                      if (dropTargetSocialProofId !== item.id) setDropTargetSocialProofId(item.id);
                    }}
                    onDragOver={(event) => {
                      const hasInternalDrag = event.dataTransfer.types?.includes("application/x-corretor-social-proof-id");
                      if (!hasInternalDrag) return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      if (dropTargetSocialProofId !== item.id) setDropTargetSocialProofId(item.id);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const dragId =
                        event.dataTransfer.getData("application/x-corretor-social-proof-id") ||
                        event.dataTransfer.getData("text/plain");
                      if (!dragId) return;
                      moveSocialProofToTarget(dragId, item.id);
                      setDropTargetSocialProofId(null);
                    }}
                    className={`grid gap-3 rounded-xl border bg-white p-3 transition md:grid-cols-[32px_132px_1fr_auto] ${
                      dropTargetSocialProofId === item.id
                        ? "border-[var(--primary-scarlet)] ring-2 ring-[var(--primary-scarlet)]/20"
                        : "border-slate-200"
                    }`}
                  >
                    <button
                      type="button"
                      draggable={!reorderingSocialProofs}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("application/x-corretor-social-proof-id", item.id);
                        event.dataTransfer.setData("text/plain", item.id);
                      }}
                      onDragEnd={() => setDropTargetSocialProofId(null)}
                      className="flex cursor-grab items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 active:cursor-grabbing"
                      title="Arrastar para reordenar"
                      aria-label={`Reordenar ${item.titulo}`}
                    >
                      <DotsSixVertical size={18} />
                    </button>

                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-100">
                      {item.imagem_url ? (
                        <Image
                          src={item.imagem_url}
                          alt={item.imagem_alt || item.titulo}
                          fill
                          className="object-cover"
                          sizes="132px"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-400">
                          <ImageSquare size={26} />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{typeLabel}</span>
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            item.status === "PUBLICADO"
                              ? "bg-emerald-100 text-emerald-700"
                              : item.status === "ARQUIVADO"
                                ? "bg-slate-200 text-slate-600"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {SOCIAL_PROOF_STATUS_LABELS[item.status]}
                        </span>
                        {item.destaque ? (
                          <span className="rounded-full bg-rose-50 px-2 py-1 text-xs text-[var(--primary-scarlet)]">
                            Destaque
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-2 text-lg font-semibold text-slate-900">{item.titulo}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                        {item.depoimento || item.descricao || "Sem texto complementar."}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        {item.cliente_nome_publico ? <span>{item.cliente_nome_publico}</span> : null}
                        {item.localidade ? <span>{item.localidade}</span> : null}
                        {item.data_momento ? <span>{item.data_momento}</span> : null}
                        <span>Ordem {item.ordem}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start md:justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSocialProof(item);
                          setSocialProofModalError(null);
                          setShowSocialProofModal(true);
                        }}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <NotePencil size={16} />
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={deletingSocialProofId === item.id}
                        onClick={() => setDeleteSocialProofTarget(item)}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingSocialProofId === item.id ? (
                          <Spinner size={16} className="animate-spin" />
                        ) : (
                          <Trash size={16} />
                        )}
                        Remover
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
              </section>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
          <div className="flex items-start gap-2">
            <Crown size={16} className="mt-0.5 text-[var(--grey-olive)]" />
            <p>
              Sua capa e avatar impactam direto conversão no portal. Use fotos profissionais e com
              boa iluminação.
            </p>
          </div>
        </section>
      </div>

      {avatarCropSourceUrl ? (
        <DualImageCropper
          imageSrc={avatarCropSourceUrl}
          onCancel={() => {
            if (avatarCropSourceUrl.startsWith("blob:")) URL.revokeObjectURL(avatarCropSourceUrl);
            setAvatarCropSourceUrl(null);
          }}
          onComplete={(squareBlob) => {
            const file = new File([squareBlob], `avatar-square-${Date.now()}.jpg`, {
              type: "image/jpeg",
            });
            if (avatarPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(avatarPreviewUrl);
            if (avatarCropSourceUrl.startsWith("blob:")) URL.revokeObjectURL(avatarCropSourceUrl);
            setAvatarUploadFile(file);
            setAvatarPreviewUrl(URL.createObjectURL(squareBlob));
            setAvatarCropSourceUrl(null);
          }}
        />
      ) : null}

      {coverCropSourceUrl ? (
        <CoverCropper
          imageSrc={coverCropSourceUrl}
          onCancel={() => {
            if (coverCropSourceUrl.startsWith("blob:")) URL.revokeObjectURL(coverCropSourceUrl);
            setCoverCropSourceUrl(null);
          }}
          onComplete={(coverBlob) => {
            const file = new File([coverBlob], `cover-16x5-${Date.now()}.jpg`, {
              type: "image/jpeg",
            });
            if (coverPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(coverPreviewUrl);
            if (coverCropSourceUrl.startsWith("blob:")) URL.revokeObjectURL(coverCropSourceUrl);
            setCoverUploadFile(file);
            setCoverPreviewUrl(URL.createObjectURL(coverBlob));
            setCoverCropSourceUrl(null);
          }}
        />
      ) : null}

      {showSocialProofModal ? (
        <SocialProofModal
          item={editingSocialProof}
          saving={savingSocialProof}
          error={socialProofModalError}
          onClose={() => {
            setShowSocialProofModal(false);
            setEditingSocialProof(null);
            setSocialProofModalError(null);
          }}
          onSave={(draft, imageFile) => void saveSocialProof(draft, imageFile)}
        />
      ) : null}

      {deleteSocialProofTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Remover prova social</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Esta ação remove <strong>{deleteSocialProofTarget.titulo}</strong> do seu perfil.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteSocialProofTarget(null)}
                className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-3 text-sm text-rose-800">
              A prova social será excluída da listagem e deixará de aparecer no perfil público.
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteSocialProofTarget(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingSocialProofId === deleteSocialProofTarget.id}
                onClick={() => void deleteSocialProof(deleteSocialProofTarget.id)}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {deletingSocialProofId === deleteSocialProofTarget.id ? (
                  <Spinner size={16} className="animate-spin" />
                ) : (
                  <Trash size={16} />
                )}
                {deletingSocialProofId === deleteSocialProofTarget.id ? "Removendo..." : "Confirmar remoção"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showPhoneModal ? (
        <PhoneEditModal
          initialPhone={telefone}
          onClose={() => setShowPhoneModal(false)}
          onSuccess={(phoneE164) => {
            setTelefone(phoneE164);
            setWhatsapp(phoneE164);
            setProfile((prev) =>
              prev
                ? {
                    ...prev,
                    telefone: phoneE164,
                    whatsapp: phoneE164,
                    whatsapp_verificado_em: new Date().toISOString(),
                  }
                : prev,
            );
            showToast("Telefone atualizado e validado com sucesso.");
          }}
        />
      ) : null}

      {showEmailModal ? (
        <EmailEditModal
          currentEmail={profile?.email ?? ""}
          onClose={() => setShowEmailModal(false)}
          onSuccess={(newEmail) => {
            setPendingEmailChange(newEmail);
            showToast("Solicitação enviada. Confirme no novo e-mail para concluir.");
          }}
        />
      ) : null}

      {showEmailProfPasswordModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl">Definir senha do e-mail profissional</h2>
                <p className="text-sm text-slate-600">
                  Esta senha será usada no webmail <strong>corretor.one</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailProfPasswordModal(false)}
                className="inline-flex cursor-pointer rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-500">Senha</span>
                <input
                  type="password"
                  value={emailProfPassword}
                  onChange={(event) => {
                    setEmailProfPassword(event.target.value);
                    setEmailProfPasswordError(null);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--blue-slate)]"
                  placeholder="Digite sua senha"
                />
              </label>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full transition-all ${
                        emailProfPasswordPolicy.strength === "strong"
                          ? "bg-emerald-500"
                          : emailProfPasswordPolicy.strength === "medium"
                            ? "bg-amber-500"
                            : "bg-rose-500"
                      }`}
                      style={{ width: `${(emailProfPasswordPolicy.score / 3) * 100}%` }}
                    />
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      emailProfPasswordPolicy.strength === "strong"
                        ? "text-emerald-700"
                        : emailProfPasswordPolicy.strength === "medium"
                          ? "text-amber-700"
                          : "text-rose-700"
                    }`}
                  >
                    {passwordStrengthLabel(emailProfPasswordPolicy.strength)}
                  </span>
                </div>
                <ul className="space-y-1 text-xs text-slate-600">
                  <li className={emailProfPasswordPolicy.lengthOk ? "text-emerald-700" : ""}>
                    Mínimo de 8 caracteres
                  </li>
                  <li className={emailProfPasswordPolicy.hasUppercase ? "text-emerald-700" : ""}>
                    Pelo menos 1 letra maiúscula
                  </li>
                  <li className={emailProfPasswordPolicy.hasNumber ? "text-emerald-700" : ""}>
                    Pelo menos 1 número
                  </li>
                </ul>
              </div>

              <label className="block text-sm">
                <span className="mb-1 block text-slate-500">Confirmar senha</span>
                <input
                  type="password"
                  value={emailProfConfirmPassword}
                  onChange={(event) => {
                    setEmailProfConfirmPassword(event.target.value);
                    setEmailProfPasswordError(null);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--blue-slate)]"
                  placeholder="Digite novamente"
                />
              </label>

              {emailProfPasswordError ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {emailProfPasswordError}
                </p>
              ) : null}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEmailProfPasswordModal(false)}
                className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={requestingEmailProf}
                onClick={() => void requestEmailProfissional()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {requestingEmailProf ? <Spinner size={16} className="animate-spin" /> : <EnvelopeSimple size={16} />}
                Confirmar solicitação
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showUpgradeModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl">Upgrade para liberar e-mail profissional</h2>
                <p className="text-sm text-slate-600">
                  O recurso <strong>nickname@corretor.one</strong> está disponível em planos pagos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="inline-flex cursor-pointer rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-50"
              >
                <X size={16} />
              </button>
            </div>

            {loadingUpgradePlanos ? (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <Spinner size={14} className="animate-spin" />
                Carregando planos...
              </div>
            ) : null}

            {!loadingUpgradePlanos ? (
              <div className="grid gap-3 md:grid-cols-3">
                {upgradePlanos.map((plano) => (
                  <div key={plano.id} className="rounded-xl border border-slate-200 p-4">
                    <p className="text-lg">{plano.nome}</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      R$ {Number(plano.preco_mensal).toFixed(2).replace(".", ",")}
                      <span className="text-sm font-normal text-slate-500">/mês</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUpgradeModal(false);
                        void startCheckout(plano.id, "MENSAL");
                      }}
                      disabled={startingCheckoutPlanId === plano.id}
                      className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {startingCheckoutPlanId === plano.id ? (
                        <Spinner size={16} className="animate-spin" />
                      ) : (
                        <Crown size={16} />
                      )}
                      Fazer upgrade (mensal)
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
