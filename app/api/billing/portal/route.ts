import { NextResponse } from "next/server";

import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { stripeRequest } from "@/lib/server/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProfileRow = {
  id: string;
  stripe_customer_id: string | null;
};

type StripePortalSession = {
  id: string;
  url: string | null;
};

function unauthorizedResponse() {
  return NextResponse.json(
    { ok: false, error: { code: "UNAUTHORIZED", message: "Missing bearer token" } },
    { status: 401 },
  );
}

export async function POST(request: Request) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

  const authClient = createSupabaseServerClient(accessToken);
  const authResult = await authClient.auth.getUser();
  if (!authResult.data.user) return unauthorizedResponse();

  const userId = authResult.data.user.id;
  const admin = createSupabaseAdminClient();

  const profileResult = await admin
    .from("profiles")
    .select("id,stripe_customer_id")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (profileResult.error || !profileResult.data?.stripe_customer_id) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Cliente Stripe não encontrado para este usuário.",
        },
      },
      { status: 400 },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const portalSession = await stripeRequest<StripePortalSession>(
    "/billing_portal/sessions",
    new URLSearchParams({
      customer: profileResult.data.stripe_customer_id,
      return_url: `${appUrl}/perfil`,
    }),
  );

  if (!portalSession.url) {
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: "Portal URL not returned" } },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data: { url: portalSession.url } }, { status: 200 });
}
