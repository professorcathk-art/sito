/**
 * Lead email broadcast helpers — personalization, HTML wrap, Pro-ready quotas.
 */

export const FREE_MONTHLY_EMAIL_LIMIT = 50;
export const PRO_MONTHLY_EMAIL_LIMIT = 2500;

export function currentQuotaPeriod(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function resolveMonthlyLimit(isPro: boolean, storedLimit?: number | null): number {
  if (isPro) return Math.max(storedLimit || 0, PRO_MONTHLY_EMAIL_LIMIT);
  if (storedLimit && storedLimit > 0) return storedLimit;
  return FREE_MONTHLY_EMAIL_LIMIT;
}

export function personalizeTemplate(
  template: string,
  vars: { first_name?: string; email?: string; name?: string }
): string {
  const first =
    vars.first_name ||
    (vars.name ? vars.name.split(/\s+/)[0] : "") ||
    (vars.email ? vars.email.split("@")[0] : "there");
  return template
    .replace(/\{\{\s*first_name\s*\}\}/gi, first)
    .replace(/\{\{\s*name\s*\}\}/gi, vars.name || first)
    .replace(/\{\{\s*email\s*\}\}/gi, vars.email || "");
}

/** Convert plain text / light markdown-ish body to simple HTML paragraphs */
export function bodyToHtml(body: string): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // Allow intentional line breaks; basic **bold**
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return withBold
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 1em;line-height:1.55">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

export function wrapBroadcastHtml(opts: {
  creatorName: string;
  bodyHtml: string;
  unsubscribeUrl: string;
}): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#e2e8f0">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:24px 12px">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#1e293b;border-radius:12px;padding:28px 24px;border:1px solid #334155">
        <tr><td style="font-size:13px;color:#94a3b8;padding-bottom:12px">
          Message from <strong style="color:#f8fafc">${escapeHtml(opts.creatorName)}</strong> via Sito
        </td></tr>
        <tr><td style="font-size:15px;color:#e2e8f0">
          ${opts.bodyHtml}
        </td></tr>
        <tr><td style="padding-top:28px;border-top:1px solid #334155;margin-top:16px;font-size:12px;color:#64748b;line-height:1.5">
          You’re receiving this because you signed up for a free resource from ${escapeHtml(opts.creatorName)} on Sito.
          <br/>
          <a href="${opts.unsubscribeUrl}" style="color:#38bdf8">Unsubscribe</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export interface BroadcastRecipient {
  email: string;
  name?: string | null;
  first_name?: string | null;
}
