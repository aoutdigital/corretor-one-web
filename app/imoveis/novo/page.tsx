"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { CoreNav } from "@/app/_components/core-nav";
import { apiFetchWithAuth } from "@/lib/client/auth-api";

export default function NovoImovelPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [codigo, setCodigo] = useState("");
  const [slug, setSlug] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [finalidade, setFinalidade] = useState("VENDA");
  const [tipo, setTipo] = useState("APARTAMENTO");
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

    const result = await apiFetchWithAuth<{ id: string }>("/api/imoveis", {
      method: "POST",
      body: JSON.stringify({
        codigo,
        slug_publico: slug,
        titulo,
        descricao,
        finalidade,
        tipo,
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

    router.push(`/imoveis/${result.data.id}`);
  }

  return (
    <main style={{ maxWidth: 760, margin: "32px auto", padding: 20 }}>
      <CoreNav />
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Novo imovel</h1>
      <p style={{ opacity: 0.8, marginBottom: 14 }}>
        Informe um `geolocacao_id` existente para criar (F7 base sem autocomplete ainda).
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
        <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Codigo" required />
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="Slug publico" required />
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Titulo" required />
        <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descricao" rows={4} required />

        <select value={finalidade} onChange={(e) => setFinalidade(e.target.value)}>
          <option value="VENDA">VENDA</option>
          <option value="ALUGUEL">ALUGUEL</option>
          <option value="VENDA_E_ALUGUEL">VENDA_E_ALUGUEL</option>
        </select>

        <input value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Tipo (ex: APARTAMENTO)" required />

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
          {saving ? "Salvando..." : "Criar imovel"}
        </button>
      </form>

      {error ? <p style={{ color: "#ff6b6b", marginTop: 12 }}>{error}</p> : null}
    </main>
  );
}
