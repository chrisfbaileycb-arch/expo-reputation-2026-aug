/**
 * Admin-only Stripe webhook simulator + reprocessor.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SimulateInput = {
  organization_id: string;
  cancel_at_period_end: boolean;
  contract_ends_at?: string | null;
};

async function assertOrgAdmin(supabase: any, userId: string, orgId: string) {
  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", orgId)
    .in("role", ["owner", "admin"])
    .maybeSingle();
  if (!role) throw new Error("Forbidden — owner/admin role required");
}

export const simulateSubscriptionEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SimulateInput) => {
    if (!input?.organization_id) throw new Error("organization_id required");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertOrgAdmin(context.supabase, context.userId, data.organization_id);

    const { processStripeEvent } = await import("@/lib/stripe-webhook.server");

    const now = Math.floor(Date.now() / 1000);
    const event = {
      id: `evt_test_${now}`,
      type: "customer.subscription.updated" as const,
      livemode: false,
      data: {
        object: {
          id: `sub_test_${now}`,
          customer: `cus_test_${data.organization_id.slice(0, 8)}`,
          cancel_at_period_end: data.cancel_at_period_end,
          current_period_end: now + 60 * 60 * 24 * 30,
          status: "active",
          metadata: {
            organization_id: data.organization_id,
            ...(data.contract_ends_at ? { contract_ends_at: data.contract_ends_at } : {}),
          },
        },
      },
    };

    return await processStripeEvent(event, { simulated: true });
  });

export const reprocessWebhookEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { event_row_id: string }) => {
    if (!input?.event_row_id) throw new Error("event_row_id required");
    return input;
  })
  .handler(async ({ data, context }) => {
    // Load the row first (RLS scopes to user's org).
    const { data: row, error: loadErr } = await context.supabase
      .from("stripe_webhook_events")
      .select("id, organization_id, simulated, ok, payload, event_id, event_type")
      .eq("id", data.event_row_id)
      .maybeSingle();
    if (loadErr) throw new Error(loadErr.message);
    if (!row) throw new Error("Event not found");

    await assertOrgAdmin(context.supabase, context.userId, row.organization_id);

    // Only allow reprocessing TEST events or failed LIVE events.
    if (!row.simulated && row.ok) {
      throw new Error("Live events that succeeded cannot be reprocessed.");
    }

    const { processStripeEvent } = await import("@/lib/stripe-webhook.server");
    const result = await processStripeEvent(row.payload as never, {
      simulated: row.simulated,
      skipHistoryInsert: true,
    });

    // Update the existing history row in place with the new outcome.
    const stamp = new Date().toISOString();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: updErr } = await supabaseAdmin
      .from("stripe_webhook_events")
      .update({
        action: result.action,
        ok: result.ok,
        note: `[REPROCESSED ${stamp}] ${result.note}`,
        received_at: stamp,
      })
      .eq("id", row.id);
    if (updErr) throw new Error(updErr.message);

    return result;
  });
