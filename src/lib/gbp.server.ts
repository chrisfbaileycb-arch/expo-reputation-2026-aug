/**
 * Server-only helpers for Google Business Profile OAuth + API.
 * Tokens are stored via service role; this module is never imported from client code.
 */
import { createClient } from "@supabase/supabase-js";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GBP_SCOPE = "https://www.googleapis.com/auth/business.manage";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export function gbpRedirectUri(origin: string): string {
  return `${origin}/api/public/gbp/callback`;
}

export function buildAuthUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: `${GBP_SCOPE} openid email`,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: opts.state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

export async function exchangeCodeForTokens(opts: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code: opts.code,
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    redirect_uri: opts.redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as GoogleTokenResponse;
}

export async function refreshAccessToken(opts: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    refresh_token: opts.refreshToken,
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Refresh failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as GoogleTokenResponse;
}

export async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  const res = await fetch(USERINFO_URL, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return null;
  const j = (await res.json()) as { email?: string };
  return j.email ?? null;
}

/** Service-role Supabase client for token storage. */
export function adminClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Get a valid (refreshed if needed) access token for a connection.
 * Persists the new access_token + expiry back to the row.
 */
export async function getValidAccessToken(connectionId: string): Promise<string> {
  const admin = adminClient();
  const { data: conn, error } = await admin
    .from("gbp_connections")
    .select("id, access_token, refresh_token, token_expires_at, status")
    .eq("id", connectionId)
    .maybeSingle();
  if (error || !conn) throw new Error("GBP connection not found");
  if (conn.status !== "active") throw new Error(`GBP connection ${conn.status}`);

  const expires = new Date(conn.token_expires_at).getTime();
  if (Date.now() < expires - 60_000) return conn.access_token as string;

  const clientId = process.env.GBP_CLIENT_ID;
  const clientSecret = process.env.GBP_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Missing GBP_CLIENT_ID / GBP_CLIENT_SECRET");

  try {
    const refreshed = await refreshAccessToken({
      refreshToken: conn.refresh_token as string,
      clientId,
      clientSecret,
    });
    const newExpires = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    await admin
      .from("gbp_connections")
      .update({
        access_token: refreshed.access_token,
        token_expires_at: newExpires,
        last_error: null,
      })
      .eq("id", connectionId);
    return refreshed.access_token;
  } catch (err) {
    await admin
      .from("gbp_connections")
      .update({ status: "error", last_error: (err as Error).message })
      .eq("id", connectionId);
    throw err;
  }
}

/** List Google Business Profile accounts the connected user manages. */
export async function listGbpAccounts(
  accessToken: string,
): Promise<Array<{ name: string; accountName?: string; type?: string }>> {
  const res = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`GBP accounts ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as {
    accounts?: Array<{ name: string; accountName?: string; type?: string }>;
  };
  return j.accounts ?? [];
}

/** List locations under a GBP account. accountName is like "accounts/123456". */
export async function listGbpLocationsForAccount(
  accessToken: string,
  accountName: string,
): Promise<Array<{ name: string; title?: string; storefrontAddress?: unknown }>> {
  const url = new URL(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`,
  );
  url.searchParams.set("readMask", "name,title,storefrontAddress");
  url.searchParams.set("pageSize", "100");
  const res = await fetch(url.toString(), { headers: { authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`GBP locations ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as {
    locations?: Array<{ name: string; title?: string; storefrontAddress?: unknown }>;
  };
  return j.locations ?? [];
}

/**
 * Post (or update) a reply to a Google review.
 * Uses Google My Business v4 — the reviews/reply endpoint has not migrated
 * to the newer v1 surface yet. PUT is idempotent: re-posting overwrites.
 *
 * accountId / locationId are bare IDs (no "accounts/" prefix);
 * reviewId is the platform_review_id stored on the review row.
 */
export async function postGoogleReviewReply(opts: {
  accessToken: string;
  accountId: string;
  locationId: string;
  reviewId: string;
  comment: string;
}): Promise<{ name: string; comment: string; updateTime: string }> {
  const url = `https://mybusiness.googleapis.com/v4/accounts/${opts.accountId}/locations/${opts.locationId}/reviews/${opts.reviewId}/reply`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${opts.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ comment: opts.comment }),
  });
  if (!res.ok) {
    throw new Error(`GBP reply ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as { name: string; comment: string; updateTime: string };
}
