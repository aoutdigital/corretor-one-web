"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { House, Images, SignOut, Users, UserList } from "@phosphor-icons/react";
import { apiFetchWithAuth } from "@/lib/client/auth-api";
import { supabase } from "@/lib/supabaseClient";

type Session={user:{nome:string;email:string;papel:"ADM"|"SUPORTE"|"MARKETING"};permissions:string[]};
const links=[{href:"/admin",label:"Dashboard",icon:House},{href:"/admin/corretores",label:"Corretores",icon:UserList,permission:"brokers.read"},{href:"/admin/templates",label:"Templates",icon:Images,permission:"templates.read"},{href:"/admin/usuarios",label:"Equipe",icon:Users,permission:"admin_users.manage"}];

export function AdminShell({title,children}:{title:string;children:ReactNode}){const router=useRouter();const pathname=usePathname();const[session,setSession]=useState<Session|null>(null);useEffect(()=>{apiFetchWithAuth<Session>("/api/admin/session").then((result)=>{if(result.ok)setSession(result.data);else router.replace("/admin/entrar")})},[router]);if(!session)return <main className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">Validando acesso...</main>;return <div className="min-h-screen bg-slate-100 text-slate-950 lg:grid lg:grid-cols-[260px_1fr]"><aside className="border-r border-slate-800 bg-slate-950 p-5 text-white"><span className="inline-flex rounded-lg bg-white p-2"><Image src="/logo.svg" alt="Corretor.one" width={180} height={50} className="h-7 w-auto"/></span><p className="mt-2 text-xs uppercase tracking-[.2em] text-slate-400">Admin</p><nav className="mt-10 space-y-2">{links.filter((item)=>!item.permission||session.permissions.includes(item.permission)).map(({href,label,icon:Icon})=><Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${pathname===href?"bg-white text-slate-950":"text-slate-300 hover:bg-slate-900"}`}><Icon size={20}/>{label}</Link>)}</nav><div className="mt-12 border-t border-slate-800 pt-5"><p className="text-sm font-bold">{session.user.nome}</p><p className="text-xs text-slate-400">{session.user.papel}</p><button onClick={async()=>{await supabase.auth.signOut();router.replace("/admin/entrar")}} className="mt-4 flex items-center gap-2 text-sm text-slate-300"><SignOut/>Sair</button></div></aside><main className="min-w-0 p-5 lg:p-8"><header className="mb-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--grey-olive)]">Admin Corretor.one</p><h1 className="mt-1 text-3xl font-bold">{title}</h1></header>{children}</main></div>}
