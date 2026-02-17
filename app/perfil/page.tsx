"use client";

import { FormEvent, useEffect, useState } from "react";

import { CoreNav } from "@/app/_components/core-nav";
import { apiFetchWithAuth } from "@/lib/client/auth-api";

type Profile = {
  id: string;
  email: string;
  primeiro_nome: string | null;
  sobrenome: string | null;
  telefone: string | null;
  whatsapp: string | null;
  bio: string | null;
  nickname: string | null;
  created_at: string;
  updated_at: string;
};

export default function PerfilPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [primeiroNome, setPrimeiroNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const result = await apiFetchWithAuth<Profile>("/api/profile");
      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setProfile(result.data);
      setPrimeiroNome(result.data.primeiro_nome ?? "");
      setSobrenome(result.data.sobrenome ?? "");
      setTelefone(result.data.telefone ?? "");
      setWhatsapp(result.data.whatsapp ?? "");
      setBio(result.data.bio ?? "");
      setLoading(false);
    }

    loadProfile();
  }, []);

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

    setMessage("Perfil atualizado com sucesso.");
  }

  if (loading) {
    return <main style={{ padding: 24 }}>Carregando perfil...</main>;
  }

  return (
    <main style={{ maxWidth: 720, margin: "32px auto", padding: 20 }}>
      <CoreNav />
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Perfil</h1>

      {profile ? (
        <p style={{ opacity: 0.8, marginBottom: 20 }}>
          {profile.email} {profile.nickname ? `- @${profile.nickname}` : ""}
        </p>
      ) : null}

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
          placeholder="Bio"
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
          {saving ? "Salvando..." : "Salvar perfil"}
        </button>
      </form>

      {error ? <p style={{ color: "#ff6b6b", marginTop: 12 }}>{error}</p> : null}
      {message ? <p style={{ color: "#7bed9f", marginTop: 12 }}>{message}</p> : null}
    </main>
  );
}
