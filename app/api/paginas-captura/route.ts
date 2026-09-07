import { NextResponse } from "next/server";
import { statusFromErrorCode } from "@/lib/api/result";
import { createLandingPage, listLandingPages, type LandingPageInput } from "@/lib/db/landing-pages";
import { getBearerTokenFromRequest } from "@/lib/http/auth";

function unauthorized() { return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Missing bearer token" } }, { status: 401 }); }
export async function GET(request: Request) {
  const token = getBearerTokenFromRequest(request); if (!token) return unauthorized();
  const result = await listLandingPages(token); return NextResponse.json(result, { status: result.ok ? 200 : statusFromErrorCode(result.error.code) });
}
export async function POST(request: Request) {
  const token = getBearerTokenFromRequest(request); if (!token) return unauthorized();
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } }, { status: 400 }); }
  const result = await createLandingPage(token, body && typeof body === "object" ? body as LandingPageInput : {});
  return NextResponse.json(result, { status: result.ok ? 201 : statusFromErrorCode(result.error.code) });
}
