import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TokenInput = z.object({ token: z.string().min(8).max(128) });

const SubmitInput = z.object({
  token: z.string().min(8).max(128),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().nullable(),
});

async function loadContext(token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: msg, error } = await supabaseAdmin
    .from("outreach_messages")
    .select("id, organization_id, location_id, contact_id, kind, status")
    .eq("token", token)
    .maybeSingle();
  if (error || !msg) throw new Error("Invalid or expired link");

  const [{ data: loc }, { data: contact }, { data: org }] = await Promise.all([
    msg.location_id
      ? supabaseAdmin
          .from("locations")
          .select("id, name, google_place_id, yelp_business_id, facebook_page_id")
          .eq("id", msg.location_id)
          .maybeSingle()
      : Promise.resolve({ data: null } as const),
    msg.contact_id
      ? supabaseAdmin
          .from("customer_contacts")
          .select("id, full_name")
          .eq("id", msg.contact_id)
          .maybeSingle()
      : Promise.resolve({ data: null } as const),
    supabaseAdmin
      .from("organizations")
      .select("id, name")
      .eq("id", msg.organization_id)
      .maybeSingle(),
  ]);

  return { supabaseAdmin, msg, loc, contact, org };
}

function googleReviewUrl(placeId: string | null | undefined) {
  return placeId
    ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`
    : null;
}

export const getOutreachByToken = createServerFn({ method: "GET" })
  .inputValidator((data: z.infer<typeof TokenInput>) => TokenInput.parse(data))
  .handler(async ({ data }) => {
    const { msg, loc, contact, org } = await loadContext(data.token);
    return {
      alreadySubmitted: msg.status === "completed",
      location_name: loc?.name ?? org?.name ?? "our team",
      organization_name: org?.name ?? "",
      contact_first_name: (contact?.full_name ?? "").split(" ")[0] || "",
    };
  });

export const submitFeedback = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof SubmitInput>) => SubmitInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin, msg, loc } = await loadContext(data.token);

    const isPromoter = data.rating >= 4;
    const routed_to = isPromoter ? "elevation" : "interception";

    const { data: fb, error: fbErr } = await supabaseAdmin
      .from("feedback_submissions")
      .insert({
        organization_id: msg.organization_id,
        location_id: msg.location_id,
        contact_id: msg.contact_id,
        outreach_message_id: msg.id,
        rating: data.rating,
        comment: data.comment ?? null,
        routed_to,
        clicked_public_link: false,
      })
      .select("id")
      .single();
    if (fbErr) throw new Error(fbErr.message);

    // Mark outreach message as completed so link isn't reused
    await supabaseAdmin.from("outreach_messages").update({ status: "completed" }).eq("id", msg.id);

    // 1-3★: create manager action item due next morning 8am local
    if (!isPromoter) {
      const due = new Date();
      due.setUTCDate(due.getUTCDate() + 1);
      due.setUTCHours(13, 0, 0, 0); // ~8am ET; timezone-aware digest tightens this later
      await supabaseAdmin.from("manager_action_items").insert({
        organization_id: msg.organization_id,
        location_id: msg.location_id,
        feedback_id: fb.id,
        contact_id: msg.contact_id,
        status: "open",
        due_at: due.toISOString(),
      });
    } else {
      // 4-5★: Queue Stage 2 Follow-Up Outreach for +24 hours later with Google Review Link & Discount Token
      const in24h = new Date();
      in24h.setHours(in24h.getHours() + 24);
      const { newOutreachToken } = await import("@/lib/outreach.server");

      await supabaseAdmin.from("outreach_messages").insert({
        organization_id: msg.organization_id,
        location_id: msg.location_id,
        contact_id: msg.contact_id,
        kind: "stage2_discount_google",
        channel: "email",
        status: "pending",
        token: newOutreachToken(),
        scheduled_for: in24h.toISOString(),
      });
    }

    return {
      routed_to,
      review_url: isPromoter ? googleReviewUrl(loc?.google_place_id) : null,
      location_name: loc?.name ?? "our team",
      discount_token: isPromoter ? "10% Off Next Meal / Visit" : null,
      discount_code: isPromoter ? "THANKYOU10" : null,
    };
  });

export const markPublicLinkClicked = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof TokenInput>) => TokenInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: msg } = await supabaseAdmin
      .from("outreach_messages")
      .select("id")
      .eq("token", data.token)
      .maybeSingle();
    if (!msg) return { ok: false };
    await supabaseAdmin
      .from("feedback_submissions")
      .update({ clicked_public_link: true })
      .eq("outreach_message_id", msg.id);
    return { ok: true };
  });
