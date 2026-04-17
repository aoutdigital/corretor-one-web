import { NextResponse } from "next/server";

import { ensureProfileNicknameLogos } from "@/lib/branding/profile-logo";
import { getStripeWebhookSecret, verifyStripeSignature } from "@/lib/server/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

type PlanoStripeMap = {
  id: string;
  slug: string;
  stripe_price_id_mensal: string | null;
  stripe_price_id_anual: string | null;
};

type ProfileStripeMap = {
  id: string;
  stripe_customer_id: string | null;
};

function mapSubscriptionStatus(status: string): "ATIVA" | "PENDENTE" | "ATRASADA" | "CANCELADA" {
  if (status === "active" || status === "trialing") return "ATIVA";
  if (status === "past_due" || status === "unpaid") return "ATRASADA";
  if (status === "canceled" || status === "incomplete_expired") return "CANCELADA";
  return "PENDENTE";
}

function extractPriceId(subscriptionObject: Record<string, unknown>): string | null {
  const items = subscriptionObject.items as { data?: Array<{ price?: { id?: string } }> } | undefined;
  const first = items?.data?.[0];
  return first?.price?.id ?? null;
}

async function findPlanoByPriceId(priceId: string) {
  const admin = createSupabaseAdminClient() as unknown as {
    from: (table: "planos") => {
      select: (columns: string) => {
        eq: (column: "stripe_price_id_mensal" | "stripe_price_id_anual", value: string) => {
          maybeSingle: () => Promise<{ data: PlanoStripeMap | null; error: { message: string } | null }>;
        };
      };
    };
  };

  const mensal = await admin
    .from("planos")
    .select("id,slug,stripe_price_id_mensal,stripe_price_id_anual")
    .eq("stripe_price_id_mensal", priceId)
    .maybeSingle();

  if (mensal.data) return mensal.data;

  const anual = await admin
    .from("planos")
    .select("id,slug,stripe_price_id_mensal,stripe_price_id_anual")
    .eq("stripe_price_id_anual", priceId)
    .maybeSingle();

  return anual.data;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Missing stripe-signature" } },
      { status: 401 },
    );
  }

  const rawBody = await request.text();
  const webhookSecret = getStripeWebhookSecret();

  const valid = verifyStripeSignature(rawBody, signature, webhookSecret);
  if (!valid) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Invalid signature" } },
      { status: 401 },
    );
  }

  const event = JSON.parse(rawBody) as StripeEvent;
  const admin = createSupabaseAdminClient();

  try {
    if (event.type === "checkout.session.completed") {
      const obj = event.data.object;
      const customerId = (obj.customer as string | null) ?? null;
      const ownerId = (obj.metadata as { owner_id?: string } | undefined)?.owner_id ?? null;

      if (ownerId && customerId) {
        const profileUpdateClient = createSupabaseAdminClient() as unknown as {
          from: (table: "profiles") => {
            update: (values: { stripe_customer_id: string }) => {
              eq: (column: "id", value: string) => Promise<{ error: { message: string } | null }>;
            };
          };
        };
        await profileUpdateClient
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", ownerId);
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object;
      const stripeSubscriptionId = (sub.id as string | null) ?? null;
      const stripeCustomerId = (sub.customer as string | null) ?? null;
      const stripeStatus = (sub.status as string | null) ?? "incomplete";
      const priceId = extractPriceId(sub);
      const currentPeriodEndUnix = (sub.current_period_end as number | null) ?? null;

      if (stripeSubscriptionId && stripeCustomerId && priceId) {
        const profileResult = await admin
          .from("profiles")
          .select("id,stripe_customer_id")
          .eq("stripe_customer_id", stripeCustomerId)
          .maybeSingle<ProfileStripeMap>();

        const ownerId = profileResult.data?.id ?? null;
        if (ownerId) {
          const plano = await findPlanoByPriceId(priceId);
          const status = mapSubscriptionStatus(stripeStatus);
          const currentPeriodEnd =
            currentPeriodEndUnix && Number.isFinite(currentPeriodEndUnix)
              ? new Date(currentPeriodEndUnix * 1000).toISOString()
              : null;

          if (plano) {
            const assinaturaClient = createSupabaseAdminClient() as unknown as {
              from: (table: "assinaturas") => {
                upsert: (
                  values: {
                    owner_id: string;
                    plano_id: string;
                    status: "ATIVA" | "PENDENTE" | "ATRASADA" | "CANCELADA";
                    stripe_subscription_id: string;
                    stripe_price_id: string;
                    stripe_current_period_end: string | null;
                    fim_em: string | null;
                    cancelado_em: string | null;
                  },
                  options: { onConflict: "owner_id" },
                ) => Promise<{ error: { message: string } | null }>;
              };
            };

            await assinaturaClient.from("assinaturas").upsert(
              {
                owner_id: ownerId,
                plano_id: plano.id,
                status,
                stripe_subscription_id: stripeSubscriptionId,
                stripe_price_id: priceId,
                stripe_current_period_end: currentPeriodEnd,
                fim_em: status === "CANCELADA" ? currentPeriodEnd : null,
                cancelado_em: status === "CANCELADA" ? new Date().toISOString() : null,
              },
              { onConflict: "owner_id" },
            );

            const planoFinal = status === "CANCELADA" ? null : plano.id;
            await admin.from("profiles").update({ plano_id: planoFinal }).eq("id", ownerId);

            if (planoFinal) {
              const logoResult = await ensureProfileNicknameLogos(ownerId);
              if (!logoResult.ok) {
                console.error("[stripe.webhook] failed to ensure nickname logos", {
                  ownerId,
                  code: logoResult.error.code,
                  message: logoResult.error.message,
                });
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing error";
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
