import { NextResponse } from "next/server";
import { statusFromErrorCode } from "@/lib/api/result";
import { deleteLandingPage, getLandingPage, updateLandingPage, type LandingPageInput } from "@/lib/db/landing-pages";
import { getBearerTokenFromRequest } from "@/lib/http/auth";
type Context = { params: Promise<{ id: string }> };
function unauthorized() { return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Missing bearer token" } }, { status: 401 }); }
export async function GET(request: Request, { params }: Context) { const token = getBearerTokenFromRequest(request); if (!token) return unauthorized(); const result = await getLandingPage(token, (await params).id); return NextResponse.json(result, { status: result.ok ? 200 : statusFromErrorCode(result.error.code) }); }
export async function PATCH(request: Request, { params }: Context) { const token = getBearerTokenFromRequest(request); if (!token) return unauthorized(); let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } }, { status: 400 }); } const result = await updateLandingPage(token, (await params).id, body && typeof body === "object" ? body as LandingPageInput : {}); return NextResponse.json(result, { status: result.ok ? 200 : statusFromErrorCode(result.error.code) }); }
export async function DELETE(request: Request, { params }: Context) { const token = getBearerTokenFromRequest(request); if (!token) return unauthorized(); const result = await deleteLandingPage(token, (await params).id); return NextResponse.json(result, { status: result.ok ? 200 : statusFromErrorCode(result.error.code) }); }
