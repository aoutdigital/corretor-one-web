"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { CoreNav } from "@/app/_components/core-nav";
import { apiFetchWithAuth } from "@/lib/client/auth-api";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  primeiro_nome: string | null;
  sobrenome: string | null;
  telefone: string | null;
  whatsapp: string | null;
  bio: string | null;
  creci_uf?: string | null;
  creci_numero?: string | null;
  creci_sufixo?: string | null;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [primeiroNome, setPrimeiroNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [bio, setBio] = useState("");

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
      if (profileResult.ok) {
        // Applies pending CRECI captured on sign-up flow (especially OAuth path).
        const pendingCreciRaw =
          typeof window !== "undefined" ? window.localStorage.getItem("co_signup_creci") : null;

        if (
          pendingCreciRaw &&
          !profileResult.data.creci_uf &&
          !profileResult.data.creci_numero
        ) {
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
            // ignore invalid localStorage payload
          }

          window.localStorage.removeItem("co_signup_creci");
        }

        setPrimeiroNome(profileResult.data.primeiro_nome ?? "");
        setSobrenome(profileResult.data.sobrenome ?? "");
        setTelefone(profileResult.data.telefone ?? "");
        setWhatsapp(profileResult.data.whatsapp ?? "");
        setBio(profileResult.data.bio ?? "");
      }

      setLoading(false);
    }

    bootstrap();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const result = await apiFetchWithAuth<{ id: string }>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify({
        primeiro_nome: primeiroNome,
        sobrenome,
        telefone: telefone || null,
        whatsapp: whatsapp || null,
        bio: bio || null,
      }),
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setMessage("Onboarding salvo.");
    router.push("/perfil");
  }

  if (loading) {
    return <main style={{ padding: 24 }}>Carregando onboarding...</main>;
  }

  return (
    <main style={{ maxWidth: 640, margin: "32px auto", padding: 20 }}>
      <CoreNav />
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Onboarding</h1>
      <p style={{ opacity: 0.8, marginBottom: 20 }}>Complete os dados iniciais do perfil.</p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          type="text"
          placeholder="Primeiro nome"
          value={primeiroNome}
          onChange={(event) => setPrimeiroNome(event.target.value)}
          required
          style={{ padding: 10, borderRadius: 8, border: "1px solid #3f4654" }}
        />
        <input
          type="text"
          placeholder="Sobrenome"
          value={sobrenome}
          onChange={(event) => setSobrenome(event.target.value)}
          style={{ padding: 10, borderRadius: 8, border: "1px solid #3f4654" }}
        />
        <input
          type="text"
          placeholder="Telefone"
          value={telefone}
          onChange={(event) => setTelefone(event.target.value)}
          style={{ padding: 10, borderRadius: 8, border: "1px solid #3f4654" }}
        />
        <input
          type="text"
          placeholder="WhatsApp"
          value={whatsapp}
          onChange={(event) => setWhatsapp(event.target.value)}
          style={{ padding: 10, borderRadius: 8, border: "1px solid #3f4654" }}
        />
        <textarea
          placeholder="Bio curta"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          rows={4}
          style={{ padding: 10, borderRadius: 8, border: "1px solid #3f4654" }}
        />

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "none",
            background: "#1463ff",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {saving ? "Salvando..." : "Salvar onboarding"}
        </button>
      </form>

      {error ? <p style={{ color: "#ff6b6b", marginTop: 12 }}>{error}</p> : null}
      {message ? <p style={{ color: "#7bed9f", marginTop: 12 }}>{message}</p> : null}
    </main>
  );
}
