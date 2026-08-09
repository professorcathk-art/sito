/** Shared honeypot field name — bots fill this; humans never see it. */
export const HONEYPOT_FIELD = "website_url_hp";

/** Returns true if the submission should be silently rejected as spam. */
export function isHoneypotTriggered(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value !== "string") return true;
  return value.trim().length > 0;
}
