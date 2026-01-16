/**
 * Extract body content and strip CSS/scripts from HTML for SEO purposes
 * - Extracts content within <body> tags
 * - Removes <style> tags, <script> tags, and inline style attributes
 * - Preserves semantic HTML structure for search engines
 */
export function stripHtmlForSEO(html: string): string {
  // Extract body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let cleaned = bodyMatch ? bodyMatch[1] : html;

  // Remove all <style> tags and their content
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

  // Remove all <script> tags and their content
  cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");

  // Remove inline style attributes
  cleaned = cleaned.replace(/\s*style\s*=\s*["'][^"']*["']/gi, "");

  // Remove class and id attributes to reduce noise
  cleaned = cleaned.replace(/\s*(class|id)\s*=\s*["'][^"']*["']/gi, "");

  return cleaned.trim();
}
