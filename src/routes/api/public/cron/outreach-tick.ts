/**
 * Outreach tick cron.
 *
 * Two responsibilities per run:
 *   1. Send any `outreach_messages` rows that are pending and scheduled_for <= now.
 *   2. For each 4–5★ feedback submission from the last 48h whose contact hasn't
 *      clicked the public review link, enqueue a one-time 24h elevation nudge.
 *
 * Both are idempotent: sent rows flip to status='sent' with provider_message_id;
 * the nudge dedupes on (contact_id, kind='elevation_nudge').
 *
 * Auth: `/api/public/*` bypasses platform auth. We gate on the anon apikey
 * header (matches post-drafts.ts).
 */
import { createFileRoute } from "@tanstack/react-router";

const MAX_SENDS_PER_RUN = 50;

export const Route = createFileRoute("/api/public/cron/outreach-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!expected || apiKey !== expected) {
          return new Response("unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendEmail, publicBaseUrl, newOutreachToken } =
          await import("@/lib/outreach.server");
        const { renderInviteHtml, renderInviteText, renderInviteSubject } =
          await import("@/lib/email-templates/invite");
        const { renderNudgeHtml, renderNudgeText, renderNudgeSubject } =
          await import("@/lib/email-templates/elevation-nudge");

        const base = publicBaseUrl();
        const now = new Date();
        const nowIso = now.toISOString();
        const summary = {
          sent: 0,
          send_failed: 0,
          nudges_queued: 0,
        };

        // ---------- Step A: schedule 24h elevation nudges ----------
        const cutoff = new Date(now.getTime() - 48 * 3600 * 1000).toISOString();
        const eligibleAfter = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();

        const { data: promoters } = await supabaseAdmin
          .from("feedback_submissions")
          .select(
            "id, organization_id, location_id, contact_id, rating, clicked_public_link, created_at",
          )
          .gte("rating", 4)
          .eq("clicked_public_link", false)
          .not("contact_id", "is", null)
          .lte("created_at", eligibleAfter)
          .gte("created_at", cutoff)
          .limit(100);

        for (const fb of promoters ?? []) {
          if (!fb.contact_id) continue;

          const { data: dup } = await supabaseAdmin
            .from("outreach_messages")
            .select("id")
            .eq("contact_id", fb.contact_id)
            .eq("kind", "elevation_nudge")
            .maybeSingle();
          if (dup) continue;

          const { error: nudgeErr } = await supabaseAdmin.from("outreach_messages").insert({
            organization_id: fb.organization_id,
            location_id: fb.location_id,
            contact_id: fb.contact_id,
            kind: "elevation_nudge",
            channel: "email",
            status: "pending",
            token: newOutreachToken(),
            scheduled_for: nowIso,
          });
          if (!nudgeErr) summary.nudges_queued += 1;
        }

        // ---------- Step B: drain pending sends ----------
        const { data: pending, error: pendErr } = await supabaseAdmin
          .from("outreach_messages")
          .select("id, kind, contact_id, location_id, organization_id, token, scheduled_for")
          .eq("status", "pending")
          .eq("channel", "email")
          .lte("scheduled_for", nowIso)
          .order("scheduled_for", { ascending: true })
          .limit(MAX_SENDS_PER_RUN);
        if (pendErr) {
          return Response.json({ ok: false, error: pendErr.message }, { status: 500 });
        }

        for (const msg of pending ?? []) {
          const [{ data: contact }, { data: loc }, { data: org }] = await Promise.all([
            supabaseAdmin
              .from("customer_contacts")
              .select("email, full_name, unsubscribed_at")
              .eq("id", msg.contact_id)
              .maybeSingle(),
            msg.location_id
              ? supabaseAdmin
                  .from("locations")
                  .select("name, google_place_id")
                  .eq("id", msg.location_id)
                  .maybeSingle()
              : Promise.resolve({ data: null } as const),
            supabaseAdmin
              .from("organizations")
              .select("name")
              .eq("id", msg.organization_id)
              .maybeSingle(),
          ]);

          if (!contact?.email || contact.unsubscribed_at) {
            await supabaseAdmin
              .from("outreach_messages")
              .update({ status: "skipped", error: "no_email_or_unsubscribed" })
              .eq("id", msg.id);
            continue;
          }

          const first = (contact.full_name ?? "").split(" ")[0] || null;
          const locationName = loc?.name ?? org?.name ?? "our team";
          const feedbackUrl = `${base}/r/${msg.token}`;

          let subject: string;
          let html: string;
          let text: string;
          if (msg.kind === "elevation_nudge") {
            const reviewUrl = loc?.google_place_id
              ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(
                  loc.google_place_id,
                )}`
              : feedbackUrl;
            const p = {
              contact_first_name: first,
              location_name: locationName,
              review_url: reviewUrl,
            };
            subject = renderNudgeSubject(p);
            html = renderNudgeHtml(p);
            text = renderNudgeText(p);
          } else {
            const p = {
              contact_first_name: first,
              location_name: locationName,
              feedback_url: feedbackUrl,
            };
            subject = renderInviteSubject(p);
            html = renderInviteHtml(p);
            text = renderInviteText(p);
          }

          const result = await sendEmail({ to: contact.email, subject, html, text });
          if (result.ok) {
            await supabaseAdmin
              .from("outreach_messages")
              .update({
                status: "sent",
                sent_at: new Date().toISOString(),
                provider_message_id: result.provider_message_id,
                error: null,
              })
              .eq("id", msg.id);
            await supabaseAdmin
              .from("customer_contacts")
              .update({ last_outreach_at: new Date().toISOString() })
              .eq("id", msg.contact_id);
            summary.sent += 1;
          } else {
            await supabaseAdmin
              .from("outreach_messages")
              .update({ status: "failed", error: result.error ?? "send_failed" })
              .eq("id", msg.id);
            summary.send_failed += 1;
          }
        }

        return Response.json({ ok: true, ...summary });
      },
    },
  },
});
