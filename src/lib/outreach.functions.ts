import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EnqueueInput = z.object({
  organization_id: z.string().uuid(),
  location_id: z.string().uuid().nullable().optional(),
  contact_ids: z.array(z.string().uuid()).min(1).max(500),
  discount_token: z.string().optional().default("10% Off Next Meal"),
  business_model: z.enum(["restaurant", "appointment"]).optional().default("restaurant"),
});

/**
 * Queue invite emails for a batch of contacts.
 * Creates one `outreach_messages` row per eligible contact with a fresh token
 * and status='pending'. The cron picks them up on the next tick.
 */
export const enqueueInvites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.infer<typeof EnqueueInput>) => EnqueueInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { newOutreachToken } = await import("@/lib/outreach.server");

    // Verify caller belongs to the org (RLS enforces, but be explicit).
    const { data: rows, error } = await supabase
      .from("customer_contacts")
      .select("id, email, unsubscribed_at")
      .eq("organization_id", data.organization_id)
      .in("id", data.contact_ids);
    if (error) throw new Error(error.message);

    const eligible = (rows ?? []).filter((r) => r.email && !r.unsubscribed_at);
    if (eligible.length === 0) return { queued: 0, skipped: data.contact_ids.length };

    const now = new Date().toISOString();
    const inserts = eligible.map((c) => ({
      organization_id: data.organization_id,
      location_id: data.location_id ?? null,
      contact_id: c.id,
      kind: "invite",
      channel: "email",
      status: "pending",
      token: newOutreachToken(),
      scheduled_for: now,
    }));

    const { error: insErr, data: inserted } = await supabase
      .from("outreach_messages")
      .insert(inserts)
      .select("id");
    if (insErr) throw new Error(insErr.message);

    return {
      queued: inserted?.length ?? 0,
      skipped: data.contact_ids.length - eligible.length,
    };
  });
