/**
 * Utility function to strip HTML tags from text
 * Used to clean product descriptions before sending to Stripe
 * (Stripe checkout displays plain text, not HTML)
 */

export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  
  // Remove HTML tags using regex
  // This is a simple approach - for more complex HTML, consider using a library like 'html-to-text'
  const text = html
    .replace(/<[^>]*>/g, "") // Remove all HTML tags
    .replace(/&nbsp;/g, " ") // Replace &nbsp; with space
    .replace(/&amp;/g, "&") // Replace &amp; with &
    .replace(/&lt;/g, "<") // Replace &lt; with <
    .replace(/&gt;/g, ">") // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#39;/g, "'") // Replace &#39; with '
    .replace(/&apos;/g, "'") // Replace &apos; with '
    .trim();
  
  return text;
}
