import { NextResponse } from "next/server";

import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { stripeRequest } from "@/lib/server/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RequestBody = {
  plano_id?: string;
  periodicidade?: "MENSAL" | "ANUAL";
};

type ProfileRow = {
  id: string;
  email: string;
  stripe_customer_id: string | null;
};

type PlanoRow = {
  id: string;
  nome: string;
  stripe_price_id_mensal: string | null;
  stripe_price_id_anual: string | null;
};

type StripeCustomer = {
  id: string;
};

type StripeCheckoutSession = {
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

  let body: RequestBody = {};
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    body = {};
  }

  const planoId = body.plano_id;
  const periodicidade = body.periodicidade ?? "MENSAL";

  if (!planoId) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "plano_id is required" } },
      { status: 400 },
    );
  }

  const authClient = createSupabaseServerClient(accessToken);
  const authResult = await authClient.auth.getUser();
  if (!authResult.data.user) return unauthorizedResponse();

  const userId = authResult.data.user.id;
  const admin = createSupabaseAdminClient();

  const profileResult = await admin
    .from("profiles")
    .select("id,email,stripe_customer_id")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (profileResult.error || !profileResult.data?.email) {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "Profile not found" } },
      { status: 404 },
    );
  }

  const planoResult = await admin
    .from("planos")
    .select("id,nome,stripe_price_id_mensal,stripe_price_id_anual")
    .eq("id", planoId)
    .maybeSingle<PlanoRow>();

  if (planoResult.error || !planoResult.data) {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "Plano not found" } },
      { status: 404 },
    );
  }

  const priceId =
    periodicidade === "ANUAL"
      ? planoResult.data.stripe_price_id_anual
      : planoResult.data.stripe_price_id_mensal;

  if (!priceId) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `Plano sem preço Stripe para periodicidade ${periodicidade}`,
        },
      },
      { status: 400 },
    );
  }

  let stripeCustomerId = profileResult.data.stripe_customer_id;

  if (!stripeCustomerId) {
    const customer = await stripeRequest<StripeCustomer>(
      "/customers",
      new URLSearchParams({
        email: profileResult.data.email,
        "metadata[owner_id]": userId,
      }),
    );

    stripeCustomerId = customer.id;
    const profileUpdateClient = createSupabaseAdminClient() as unknown as {
      from: (table: "profiles") => {
        update: (values: { stripe_customer_id: string }) => {
          eq: (column: "id", value: string) => Promise<{ error: { message: string } | null }>;
        };
      };
    };
    await profileUpdateClient
      .from("profiles")
      .update({ stripe_customer_id: stripeCustomerId })
      .eq("id", userId);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const successUrl = `${appUrl}/perfil?billing=success`;
  const cancelUrl = `${appUrl}/perfil?billing=cancel`;

  const session = await stripeRequest<StripeCheckoutSession>(
    "/checkout/sessions",
    new URLSearchParams({
      mode: "subscription",
      customer: stripeCustomerId,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: successUrl,
      cancel_url: cancelUrl,
      "metadata[owner_id]": userId,
      "metadata[plano_id]": planoId,
      "metadata[periodicidade]": periodicidade,
      allow_promotion_codes: "true",
    }),
  );

  if (!session.url) {
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: "Checkout URL not returned" } },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data: { url: session.url } }, { status: 200 });
}
