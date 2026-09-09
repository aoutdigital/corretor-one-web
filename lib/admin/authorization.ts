import type { NextRequest } from "next/server";

import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminRole = "ADM" | "SUPORTE" | "MARKETING";
export type AdminPermission =
  | "admin_users.manage"
  | "brokers.read"
  | "brokers.update"
  | "brokers.approve_creci"
  | "brokers.suspend"
  | "templates.read"
  | "templates.edit"
  | "templates.publish"
  | "audit.read"
  | "billing.read"
  | "billing.manage";

const ROLE_PERMISSIONS: Record<AdminRole, ReadonlySet<AdminPermission>> = {
  ADM: new Set(["admin_users.manage", "brokers.read", "brokers.update", "brokers.approve_creci", "brokers.suspend", "templates.read", "templates.edit", "templates.publish", "audit.read", "billing.read", "billing.manage"]),
  SUPORTE: new Set(["brokers.read", "brokers.update", "brokers.approve_creci", "brokers.suspend", "audit.read", "billing.read"]),
  MARKETING: new Set(["brokers.read", "templates.read", "templates.edit", "templates.publish"]),
};

export function permissionsForRole(role: AdminRole) { return [...ROLE_PERMISSIONS[role]]; }

export async function authorizeAdmin(request: Request, permission?: AdminPermission) {
  const token = getBearerTokenFromRequest(request);
  if (!token) return { ok: false as const, status: 401, message: "Sessão administrativa inválida." };
  const db = createSupabaseAdminClient();
  const auth = await db.auth.getUser(token);
  if (!auth.data.user) return { ok: false as const, status: 401, message: "Sessão administrativa inválida." };
  const result = await db.from("admin_users").select("id,nome,email,papel,status").eq("id", auth.data.user.id).maybeSingle();
  if (result.error || !result.data || result.data.status !== "ATIVO") return { ok: false as const, status: 403, message: "Usuário sem acesso ao Admin." };
  const role = result.data.papel as AdminRole;
  if (permission && !ROLE_PERMISSIONS[role].has(permission)) return { ok: false as const, status: 403, message: "Você não possui permissão para esta ação." };
  return { ok: true as const, db, authUser: auth.data.user, admin: { ...result.data, papel: role }, permissions: permissionsForRole(role) };
}

export async function writeAdminAudit(input: { db: ReturnType<typeof createSupabaseAdminClient>; request: Request | NextRequest; adminUserId: string; action: string; resourceType: string; resourceId?: string | null; before?: unknown; after?: unknown; reason?: string | null }) {
  const forwarded = input.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  await input.db.from("admin_audit_logs").insert({ admin_user_id: input.adminUserId, acao: input.action, recurso_tipo: input.resourceType, recurso_id: input.resourceId ?? null, dados_anteriores: input.before as never, dados_novos: input.after as never, justificativa: input.reason ?? null, ip: forwarded as never, user_agent: input.request.headers.get("user-agent") });
}
