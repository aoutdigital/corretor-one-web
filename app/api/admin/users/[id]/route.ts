import { NextResponse } from "next/server";
import { authorizeAdmin, writeAdminAudit, type AdminRole } from "@/lib/admin/authorization";

const ROLES = new Set<AdminRole>(["ADM", "SUPORTE", "MARKETING"]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await authorizeAdmin(request, "admin_users.manage");
  if (!access.ok) return NextResponse.json({ ok: false, error: { message: access.message } }, { status: access.status });
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const papel = body?.papel as AdminRole | undefined; const status = body?.status as "ATIVO" | "SUSPENSO" | undefined;
  if ((papel && !ROLES.has(papel)) || (status && !["ATIVO", "SUSPENSO"].includes(status)) || (!papel && !status)) return NextResponse.json({ ok: false, error: { message: "Alteração inválida." } }, { status: 400 });
  if (id === access.admin.id && (status === "SUSPENSO" || (papel && papel !== "ADM"))) return NextResponse.json({ ok: false, error: { message: "Você não pode suspender ou rebaixar sua própria conta." } }, { status: 409 });
  const current = await access.db.from("admin_users").select("id,nome,email,papel,status").eq("id", id).maybeSingle();
  if (!current.data) return NextResponse.json({ ok: false, error: { message: "Usuário administrativo não encontrado." } }, { status: 404 });
  if (current.data.papel === "ADM" && (status === "SUSPENSO" || (papel && papel !== "ADM"))) {
    const activeAdmins = await access.db.from("admin_users").select("id", { count: "exact", head: true }).eq("papel", "ADM").eq("status", "ATIVO");
    if ((activeAdmins.count ?? 0) <= 1) return NextResponse.json({ ok: false, error: { message: "O último administrador ativo não pode ser suspenso ou rebaixado." } }, { status: 409 });
  }
  const changes = { ...(papel ? { papel } : {}), ...(status ? { status } : {}) };
  const updated = await access.db.from("admin_users").update(changes).eq("id", id).select("id,nome,email,papel,status,last_login_at,created_at").single();
  if (updated.error) return NextResponse.json({ ok: false, error: { message: updated.error.message } }, { status: 500 });
  await writeAdminAudit({ db: access.db, request, adminUserId: access.admin.id, action: "ADMIN_USER_UPDATED", resourceType: "ADMIN_USER", resourceId: id, before: current.data, after: updated.data });
  return NextResponse.json({ ok: true, data: updated.data });
}
