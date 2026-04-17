import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { getLeadWorkspace, updateLead } from "@/lib/db/leads";
import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { validateUpdateLead } from "@/lib/validation/crm";

type Params = {
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

export async function GET(request: Request, { params }: Params) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

  const { id } = await params;
  const result = await getLeadWorkspace(accessToken, id);
  if (!result.ok) {
    return NextResponse.json(result, {
      status: statusFromErrorCode(result.error.code),
    });
  }

  return NextResponse.json(result);
}

export async function PATCH(request: Request, { params }: Params) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

  const { id } = await params;

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

  const validation = validateUpdateLead(body);
  if (!validation.ok) {
    return NextResponse.json(validation, {
      status: statusFromErrorCode(validation.error.code),
    });
  }

  const result = await updateLead(accessToken, id, validation.data);
  if (!result.ok) {
    return NextResponse.json(result, {
      status: statusFromErrorCode(result.error.code),
    });
  }

  return NextResponse.json(result);
}
