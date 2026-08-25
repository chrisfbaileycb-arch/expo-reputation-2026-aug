/**
 * Auto-poster cron endpoint.
 *
 * Drains response_drafts that are approved/auto_approved, not yet posted,
 * scheduled in the past, under the retry cap, and on a platform we can
 * post to via API (currently 'google'). For each it PUTs the reply via
 * the Google My Business v4 API, then writes a row to posting_attempts.
 *
 * Auth: `/api/public/*` bypasses platform auth, so we gate on the
 * anon `apikey` header — same pattern pg_cron uses everywhere else.
 */
import { createFileRoute } from "@tanstack/react-router";

const MAX_PER_RUN = 25;
const MAX_ATTEMPTS = 5;
const SNIPPET_CAP = 1000;

/** Strip anything that looks like a bearer token / OAuth secret out of logs. */
function redact(input: string): string {
  return input
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/ya29\.[A-Za-z0-9._-]+/g, "[REDACTED_GOOGLE_TOKEN]")
    .replace(/"access_token"\s*:\s*"[^"]+"/g, '"access_token":"[REDACTED]"')
    .replace(/"refresh_token"\s*:\s*"[^"]+"/g, '"refresh_token":"[REDACTED]"')
    .replace(/"id_token"\s*:\s*"[^"]+"/g, '"id_token":"[REDACTED]"')
    .slice(0, SNIPPET_CAP);
}

export const Route = createFileRoute("/api/public/cron/post-drafts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!expected || apiKey !== expected) {
          return new Response("unauthorized", { status: 401 });
        }

        const { adminClient, getValidAccessToken } = await import("@/lib/gbp.server");
        const admin = adminClient();

        const { data: drafts, error } = await admin
          .from("response_drafts")
          .select(
            "id, review_id, organization_id, platform, draft_body, post_attempts, scheduled_post_at",
          )
          .in("status", ["approved", "auto_approved"])
          .is("posted_at", null)
          .eq("platform", "google")
          .lt("post_attempts", MAX_ATTEMPTS)
          .or(`scheduled_post_at.is.null,scheduled_post_at.lte.${new Date().toISOString()}`)
          .order("scheduled_post_at", { ascending: true, nullsFirst: true })
          .limit(MAX_PER_RUN);

        if (error) {
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }
        if (!drafts || drafts.length === 0) {
          return Response.json({ ok: true, processed: 0 });
        }

        const results: Array<{ draft_id: string; ok: boolean; error?: string }> = [];

        for (const d of drafts) {
          const attemptNumber = (d.post_attempts ?? 0) + 1;
          let endpoint: string | null = null;
          let httpStatus: number | null = null;
          let responseSnippet: string | null = null;
          let platformResponseId: string | null = null;
          let errorMessage: string | null = null;
          let locationId: string | null = null;
          let success = false;
          const startedAt = Date.now();

          try {
            const { data: review } = await admin
              .from("reviews")
              .select("id, platform_review_id, location_id")
              .eq("id", d.review_id)
              .maybeSingle();
            if (!review?.platform_review_id) {
              throw new Error("Review has no platform_review_id");
            }
            locationId = review.location_id;

            const { data: loc } = await admin
              .from("locations")
              .select("gbp_connection_id, gbp_account_id, gbp_location_id")
              .eq("id", review.location_id)
              .maybeSingle();
            if (!loc?.gbp_connection_id || !loc.gbp_account_id || !loc.gbp_location_id) {
              throw new Error("Location not linked to a Google Business Profile");
            }

            const accessToken = await getValidAccessToken(loc.gbp_connection_id);
            endpoint = `https://mybusiness.googleapis.com/v4/accounts/${loc.gbp_account_id}/locations/${loc.gbp_location_id}/reviews/${review.platform_review_id}/reply`;

            const res = await fetch(endpoint, {
              method: "PUT",
              headers: {
                authorization: `Bearer ${accessToken}`,
                "content-type": "application/json",
              },
              body: JSON.stringify({ comment: d.draft_body }),
            });
            httpStatus = res.status;
            const text = await res.text();
            responseSnippet = redact(text);
            if (!res.ok) {
              throw new Error(`GBP reply ${res.status}: ${text.slice(0, 300)}`);
            }
            const parsed = JSON.parse(text) as { name?: string };
            platformResponseId = parsed.name ?? null;
            success = true;
          } catch (err) {
            errorMessage = redact((err as Error).message);
          }

          const durationMs = Date.now() - startedAt;

          // Persist log row — never blocks the next draft if it fails.
          await admin.from("posting_attempts").insert({
            organization_id: d.organization_id,
            draft_id: d.id,
            review_id: d.review_id,
            location_id: locationId,
            platform: d.platform,
            endpoint,
            http_status: httpStatus,
            success,
            error_message: errorMessage,
            platform_response_id: platformResponseId,
            attempt_number: attemptNumber,
            duration_ms: durationMs,
            response_snippet: responseSnippet,
          });

          if (success) {
            await admin
              .from("response_drafts")
              .update({
                status: "posted",
                posted_at: new Date().toISOString(),
                platform_response_id: platformResponseId,
                post_attempts: attemptNumber,
                last_post_attempt_at: new Date().toISOString(),
                post_error: null,
              })
              .eq("id", d.id);
            if (d.review_id) {
              await admin.from("reviews").update({ status: "responded" }).eq("id", d.review_id);
            }
            results.push({ draft_id: d.id, ok: true });
          } else {
            const exhausted = attemptNumber >= MAX_ATTEMPTS;
            await admin
              .from("response_drafts")
              .update({
                post_attempts: attemptNumber,
                post_error: errorMessage,
                last_post_attempt_at: new Date().toISOString(),
                ...(exhausted ? { status: "pending_approval" as const } : {}),
              })
              .eq("id", d.id);
            results.push({ draft_id: d.id, ok: false, error: errorMessage ?? "unknown" });
          }
        }

        const okCount = results.filter((r) => r.ok).length;
        return Response.json({
          ok: true,
          processed: results.length,
          posted: okCount,
          failed: results.length - okCount,
          results,
        });
      },
    },
  },
});
