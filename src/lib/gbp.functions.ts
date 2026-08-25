/**
 * Google Business Profile server functions: connect flow, list, link, disconnect.
 * Heavy lifting lives in gbp.server.ts (admin client + token refresh + API calls).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { randomBytes } from "crypto";

const StartConnectInput = z.object({
  organization_id: z.string().uuid(),
  origin: z.string().url(),
});

const ListLocationsInput = z.object({ connection_id: z.string().uuid() });

const LinkInput = z.object({
  location_id: z.string().uuid(),
  connection_id: z.string().uuid(),
  gbp_account_id: z.string().min(1),
  gbp_location_id: z.string().min(1),
});

const DisconnectInput = z.object({ connection_id: z.string().uuid() });

/** Step 1: build the Google authorization URL and persist a CSRF state. */
export const startGbpConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => StartConnectInput.parse(i))
  .handler(async ({ data, context }) => {
    const clientId = process.env.GBP_CLIENT_ID;
    if (!clientId) throw new Error("Missing GBP_CLIENT_ID — add it in project secrets first");

    // Verify caller is a manager/owner of the org
    const { data: allowed, error: roleErr } = await context.supabase.rpc("has_org_role", {
      _user_id: context.userId,
      _org_id: data.organization_id,
      _roles: ["owner", "manager"] as const,
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!allowed) throw new Error("Only org managers can connect Google Business Profile");

    const { buildAuthUrl, gbpRedirectUri, adminClient } = await import("./gbp.server");
    const state = randomBytes(24).toString("base64url");
    const admin = adminClient();
    const { error } = await admin.from("gbp_oauth_states").insert({
      state,
      organization_id: data.organization_id,
      user_id: context.userId,
      redirect_to: `${data.origin}/dashboard/connections`,
    });
    if (error) throw new Error(error.message);

    const url = buildAuthUrl({
      clientId,
      redirectUri: gbpRedirectUri(data.origin),
      state,
    });
    return { url };
  });

/** List GBP connections for an org (token fields stripped at the policy level —
 *  authenticated SELECT returns all columns the role has, so we project safe cols). */
export const listGbpConnections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ organization_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("gbp_connections")
      .select("id, google_email, status, last_error, token_expires_at, scopes, created_at")
      .eq("organization_id", data.organization_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Fetch live accounts + locations from Google for the connection's user. */
export const listGbpAvailableLocations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ListLocationsInput.parse(i))
  .handler(async ({ data, context }) => {
    // RLS check: caller must see the connection
    const { data: conn, error } = await context.supabase
      .from("gbp_connections")
      .select("id, organization_id")
      .eq("id", data.connection_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!conn) throw new Error("Connection not found");

    const { getValidAccessToken, listGbpAccounts, listGbpLocationsForAccount } =
      await import("./gbp.server");
    const accessToken = await getValidAccessToken(data.connection_id);
    const accounts = await listGbpAccounts(accessToken);

    const results: Array<{
      account_id: string;
      account_name: string;
      locations: Array<{ id: string; title: string; address: string | null }>;
    }> = [];
    for (const acct of accounts) {
      const locs = await listGbpLocationsForAccount(accessToken, acct.name);
      results.push({
        account_id: acct.name,
        account_name: acct.accountName ?? acct.name,
        locations: locs.map((l) => {
          const addr = l.storefrontAddress as
            | {
                addressLines?: string[];
                locality?: string;
                administrativeArea?: string;
                postalCode?: string;
              }
            | null
            | undefined;
          const formatted = addr
            ? [
                addr.addressLines?.join(", "),
                addr.locality,
                addr.administrativeArea,
                addr.postalCode,
              ]
                .filter(Boolean)
                .join(", ")
            : null;
          return { id: l.name, title: l.title ?? l.name, address: formatted };
        }),
      });
    }
    return results;
  });

/** Attach a GBP location to one of our location rows. */
export const linkLocationToGbp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => LinkInput.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("locations")
      .update({
        gbp_connection_id: data.connection_id,
        gbp_account_id: data.gbp_account_id,
        gbp_location_id: data.gbp_location_id,
      })
      .eq("id", data.location_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Disconnect (delete tokens). Also unlinks any locations that referenced it. */
export const disconnectGbp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => DisconnectInput.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("gbp_connections")
      .delete()
      .eq("id", data.connection_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
