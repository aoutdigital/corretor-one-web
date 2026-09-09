import { NextResponse } from "next/server";
import { authorizeAdmin, writeAdminAudit, type AdminRole } from "@/lib/admin/authorization";

const ROLES = new Set<AdminRole>(["ADM", "SUPORTE", "MARKETING"]);
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

export async function GET(request: Request) {
  const access = await authorizeAdmin(request, "admin_users.manage");
  if (!access.ok) return NextResponse.json({ ok: false, error: { message: access.message } }, { status: access.status });
  const result = await access.db.from("admin_users").select("id,nome,email,papel,status,last_login_at,created_at,created_by").order("nome");
  if (result.error) return NextResponse.json({ ok: false, error: { message: result.error.message } }, { status: 500 });
  return NextResponse.json({ ok: true, data: result.data ?? [] });
}

export async function POST(request: Request) {
  const access = await authorizeAdmin(request, "admin_users.manage");
  if (!access.ok) return NextResponse.json({ ok: false, error: { message: access.message } }, { status: access.status });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const nome = clean(body?.nome, 120); const email = clean(body?.email, 254).toLowerCase(); const papel = clean(body?.papel, 20) as AdminRole;
  if (nome.length < 2 || !email.includes("@") || !ROLES.has(papel)) return NextResponse.json({ ok: false, error: { message: "Nome, e-mail ou papel inválido." } }, { status: 400 });
  const invited = await access.db.auth.admin.inviteUserByEmail(email, { data: { name: nome, admin_invite: true } });
  if (invited.error || !invited.data.user) return NextResponse.json({ ok: false, error: { message: invited.error?.message ?? "Não foi possível convidar o usuário." } }, { status: 400 });
  const created = await access.db.from("admin_users").insert({ id: invited.data.user.id, nome, email, papel, created_by: access.admin.id }).select("id,nome,email,papel,status,last_login_at,created_at").single();
  if (created.error) return NextResponse.json({ ok: false, error: { message: created.error.message } }, { status: 500 });
  await writeAdminAudit({ db: access.db, request, adminUserId: access.admin.id, action: "ADMIN_USER_INVITED", resourceType: "ADMIN_USER", resourceId: invited.data.user.id, after: created.data });
  return NextResponse.json({ ok: true, data: created.data }, { status: 201 });
}
