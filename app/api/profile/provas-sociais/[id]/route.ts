import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { deleteSocialProof, updateSocialProof } from "@/lib/db/provas-sociais";
import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { validateSocialProofPayload } from "@/lib/validation/social-proof";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function unauthorizedResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Missing bearer token",
      },
    },
    { status: 401 },
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid JSON body",
        },
      },
      { status: 400 },
    );
  }

  const validation = validateSocialProofPayload(body, "update");
  if (!validation.ok) {
    return NextResponse.json(validation, {
      status: statusFromErrorCode(validation.error.code),
    });
  }

  const result = await updateSocialProof(accessToken, id, validation.data);
  if (!result.ok) {
    return NextResponse.json(result, {
      status: statusFromErrorCode(result.error.code),
    });
  }

  return NextResponse.json(result, { status: 200 });
}

export async function DELETE(request: Request, context: RouteContext) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

  const { id } = await context.params;
  const result = await deleteSocialProof(accessToken, id);
  if (!result.ok) {
    return NextResponse.json(result, {
      status: statusFromErrorCode(result.error.code),
    });
  }

  return NextResponse.json(result, { status: 200 });
}
