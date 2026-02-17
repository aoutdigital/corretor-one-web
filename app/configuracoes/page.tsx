"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CoreNav } from "@/app/_components/core-nav";
import { supabase } from "@/lib/supabaseClient";

type SessionInfo = {
  email: string;
  userId: string;
};

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) {
        setSessionInfo(null);
        return;
      }

      setSessionInfo({
        email: data.session.user.email ?? "(sem email)",
        userId: data.session.user.id,
      });
    }

    loadSession();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setMessage("Sessao encerrada.");
    router.push("/entrar");
  }

  return (
    <main style={{ maxWidth: 720, margin: "32px auto", padding: 20 }}>
      <CoreNav />
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Configuracoes</h1>
      <p style={{ opacity: 0.8, marginBottom: 20 }}>Gerencie sua sessao e dados basicos.</p>

      {sessionInfo ? (
        <div style={{ marginBottom: 16 }}>
          <p>Email: {sessionInfo.email}</p>
          <p>User ID: {sessionInfo.userId}</p>
        </div>
      ) : (
        <p style={{ marginBottom: 16 }}>Sem sessao ativa.</p>
      )}

      <button
        onClick={handleSignOut}
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid #3f4654",
          background: "transparent",
          color: "inherit",
          cursor: "pointer",
        }}
      >
        Sair
      </button>

      {message ? <p style={{ color: "#7bed9f", marginTop: 12 }}>{message}</p> : null}
    </main>
  );
}
