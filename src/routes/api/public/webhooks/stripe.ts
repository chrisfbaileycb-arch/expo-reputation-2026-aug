/**
 * Stripe webhook endpoint.
 *
 * Two modes:
 *  1. LIVE — Stripe POSTs with `Stripe-Signature`; we verify against
 *     STRIPE_WEBHOOK_SECRET (when set) then process.
 *  2. TEST — internal simulator POSTs with header
 *     `x-stripe-test-mode: true` + `x-stripe-test-secret: <STRIPE_WEBHOOK_TEST_SECRET>`.
 *     Bypasses signature verification, marks the result as simulated.
 *
 * If neither secret is configured we fall back to "test-only" — the
 * test header path works, the live path 503s. This lets us verify the
 * handler before Stripe is enabled on the account.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { processStripeEvent, type StripeSubscriptionEvent } from "@/lib/stripe-webhook.server";

function verifyStripeSignature(payload: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    }),
  ) as Record<string, string>;
  if (!parts.t || !parts.v1) return false;
  const signed = `${parts.t}.${payload}`;
  const expected = createHmac("sha256", secret).update(signed).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const isTest = request.headers.get("x-stripe-test-mode") === "true";

        if (isTest) {
          const expected = process.env.STRIPE_WEBHOOK_TEST_SECRET;
          const provided = request.headers.get("x-stripe-test-secret") ?? "";
          if (!expected || provided !== expected) {
            return new Response("test mode unauthorized", { status: 401 });
          }
        } else {
          const liveSecret = process.env.STRIPE_WEBHOOK_SECRET;
          if (!liveSecret) {
            return new Response("stripe live webhook not configured yet", { status: 503 });
          }
          if (!verifyStripeSignature(raw, request.headers.get("stripe-signature"), liveSecret)) {
            return new Response("invalid signature", { status: 401 });
          }
        }

        let event: StripeSubscriptionEvent;
        try {
          event = JSON.parse(raw);
        } catch {
          return new Response("invalid json", { status: 400 });
        }

        const result = await processStripeEvent(event, { simulated: isTest });
        return Response.json(result, { status: result.ok ? 200 : 500 });
      },
    },
  },
});
