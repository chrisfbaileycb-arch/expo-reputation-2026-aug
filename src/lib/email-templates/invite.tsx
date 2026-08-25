/**
 * Invite email — "How was your experience?"
 * Rendered to HTML string via renderInvite() below.
 * We keep this framework-free (no react-email dep yet) so the send pipeline
 * works with a placeholder provider until the domain is verified.
 */

export interface InviteProps {
  contact_first_name?: string | null;
  location_name: string;
  feedback_url: string;
}

export function renderInviteSubject(p: InviteProps): string {
  return `How was your visit to ${p.location_name}?`;
}

export function renderInviteText(p: InviteProps): string {
  const hi = p.contact_first_name ? `Hi ${p.contact_first_name},` : "Hi there,";
  return [
    hi,
    "",
    `Thank you for choosing ${p.location_name}. We'd love a quick word on how it went — it takes about 15 seconds:`,
    "",
    p.feedback_url,
    "",
    "Your response goes straight to the team.",
    "",
    `— ${p.location_name}`,
  ].join("\n");
}

export function renderInviteHtml(p: InviteProps): string {
  const hi = p.contact_first_name ? `Hi ${p.contact_first_name},` : "Hi there,";
  return `<!doctype html>
<html><body style="margin:0;background:#faf7f0;font-family:Georgia,serif;color:#1f2d24;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f0;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e9e2d0;border-radius:16px;padding:32px;">
        <tr><td>
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:400;">${hi}</h1>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
            Thank you for choosing <strong>${escapeHtml(p.location_name)}</strong>. We'd love a quick word on how it went — it takes about 15 seconds.
          </p>
          <p style="margin:24px 0;">
            <a href="${p.feedback_url}" style="display:inline-block;background:#3f5c48;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;">Share your feedback</a>
          </p>
          <p style="margin:0;font-size:13px;color:#6b7a70;">Your response goes straight to the team.</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#8b978d;">— ${escapeHtml(p.location_name)}</p>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
