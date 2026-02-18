import { createHmac, timingSafeEqual } from "crypto";

function getStripeEnv() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  return { secretKey };
}

export function getStripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET");
  }
  return secret;
}

export async function stripeRequest<T>(path: string, form: URLSearchParams): Promise<T> {
  const { secretKey } = getStripeEnv();
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: { message?: string } })
    | null;

  if (!response.ok || !payload) {
    const message = payload && "error" in payload ? payload.error?.message : "Stripe request failed";
    throw new Error(message || "Stripe request failed");
  }

  return payload;
}

export function verifyStripeSignature(rawBody: string, signature: string, webhookSecret: string): boolean {
  const parts = signature.split(",");
  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signatureParts = parts.filter((part) => part.startsWith("v1="));

  if (!timestampPart || signatureParts.length === 0) return false;

  const timestamp = timestampPart.replace("t=", "");
  const signedPayload = `${timestamp}.${rawBody}`;

  const expected = createHmac("sha256", webhookSecret).update(signedPayload, "utf8").digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  for (const item of signatureParts) {
    const current = item.replace("v1=", "");
    const currentBuffer = Buffer.from(current, "hex");
    if (currentBuffer.length === expectedBuffer.length && timingSafeEqual(currentBuffer, expectedBuffer)) {
      return true;
    }
  }

  return false;
}
