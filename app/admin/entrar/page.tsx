"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { apiFetchWithAuth } from "@/lib/client/auth-api";
import { supabase } from "@/lib/supabaseClient";

export default function AdminLoginPage() {
  const router=useRouter();const[email,setEmail]=useState("");const[password,setPassword]=useState("");const[loading,setLoading]=useState(false);const[error,setError]=useState<string|null>(null);
  useEffect(()=>{apiFetchWithAuth("/api/admin/session").then((result)=>{if(result.ok)router.replace("/admin")})},[router]);
  async function submit(event:FormEvent){event.preventDefault();setLoading(true);setError(null);const signed=await supabase.auth.signInWithPassword({email,password});if(signed.error){setError("E-mail ou senha inválidos.");setLoading(false);return}const session=await apiFetchWithAuth("/api/admin/session");setLoading(false);if(!session.ok){await supabase.auth.signOut();setError(session.error);return}router.replace("/admin")}
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6"><section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"><Image src="/logo.svg" alt="Corretor.one" width={180} height={50} className="h-8 w-auto"/><p className="mt-8 text-xs font-bold uppercase tracking-[.2em] text-[var(--grey-olive)]">Ambiente interno</p><h1 className="mt-2 text-3xl font-bold">Admin Corretor.one</h1><p className="mt-2 text-sm text-slate-500">Acesso exclusivo para a equipe autorizada.</p><form onSubmit={submit} className="mt-8 space-y-4"><label className="grid gap-1.5 text-sm font-semibold">E-mail<input type="email" required value={email} onChange={(event)=>setEmail(event.target.value)} className="rounded-xl border border-slate-300 px-4 py-3 font-normal"/></label><label className="grid gap-1.5 text-sm font-semibold">Senha<input type="password" required value={password} onChange={(event)=>setPassword(event.target.value)} className="rounded-xl border border-slate-300 px-4 py-3 font-normal"/></label>{error?<p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>:null}<button disabled={loading} className="w-full rounded-xl bg-slate-950 px-5 py-3 font-bold text-white disabled:opacity-50">{loading?"Validando...":"Entrar no Admin"}</button></form></section></main>
}
