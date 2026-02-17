"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { CoreNav } from "@/app/_components/core-nav";
import { apiFetchWithAuth } from "@/lib/client/auth-api";

export default function NovoEmpreendimentoPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [slug, setSlug] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [geolocacaoId, setGeolocacaoId] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("SP");
  const [cep, setCep] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const result = await apiFetchWithAuth<{ id: string }>("/api/empreendimentos", {
      method: "POST",
      body: JSON.stringify({
        slug_publico: slug,
        nome,
        descricao: descricao || null,
        geolocacao_id: geolocacaoId,
        logradouro,
        numero,
        bairro,
        cidade,
        estado,
        cep: cep || null,
        address_json: {
          logradouro,
          numero,
          bairro,
          cidade,
          uf: estado,
          cep: cep || null,
        },
      }),
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push(`/empreendimentos/${result.data.id}`);
  }

  return (
    <main style={{ maxWidth: 760, margin: "32px auto", padding: 20 }}>
      <CoreNav />
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Novo empreendimento</h1>
      <p style={{ opacity: 0.8, marginBottom: 14 }}>
        Informe um `geolocacao_id` existente para criar (F7 base sem autocomplete ainda).
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="Slug publico" required />
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" required />
        <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descricao" rows={4} />

        <input
          value={geolocacaoId}
          onChange={(e) => setGeolocacaoId(e.target.value)}
          placeholder="Geolocacao ID"
          required
        />
        <input value={logradouro} onChange={(e) => setLogradouro(e.target.value)} placeholder="Logradouro" required />
        <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Numero" required />
        <input value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Bairro" required />
        <input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade" required />
        <input value={estado} onChange={(e) => setEstado(e.target.value)} placeholder="UF" required />
        <input value={cep} onChange={(e) => setCep(e.target.value)} placeholder="CEP" />

        <button type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Criar empreendimento"}
        </button>
      </form>

      {error ? <p style={{ color: "#ff6b6b", marginTop: 12 }}>{error}</p> : null}
    </main>
  );
}
