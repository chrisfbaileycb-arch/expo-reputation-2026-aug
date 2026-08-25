/**
 * Shared ingestion helper used by polled sources (SerpApi/Yelp, GBP, Apify/Facebook).
 *
 * Given a normalized review payload, this:
 *   1. inserts the review (dedup via (platform, location_id, source_review_id))
 *   2. runs the AI policy scanner → policy_violations rows
 *   3. drafts a reply (skipped when a violation was flagged)
 *   4. inserts a response_drafts row with the right status
 *
 * Server-only. Accepts a service-role SupabaseClient so it can be called
 * from cron routes that have no user session.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Platform = "google" | "yelp" | "facebook" | "manual" | "other";

export interface IngestPayload {
  organization_id: string;
  location_id: string;
  platform: Platform;
  source_review_id: string | null;
  author_name: string | null;
  rating: number | null;
  body: string;
  posted_at: string | null;
  source_url: string | null;
}

export interface IngestSummary {
  inserted: number;
  skipped_duplicate: number;
  flagged: number;
  drafted: number;
  errors: string[];
}

interface Violation {
  policy_code: string;
  policy_title: string;
  policy_url?: string | null;
  severity: "low" | "medium" | "high" | "critical";
  ai_rationale: string;
  confidence: number;
}

const AI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MODEL = "gemini-3-flash-preview";

const SCANNER_SYSTEM = `You are a strict content policy reviewer for online reviews on Google, Yelp, and Facebook.
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

const DRAFT_SYSTEM = `You write public review replies for a business owner. Follow the brand voice exactly.
Rules:
- 2–4 sentences. No emojis unless brand voice says otherwise.
- Address the reviewer by first name only if provided.
- For 4–5 star: thank specifically, reference one detail from the review.
- For 1–3 star: acknowledge, apologize, invite them to a private channel. Never admit legal fault. Never offer refunds/compensation in writing.
- Never include the platform name, never mention competitors, never include URLs.
Return ONLY the reply text, no quotes, no preamble.`;

async function scanReview(apiKey: string, body: string, platform: string): Promise<Violation[]> {
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SCANNER_SYSTEM },
        { role: "user", content: `Platform: ${platform}\nReview:\n"""${body}"""` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI scan ${res.status}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  let parsed: { violations?: Violation[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }
  return (Array.isArray(parsed.violations) ? parsed.violations : [])
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

async function draftReply(args: {
  apiKey: string;
  brandVoice: string;
  signature: string | null;
  review: { author_name: string | null; rating: number | null; body: string; platform: string };
}): Promise<string> {
  const usr = `Brand voice:\n${args.brandVoice}\n\nReview (${args.review.platform}, ${args.review.rating ?? "?"}★, by ${args.review.author_name ?? "Anonymous"}):\n"""${args.review.body}"""`;
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${args.apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: DRAFT_SYSTEM },
        { role: "user", content: usr },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI draft ${res.status}`);
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  let body = (j.choices?.[0]?.message?.content ?? "").trim();
  if (args.signature) body = `${body}\n\n— ${args.signature}`;
  return body.slice(0, 4000);
}

export async function ingestPolledReviews(
  admin: SupabaseClient<Database>,
  apiKey: string,
  payloads: IngestPayload[],
): Promise<IngestSummary> {
  const summary: IngestSummary = {
    inserted: 0,
    skipped_duplicate: 0,
    flagged: 0,
    drafted: 0,
    errors: [],
  };
  if (payloads.length === 0) return summary;

  // Cache per-org response policy
  const policyCache = new Map<
    string,
    {
      brandVoice: string;
      signature: string | null;
      autoMin: number;
      delay: number;
      enabled: boolean;
    }
  >();
  async function getPolicy(orgId: string) {
    const cached = policyCache.get(orgId);
    if (cached) return cached;
    const { data } = await admin
      .from("response_policies")
      .select("brand_voice, signature, auto_post_min_rating, auto_post_delay_minutes, enabled")
      .eq("organization_id", orgId)
      .maybeSingle();
    const p = {
      brandVoice:
        data?.brand_voice ??
        "Warm, professional, concise. Thank the reviewer by first name when given. Never argue.",
      signature: data?.signature ?? null,
      autoMin: data?.auto_post_min_rating ?? 4,
      delay: data?.auto_post_delay_minutes ?? 15,
      enabled: data?.enabled ?? true,
    };
    policyCache.set(orgId, p);
    return p;
  }

  for (const p of payloads) {
    // Pre-check dedup so we can count skips cleanly (unique index also enforces this)
    if (p.source_review_id) {
      const { data: existing } = await admin
        .from("reviews")
        .select("id")
        .eq("platform", p.platform)
        .eq("location_id", p.location_id)
        .eq("source_review_id", p.source_review_id)
        .maybeSingle();
      if (existing) {
        summary.skipped_duplicate++;
        continue;
      }
    }

    const { data: review, error: revErr } = await admin
      .from("reviews")
      .insert({
        organization_id: p.organization_id,
        location_id: p.location_id,
        platform: p.platform,
        author_name: p.author_name,
        rating: p.rating,
        body: p.body,
        posted_at: p.posted_at ?? new Date().toISOString(),
        source_url: p.source_url,
        source_review_id: p.source_review_id,
        status: "new",
      })
      .select("id")
      .single();
    if (revErr || !review) {
      // Unique-index race: treat as duplicate, not error
      if (revErr?.code === "23505") summary.skipped_duplicate++;
      else summary.errors.push(revErr?.message ?? "insert failed");
      continue;
    }
    summary.inserted++;

    let hasViolation = false;
    try {
      const violations = await scanReview(apiKey, p.body, p.platform);
      if (violations.length) {
        hasViolation = true;
        const rows = violations.map((v) => ({
          review_id: review.id,
          organization_id: p.organization_id,
          platform: p.platform,
          policy_code: v.policy_code,
          policy_title: v.policy_title,
          policy_url: v.policy_url,
          severity: v.severity,
          ai_rationale: v.ai_rationale,
          confidence: v.confidence,
        }));
        const { error: vErr } = await admin.from("policy_violations").insert(rows);
        if (vErr) summary.errors.push(`violations: ${vErr.message}`);
        else summary.flagged += rows.length;
      }
    } catch (e) {
      summary.errors.push(`scan: ${(e as Error).message}`);
    }

    if (hasViolation) continue;

    try {
      const policy = await getPolicy(p.organization_id);
      const draftBody = await draftReply({
        apiKey,
        brandVoice: policy.brandVoice,
        signature: policy.signature,
        review: {
          author_name: p.author_name,
          rating: p.rating,
          body: p.body,
          platform: p.platform,
        },
      });
      const isYelp = p.platform === "yelp";
      const rating = p.rating ?? 0;
      const autoEligible = policy.enabled && !isYelp && rating >= policy.autoMin;
      const status = isYelp ? "copy_for_yelp" : autoEligible ? "auto_approved" : "pending_approval";
      const scheduled = autoEligible
        ? new Date(Date.now() + policy.delay * 60_000).toISOString()
        : null;
      const { error: dErr } = await admin.from("response_drafts").insert({
        review_id: review.id,
        organization_id: p.organization_id,
        platform: p.platform,
        draft_body: draftBody,
        status,
        scheduled_post_at: scheduled,
        model_used: MODEL,
      });
      if (dErr) summary.errors.push(`draft: ${dErr.message}`);
      else summary.drafted++;
    } catch (e) {
      summary.errors.push(`draft: ${(e as Error).message}`);
    }
  }

  return summary;
}
