/**
 * 24-hour elevation follow-up — only sent to 4–5★ submitters who didn't
 * click through to the public review link.
 */

export interface NudgeProps {
  contact_first_name?: string | null;
  location_name: string;
  review_url: string;
}

export function renderNudgeSubject(p: NudgeProps): string {
  return `A quick favor from ${p.location_name}`;
}

export function renderNudgeText(p: NudgeProps): string {
  const hi = p.contact_first_name ? `Hi ${p.contact_first_name},` : "Hi there,";
  return [
    hi,
    "",
    `Thanks again for the kind words about ${p.location_name}. If you have 20 seconds, would you mind sharing them publicly on Google? It helps our small team more than you know.`,
    "",
    p.review_url,
    "",
    `— ${p.location_name}`,
  ].join("\n");
}

export function renderNudgeHtml(p: NudgeProps): string {
  const hi = p.contact_first_name ? `Hi ${p.contact_first_name},` : "Hi there,";
  return `<!doctype html>
<html><body style="margin:0;background:#faf7f0;font-family:Georgia,serif;color:#1f2d24;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f0;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e9e2d0;border-radius:16px;padding:32px;">
        <tr><td>
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:400;">${hi}</h1>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
            Thanks again for the kind words about <strong>${escapeHtml(p.location_name)}</strong>. If you have 20 seconds, would you mind sharing them publicly on Google? It helps our small team more than you know.
          </p>
          <p style="margin:24px 0;">
            <a href="${p.review_url}" style="display:inline-block;background:#3f5c48;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;">Leave a Google review</a>
          </p>
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
