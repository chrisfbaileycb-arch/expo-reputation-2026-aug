/**
 * Google OAuth callback. Google redirects the user's browser here with ?code & ?state
 * after they grant consent. We exchange the code for tokens, persist them via the
 * service-role client, then bounce back to /dashboard/connections.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/gbp/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const errorParam = url.searchParams.get("error");

        const origin = `${url.protocol}//${url.host}`;
        const fallback = `${origin}/dashboard/connections`;

        const bounce = (status: "ok" | "error", detail?: string) => {
          const target = new URL(fallback);
          target.searchParams.set("gbp", status);
          if (detail) target.searchParams.set("reason", detail);
          return Response.redirect(target.toString(), 303);
        };

        if (errorParam) return bounce("error", errorParam);
        if (!code || !state) return bounce("error", "missing_code_or_state");

        try {
          const { adminClient, exchangeCodeForTokens, fetchGoogleEmail, gbpRedirectUri } =
            await import("@/lib/gbp.server");

          const clientId = process.env.GBP_CLIENT_ID;
          const clientSecret = process.env.GBP_CLIENT_SECRET;
          if (!clientId || !clientSecret) return bounce("error", "server_misconfigured");

          const admin = adminClient();

          // Validate + consume state
          const { data: stateRow, error: stateErr } = await admin
            .from("gbp_oauth_states")
            .select("organization_id, user_id, redirect_to, expires_at")
            .eq("state", state)
            .maybeSingle();
          if (stateErr || !stateRow) return bounce("error", "invalid_state");
          if (new Date(stateRow.expires_at).getTime() < Date.now()) {
            await admin.from("gbp_oauth_states").delete().eq("state", state);
            return bounce("error", "state_expired");
          }
          await admin.from("gbp_oauth_states").delete().eq("state", state);

          // Exchange
          const tokens = await exchangeCodeForTokens({
            code,
            clientId,
            clientSecret,
            redirectUri: gbpRedirectUri(origin),
          });
          if (!tokens.refresh_token) {
            return bounce("error", "no_refresh_token_revoke_and_retry");
          }

          const email = (await fetchGoogleEmail(tokens.access_token)) ?? "unknown@google";
          const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

          // Upsert per (org, email)
          const { error: upsertErr } = await admin.from("gbp_connections").upsert(
            {
              organization_id: stateRow.organization_id,
              google_email: email,
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              token_expires_at: expiresAt,
              scopes: tokens.scope,
              status: "active" as const,
              last_error: null,
              connected_by: stateRow.user_id,
            },
            { onConflict: "organization_id,google_email" },
          );
          if (upsertErr) return bounce("error", upsertErr.message.slice(0, 80));

          const dest = stateRow.redirect_to ?? fallback;
          const target = new URL(dest);
          target.searchParams.set("gbp", "ok");
          target.searchParams.set("email", email);
          return Response.redirect(target.toString(), 303);
        } catch (err) {
          return bounce("error", (err as Error).message.slice(0, 80));
        }
      },
    },
  },
});
