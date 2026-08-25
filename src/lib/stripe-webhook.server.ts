/**
 * Stripe webhook event processor.
 *
 * Server-only. Handles `customer.subscription.updated` by writing a
 * trace into `stripe_readiness` (last event time + appended notes) and
 * flagging when an early-termination invoice would be generated under
 * the Option B 12-month term enforcement.
 *
 * Used by:
 *   - /api/public/webhooks/stripe (real Stripe deliveries)
 *   - simulateSubscriptionEvent server fn (test mode)
 */

export type StripeSubscriptionEvent = {
  id?: string;
  type: string;
  livemode?: boolean;
  data: {
    object: {
      id?: string;
      customer?: string;
      cancel_at_period_end?: boolean;
      current_period_end?: number;
      status?: string;
      metadata?: { organization_id?: string; contract_ends_at?: string } & Record<string, string>;
    };
  };
};

export type ProcessResult = {
  ok: boolean;
  event_type: string;
  organization_id: string | null;
  action: "noop" | "logged" | "early_termination_flagged";
  note: string;
  simulated: boolean;
};

const NOTE_CAP = 4000;

export async function processStripeEvent(
  event: StripeSubscriptionEvent,
  opts: { simulated?: boolean; skipHistoryInsert?: boolean } = {},
): Promise<ProcessResult> {
  const simulated = !!opts.simulated;

  const obj = event.data?.object ?? {};
  const orgId = obj.metadata?.organization_id ?? null;

  // We only act on subscription.updated for now (matches the term enforcement spec).
  if (event.type !== "customer.subscription.updated") {
    return {
      ok: true,
      event_type: event.type,
      organization_id: orgId,
      action: "noop",
      note: `Ignored event type ${event.type}`,
      simulated,
    };
  }

  if (!orgId) {
    return {
      ok: false,
      event_type: event.type,
      organization_id: null,
      action: "noop",
      note: "Event missing metadata.organization_id — cannot route to a readiness row.",
      simulated,
    };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: existing } = await supabaseAdmin
    .from("stripe_readiness")
    .select("webhook_notes, webhook_enforcement_active")
    .eq("organization_id", orgId)
    .maybeSingle();

  const cancelling = obj.cancel_at_period_end === true;
  const contractEndsAt = obj.metadata?.contract_ends_at ?? null;
  const wouldEnforce =
    cancelling && contractEndsAt && new Date(contractEndsAt).getTime() > Date.now();

  const action: ProcessResult["action"] = wouldEnforce ? "early_termination_flagged" : "logged";

  const stamp = new Date().toISOString();
  const tag = simulated ? "[TEST]" : "[LIVE]";
  const line = `${stamp} ${tag} ${event.type} sub=${obj.id ?? "?"} cancel_at_period_end=${cancelling} contract_ends_at=${contractEndsAt ?? "n/a"} → ${action}`;

  const merged = [line, existing?.webhook_notes ?? ""]
    .filter(Boolean)
    .join("\n")
    .slice(0, NOTE_CAP);

  const { error } = await supabaseAdmin.from("stripe_readiness").upsert(
    {
      organization_id: orgId,
      webhook_last_event_at: stamp,
      webhook_notes: merged,
      // Real deliveries imply the endpoint is live; test mode does not.
      webhook_enforcement_active: simulated
        ? (existing?.webhook_enforcement_active ?? false)
        : true,
    },
    { onConflict: "organization_id" },
  );

  if (error) {
    return {
      ok: false,
      event_type: event.type,
      organization_id: orgId,
      action,
      note: `DB write failed: ${error.message}`,
      simulated,
    };
  }

  // Append to event history (best-effort; don't fail the handler if this errors).
  const truncatedPayload = JSON.stringify(event).slice(0, 8000);
  if (!opts.skipHistoryInsert) {
    await supabaseAdmin.from("stripe_webhook_events").insert({
      organization_id: orgId,
      event_id: event.id ?? null,
      event_type: event.type,
      simulated,
      livemode: event.livemode ?? null,
      action,
      ok: true,
      note: line,
      subscription_id: obj.id ?? null,
      cancel_at_period_end: cancelling,
      contract_ends_at: contractEndsAt,
      payload: JSON.parse(truncatedPayload),
      received_at: stamp,
    });
  }

  return {
    ok: true,
    event_type: event.type,
    organization_id: orgId,
    action,
    note: line,
    simulated,
  };
}
