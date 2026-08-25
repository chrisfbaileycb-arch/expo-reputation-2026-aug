import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { scanTosCompliance, type TosPlatform } from "./tos";
import { deterministicDraft } from "./draftFallback";

const GenerateInput = z.object({ review_id: z.string().uuid() });
const ApproveInput = z.object({
  draft_id: z.string().uuid(),
  edited_body: z.string().trim().min(1).max(4000).optional(),
});
const RejectInput = z.object({
  draft_id: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});

async function draftWithAi(args: {
  apiKey: string;
  brandVoice: string;
  signature: string | null;
  review: { author_name: string | null; rating: number | null; body: string; platform: string };
}): Promise<string> {
  const sys = `You write public review replies for a business owner. Follow the brand voice exactly.
Rules:
- 2–4 sentences. No emojis unless brand voice says otherwise.
- Address the reviewer by first name only if provided.
- For 4–5 star: thank specifically, reference one detail from the review.
- For 1–3 star: acknowledge the experience, apologize, invite them to a private channel ("please reach us at [contact]"). Never admit legal fault. Never offer refunds/compensation in writing.
- Never include the platform name, never mention competitors, never include URLs.
Return ONLY the reply text, no quotes, no preamble.`;
  const usr = `Brand voice:\n${args.brandVoice}\n\nReview (${args.review.platform}, ${args.review.rating ?? "?"}★, by ${args.review.author_name ?? "Anonymous"}):\n"""${args.review.body}"""`;

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${args.apiKey}` },
      body: JSON.stringify({
        model: "gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: usr },
        ],
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini API ${res.status}: ${await res.text().catch(() => "")}`);
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  let body = (j.choices?.[0]?.message?.content ?? "").trim();
  if (args.signature) body = `${body}\n\n— ${args.signature}`;
  return body.slice(0, 4000);
}

/**
 * Generate (or regenerate) a draft reply for a review.
 * Auto-approves and schedules a post for ratings >= policy.auto_post_min_rating,
 * otherwise marks it pending_approval. Yelp always goes to copy_for_yelp.
 */
export const generateDraftForReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => GenerateInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    const { data: review, error: revErr } = await supabase
      .from("reviews")
      .select("id, organization_id, author_name, rating, body, platform")
      .eq("id", data.review_id)
      .maybeSingle();
    if (revErr) throw new Error(revErr.message);
    if (!review || !review.body) throw new Error("Review not found");

    const { data: policy } = await supabase
      .from("response_policies")
      .select("*")
      .eq("organization_id", review.organization_id)
      .maybeSingle();

    const brandVoice =
      policy?.brand_voice ??
      "Warm, professional, concise. Thank the reviewer by first name when given. Never argue.";
    const signature = policy?.signature ?? null;
    const autoMin = policy?.auto_post_min_rating ?? 4;
    const delay = policy?.auto_post_delay_minutes ?? 15;
    const enabled = policy?.enabled ?? true;

    let body: string;
    let modelUsed = "gemini-3-flash-preview";
    try {
      body = await draftWithAi({
        apiKey,
        brandVoice,
        signature,
        review: {
          author_name: review.author_name,
          rating: review.rating,
          body: review.body,
          platform: review.platform,
        },
      });
    } catch (err) {
      // Gemini API down / quota — fall back to the deterministic template
      // ported from expo-proxy so we never have a "couldn't generate" dead state.
      console.warn("[generateDraftForReview] AI fallback:", (err as Error).message);
      body = deterministicDraft({
        authorName: review.author_name,
        rating: review.rating,
        body: review.body,
        contactEmail: null,
      });

      if (signature) body = `${body}\n\n— ${signature}`;
      modelUsed = "deterministic-fallback";
    }

    // Run the ported TOS scanner on every draft before it routes.
    // Any violation forces operator approval so a human signs off.
    const platformForTos: TosPlatform =
      review.platform === "google" || review.platform === "yelp" || review.platform === "facebook"
        ? review.platform
        : "google";
    const tos = scanTosCompliance(body, platformForTos);

    const isYelp = review.platform === "yelp";
    const rating = review.rating ?? 0;
    const autoEligible = enabled && tos.ok && !isYelp && rating >= autoMin;

    const status = isYelp ? "copy_for_yelp" : autoEligible ? "auto_approved" : "pending_approval";
    const scheduled = autoEligible ? new Date(Date.now() + delay * 60_000).toISOString() : null;

    const { data: draft, error: dErr } = await supabase
      .from("response_drafts")
      .insert({
        review_id: review.id,
        organization_id: review.organization_id,
        platform: review.platform,
        draft_body: body,
        status,
        scheduled_post_at: scheduled,
        model_used: modelUsed,
      })
      .select("id, status, scheduled_post_at")
      .single();
    if (dErr) throw new Error(dErr.message);
    return { ...draft, tos };
  });

export const approveDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ApproveInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: existing, error: fetchErr } = await context.supabase
      .from("response_drafts")
      .select("draft_body, platform")
      .eq("id", data.draft_id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!existing) throw new Error("Draft not found");

    const finalBody = data.edited_body ?? existing.draft_body;
    const platformForTos: TosPlatform =
      existing.platform === "google" ||
      existing.platform === "yelp" ||
      existing.platform === "facebook"
        ? (existing.platform as TosPlatform)
        : "google";
    const tos = scanTosCompliance(finalBody, platformForTos);
    if (!tos.ok) {
      throw new Error(
        `TOS violations — fix before approving: ${tos.violations.map((v) => v.detail).join(" | ")}`,
      );
    }

    const patch: { status: "approved"; draft_body?: string } = { status: "approved" };
    if (data.edited_body) patch.draft_body = data.edited_body;
    const { error } = await context.supabase
      .from("response_drafts")
      .update(patch)
      .eq("id", data.draft_id);
    if (error) throw new Error(error.message);
    return { ok: true, tos };
  });

export const rejectDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => RejectInput.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("response_drafts")
      .update({ status: "rejected", rejection_reason: data.reason ?? null })
      .eq("id", data.draft_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Mark a draft as posted. For Google/Facebook this will later be called by the
 * auto-poster job after OAuth integration ships; for Yelp the operator clicks
 * "Copied & opened Yelp" to mark it manually.
 */
export const markDraftPosted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ draft_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("response_drafts")
      .update({
        status: "posted",
        posted_at: new Date().toISOString(),
        posted_by: context.userId,
      })
      .eq("id", data.draft_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
