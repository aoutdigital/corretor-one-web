"use client";

import Link from "next/link";
import { AdminShell } from "@/app/admin/_components/admin-shell";

export default function AdminDashboard(){return <AdminShell title="Visão operacional"><div className="grid gap-4 md:grid-cols-3"><Card label="Aprovações de CRECI" value="Fila de corretores" href="/admin/corretores"/><Card label="Equipe interna" value="Usuários e acessos" href="/admin/usuarios"/><Card label="Templates" value="Editor em preparação"/></div></AdminShell>}
function Card({label,value,href}:{label:string;value:string;href?:string}){const content=<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-xl font-bold">{value}</p></section>;return href?<Link href={href}>{content}</Link>:content}
