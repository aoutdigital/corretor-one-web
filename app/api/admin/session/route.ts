import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/lib/admin/authorization";

export async function GET(request: Request) {
  const access = await authorizeAdmin(request);
  if (!access.ok) return NextResponse.json({ ok: false, error: { message: access.message } }, { status: access.status });
  await access.db.from("admin_users").update({ last_login_at: new Date().toISOString() }).eq("id", access.admin.id);
  return NextResponse.json({ ok: true, data: { user: access.admin, permissions: access.permissions } });
}
