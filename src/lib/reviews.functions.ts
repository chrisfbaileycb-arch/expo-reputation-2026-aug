import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ReviewInput = z.object({
  author_name: z.string().trim().max(200).optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  body: z.string().trim().min(1).max(5000),
  platform: z.enum(["google", "yelp", "facebook", "manual", "other"]).default("manual"),
  posted_at: z.string().optional().nullable(),
  source_url: z.string().url().max(2000).optional().nullable(),
});

const IngestInput = z.object({
  location_id: z.string().uuid(),
  reviews: z.array(ReviewInput).min(1).max(50),
});

type Violation = {
  policy_code: string;
  policy_title: string;
  policy_url?: string | null;
  severity: "low" | "medium" | "high" | "critical";
  ai_rationale: string;
  confidence: number;
};

async function scanReviewWithAi(
  body: string,
  platform: string,
  apiKey: string,
): Promise<Violation[]> {
  const system = `You are a strict content policy reviewer for online reviews on Google, Yelp, and Facebook.
Identify violations of the platform's published review policies. Common categories:
- off_topic: not about a genuine customer experience
- conflict_of_interest: competitor, former employee, or owner
- fake_or_unverified: clearly fabricated, mass-posted, or bot
- hate_or_harassment: slurs, threats, discrimination
- personal_info: names of non-public employees, addresses, phone numbers
- profanity_obscenity: gratuitous obscenity targeting people
- promotional_or_spam: promoting another business/link
- illegal_or_dangerous: illegal activity, regulated goods misuse

Return STRICT JSON: {"violations":[{"policy_code","policy_title","policy_url","severity","ai_rationale","confidence"}]}.
severity in: low, medium, high, critical. confidence is 0..1. If no violation, return {"violations":[]}.
Do NOT invent violations. Be conservative — only flag clear policy issues.`;

  const user = `Platform: ${platform}\nReview:\n"""${body}"""`;

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gemini-3-flash-preview",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini API ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  let parsed: { violations?: Violation[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }
  const list = Array.isArray(parsed.violations) ? parsed.violations : [];
  return list
    .filter((v) => v && typeof v.policy_code === "string" && typeof v.policy_title === "string")
    .map((v) => ({
      policy_code: String(v.policy_code).slice(0, 80),
      policy_title: String(v.policy_title).slice(0, 200),
      policy_url: v.policy_url ? String(v.policy_url).slice(0, 500) : null,
      severity: (["low", "medium", "high", "critical"] as const).includes(v.severity)
        ? v.severity
        : "medium",
      ai_rationale: String(v.ai_rationale ?? "").slice(0, 2000),
      confidence: Math.max(0, Math.min(1, Number(v.confidence ?? 0.5))),
    }));
}

export const ingestReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IngestInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    // Resolve org via location (RLS will reject if not a member)
    const { data: loc, error: locErr } = await supabase
      .from("locations")
      .select("id, organization_id")
      .eq("id", data.location_id)
      .maybeSingle();
    if (locErr) throw new Error(locErr.message);
    if (!loc) throw new Error("Location not found or not accessible");

    // Fetch the org's response policy once (may not exist yet)
    const { data: policy } = await supabase
      .from("response_policies")
      .select("brand_voice, signature, auto_post_min_rating, auto_post_delay_minutes, enabled")
      .eq("organization_id", loc.organization_id)
      .maybeSingle();
    const brandVoice =
      policy?.brand_voice ??
      "Warm, professional, concise. Thank the reviewer by first name when given. Never argue.";
    const signature = policy?.signature ?? null;
    const autoMin = policy?.auto_post_min_rating ?? 4;
    const delay = policy?.auto_post_delay_minutes ?? 15;
    const policyEnabled = policy?.enabled ?? true;

    let inserted = 0;
    let flagged = 0;
    let drafted = 0;
    const errors: string[] = [];

    for (const r of data.reviews) {
      const { data: review, error: revErr } = await supabase
        .from("reviews")
        .insert({
          organization_id: loc.organization_id,
          location_id: loc.id,
          platform: r.platform,
          author_name: r.author_name ?? null,
          rating: r.rating ?? null,
          body: r.body,
          posted_at: r.posted_at ?? new Date().toISOString(),
          source_url: r.source_url ?? null,
          status: "new",
        })
        .select("id")
        .single();
      if (revErr || !review) {
        errors.push(revErr?.message ?? "insert failed");
        continue;
      }
      inserted++;

      let hasViolation = false;
      try {
        const violations = await scanReviewWithAi(r.body, r.platform, apiKey);
        if (violations.length) {
          hasViolation = true;
          const rows = violations.map((v) => ({
            review_id: review.id,
            organization_id: loc.organization_id,
            platform: r.platform,
            policy_code: v.policy_code,
            policy_title: v.policy_title,
            policy_url: v.policy_url,
            severity: v.severity,
            ai_rationale: v.ai_rationale,
            confidence: v.confidence,
          }));
          const { error: vErr } = await supabase.from("policy_violations").insert(rows);
          if (vErr) errors.push(`violations: ${vErr.message}`);
          else flagged += rows.length;
        }
      } catch (e) {
        errors.push(`scan: ${(e as Error).message}`);
      }

      // Skip drafting if this review is heading to the removal queue
      if (hasViolation) continue;

      try {
        const draftBody = await draftReplyWithAi({
          apiKey,
          brandVoice,
          signature,
          review: {
            author_name: r.author_name ?? null,
            rating: r.rating ?? null,
            body: r.body,
            platform: r.platform,
          },
        });
        const isYelp = r.platform === "yelp";
        const rating = r.rating ?? 0;
        const autoEligible = policyEnabled && !isYelp && rating >= autoMin;
        const status = isYelp
          ? "copy_for_yelp"
          : autoEligible
            ? "auto_approved"
            : "pending_approval";
        const scheduled = autoEligible ? new Date(Date.now() + delay * 60_000).toISOString() : null;
        const { error: dErr } = await supabase.from("response_drafts").insert({
          review_id: review.id,
          organization_id: loc.organization_id,
          platform: r.platform,
          draft_body: draftBody,
          status,
          scheduled_post_at: scheduled,
          model_used: "gemini-3-flash-preview",
        });
        if (dErr) errors.push(`draft: ${dErr.message}`);
        else drafted++;
      } catch (e) {
        errors.push(`draft: ${(e as Error).message}`);
      }
    }

    return { inserted, flagged, drafted, errors };
  });

async function draftReplyWithAi(args: {
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
- For 1–3 star: acknowledge, apologize, invite them to a private channel. Never admit legal fault. Never offer refunds/compensation in writing.
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
  if (!res.ok) throw new Error(`Gemini API ${res.status}`);
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  let body = (j.choices?.[0]?.message?.content ?? "").trim();
  if (args.signature) body = `${body}\n\n— ${args.signature}`;
  return body.slice(0, 4000);
}
