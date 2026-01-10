/**
 * Utility function to truncate HTML content to a certain percentage
 * Used to show partial content for non-signed-in users (Medium-style paywall)
 * 
 * This function preserves HTML structure while truncating content
 */

export function truncateHtml(html: string, percentage: number = 50): string {
  if (!html) return "";
  
  // Remove HTML tags temporarily to count text characters
  const textContent = html.replace(/<[^>]*>/g, "");
  const totalLength = textContent.length;
  const targetLength = Math.floor((totalLength * percentage) / 100);
  
  if (targetLength >= totalLength) {
    return html; // Return full content if target is longer than actual
  }
  
  // Find a good breaking point (end of sentence or paragraph)
  let truncatedTextLength = targetLength;
  
  // Try to break at sentence end (., !, ?) within reasonable range
  const searchStart = Math.floor(targetLength * 0.7);
  const searchEnd = Math.min(targetLength + 200, totalLength);
  const searchText = textContent.substring(searchStart, searchEnd);
  
  const lastSentenceEnd = Math.max(
    searchText.lastIndexOf('.'),
    searchText.lastIndexOf('!'),
    searchText.lastIndexOf('?')
  );
  
  if (lastSentenceEnd > 0) {
    truncatedTextLength = searchStart + lastSentenceEnd + 1;
  }
  
  // Now find the corresponding position in HTML
  // We'll track text characters and find a good HTML break point
  let textCharsCount = 0;
  let lastGoodBreak = 0;
  let inTag = false;
  let tagBuffer = "";
  
  for (let i = 0; i < html.length; i++) {
    const char = html[i];
    
    if (char === '<') {
      inTag = true;
      tagBuffer = '<';
    } else if (char === '>') {
      inTag = false;
      tagBuffer += '>';
      
      // Check if this is a closing tag that would be a good break point
      if (tagBuffer.match(/<\/p>|<\/div>|<\/h[1-6]>|<\/li>|<\/blockquote>/)) {
        if (textCharsCount <= truncatedTextLength) {
          lastGoodBreak = i + 1;
        }
      }
      
      tagBuffer = "";
    } else if (!inTag) {
      textCharsCount++;
      
      // If we've reached the target length, look for a good break
      if (textCharsCount >= truncatedTextLength) {
        // Look ahead for paragraph or div closing tags
        const remainingHtml = html.substring(i);
        const nextParaEnd = remainingHtml.search(/<\/p>|<\/div>/);
        
        if (nextParaEnd !== -1 && nextParaEnd < 500) {
          return html.substring(0, i + nextParaEnd + 5); // Include closing tag
        }
        
        // Otherwise, break at current position
        return html.substring(0, i);
      }
    } else {
      tagBuffer += char;
    }
  }
  
  // If we didn't find a good break, use the last good break or return partial
  return lastGoodBreak > 0 ? html.substring(0, lastGoodBreak) : html.substring(0, html.length * percentage / 100);
}
