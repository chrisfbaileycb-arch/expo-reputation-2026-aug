/**
 * CSV export of posting attempts for an organization.
 *
 * Auth: requires a signed-in Supabase user (Authorization: Bearer <jwt>).
 * The query runs through an RLS-scoped client so only owners/admins of the
 * org will get rows back — others get an empty CSV.
 *
 * NOT under /api/public — this is a privileged admin endpoint.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const Route = createFileRoute("/api/posting-attempts/csv")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = request.headers.get("authorization");
        if (!auth?.startsWith("Bearer ")) {
          return new Response("unauthorized", { status: 401 });
        }
        const orgId = new URL(request.url).searchParams.get("organization_id");
        if (!orgId) return new Response("organization_id required", { status: 400 });

        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          {
            global: { headers: { Authorization: auth } },
            auth: { persistSession: false, autoRefreshToken: false },
          },
        );

        const { data, error } = await supabase
          .from("posting_attempts")
          .select(
            "created_at, platform, endpoint, http_status, success, attempt_number, duration_ms, platform_response_id, error_message, response_snippet, draft_id, review_id, location_id",
          )
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(5000);

        if (error) {
          return new Response(`error: ${error.message}`, { status: 500 });
        }

        const headers = [
          "created_at",
          "platform",
          "endpoint",
          "http_status",
          "success",
          "attempt_number",
          "duration_ms",
          "platform_response_id",
          "error_message",
          "response_snippet",
          "draft_id",
          "review_id",
          "location_id",
        ];
        const lines = [headers.join(",")];
        for (const r of data ?? []) {
          lines.push(headers.map((h) => csvEscape((r as Record<string, unknown>)[h])).join(","));
        }
        const body = lines.join("\n");

        return new Response(body, {
          headers: {
            "content-type": "text/csv; charset=utf-8",
            "content-disposition": `attachment; filename="posting-attempts-${new Date().toISOString().slice(0, 10)}.csv"`,
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
