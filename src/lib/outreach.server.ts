/**
 * Email sender abstraction.
 *
 * Domain isn't verified yet (Hostinger DNS pending), so this is a
 * placeholder driver that logs to server output and returns a synthetic
 * provider_message_id. When the domain is live we swap `driver` for
 * Resend / Mailgun / SES without touching callers.
 */

export interface OutboundEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

export interface SendResult {
  ok: boolean;
  provider_message_id: string | null;
  error?: string;
}

const PLACEHOLDER_FROM =
  process.env.OUTREACH_FROM_ADDRESS ?? "notifications@placeholder.expoproxy.local";

async function stubDriver(msg: OutboundEmail): Promise<SendResult> {
  const id = `STUB-${crypto.randomUUID()}`;
  // Server-side log only — never returned to the browser.
  console.log("[outreach:stub] would send", {
    from: msg.from ?? PLACEHOLDER_FROM,
    to: msg.to,
    subject: msg.subject,
    provider_message_id: id,
    preview: msg.text.slice(0, 140),
  });
  return { ok: true, provider_message_id: id };
}

export async function sendEmail(msg: OutboundEmail): Promise<SendResult> {
  // TODO: replace with real provider once the sender domain is verified.
  return stubDriver({ ...msg, from: msg.from ?? PLACEHOLDER_FROM });
}

/** Same-origin base URL for the /r/:token feedback landing. */
export function publicBaseUrl(): string {
  return (
    process.env.PUBLIC_APP_URL ?? process.env.VITE_PUBLIC_APP_URL ?? "https://app.expoproxy.com"
  );
}

/** Cryptographically strong URL-safe token for /r/:token. */
export function newOutreachToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
