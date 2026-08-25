/**
 * Yelp reviews poller — calls SerpApi for every location with a
 * yelp_business_id and ingests new reviews through the shared pipeline
 * (policy scan → draft → response_drafts).
 *
 * Auth: same anon-apikey pattern as the other /api/public/cron/* routes.
 * Scheduled by pg_cron.
 */
import { createFileRoute } from "@tanstack/react-router";

const MAX_LOCATIONS_PER_RUN = 20;
const MIN_INTERVAL_MINUTES = 15; // skip locations polled more recently than this

export const Route = createFileRoute("/api/public/cron/poll-yelp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!expected || apiKey !== expected) {
          return new Response("unauthorized", { status: 401 });
        }

        const serpKey = process.env.SERPAPI_API_KEY;
        const geminiKey = process.env.GEMINI_API_KEY;
        if (!serpKey) {
          return Response.json({ ok: false, error: "SERPAPI_API_KEY not set" }, { status: 500 });
        }
        if (!geminiKey) {
          return Response.json({ ok: false, error: "GEMINI_API_KEY not set" }, { status: 500 });
        }

        const { adminClient } = await import("@/lib/gbp.server");
        const { fetchYelpReviews } = await import("@/lib/serpapi.server");
        const { ingestPolledReviews } = await import("@/lib/ingestion.server");
        const admin = adminClient();

        const cutoff = new Date(Date.now() - MIN_INTERVAL_MINUTES * 60_000).toISOString();
        const { data: locations, error } = await admin
          .from("locations")
          .select("id, organization_id, name, yelp_business_id, yelp_last_polled_at")
          .not("yelp_business_id", "is", null)
          .or(`yelp_last_polled_at.is.null,yelp_last_polled_at.lt.${cutoff}`)
          .order("yelp_last_polled_at", { ascending: true, nullsFirst: true })
          .limit(MAX_LOCATIONS_PER_RUN);

        if (error) {
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }
        if (!locations || locations.length === 0) {
          return Response.json({ ok: true, polled: 0 });
        }

        const perLocation: Array<{
          location_id: string;
          yelp_business_id: string;
          fetched: number;
          inserted: number;
          skipped_duplicate: number;
          flagged: number;
          drafted: number;
          errors: string[];
        }> = [];

        for (const loc of locations) {
          if (!loc.yelp_business_id) continue;
          const result = {
            location_id: loc.id,
            yelp_business_id: loc.yelp_business_id,
            fetched: 0,
            inserted: 0,
            skipped_duplicate: 0,
            flagged: 0,
            drafted: 0,
            errors: [] as string[],
          };
          try {
            const raw = await fetchYelpReviews({
              apiKey: serpKey,
              placeId: loc.yelp_business_id,
              maxPages: 1,
            });
            result.fetched = raw.length;
            if (raw.length > 0) {
              const summary = await ingestPolledReviews(
                admin,
                geminiKey,
                raw.map((r) => ({
                  organization_id: loc.organization_id,
                  location_id: loc.id,
                  platform: "yelp" as const,
                  source_review_id: r.source_review_id,
                  author_name: r.author_name,
                  rating: r.rating,
                  body: r.body,
                  posted_at: r.posted_at,
                  source_url: r.source_url,
                })),
              );
              result.inserted = summary.inserted;
              result.skipped_duplicate = summary.skipped_duplicate;
              result.flagged = summary.flagged;
              result.drafted = summary.drafted;
              result.errors = summary.errors;
            }
          } catch (e) {
            result.errors.push((e as Error).message);
          }

          await admin
            .from("locations")
            .update({ yelp_last_polled_at: new Date().toISOString() })
            .eq("id", loc.id);

          perLocation.push(result);
        }

        const totals = perLocation.reduce(
          (acc, r) => ({
            fetched: acc.fetched + r.fetched,
            inserted: acc.inserted + r.inserted,
            skipped: acc.skipped + r.skipped_duplicate,
            flagged: acc.flagged + r.flagged,
            drafted: acc.drafted + r.drafted,
          }),
          { fetched: 0, inserted: 0, skipped: 0, flagged: 0, drafted: 0 },
        );

        return Response.json({
          ok: true,
          polled: perLocation.length,
          totals,
          per_location: perLocation,
        });
      },
    },
  },
});
