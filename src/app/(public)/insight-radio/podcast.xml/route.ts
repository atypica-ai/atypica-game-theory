import { podcastObjectUrlToHttpUrl } from "@/app/(podcast)/lib/utils";
import { truncateByDisplayWidth } from "@/lib/textUtils";
import { fetchFeaturedPodcasts } from "../actions";

export const dynamic = "force-dynamic";

/**
 * Generate Apple Podcasts compatible RSS feed
 * Spec: https://podcasters.apple.com/support/823-podcast-requirements
 *
 * Query parameters:
 * - locale: "en-US" or "zh-CN" (default: "en-US")
 */
export async function GET(request: Request) {
  // const baseUrl = await getRequestOrigin();
  const baseUrl = "https://atypica.ai";

  // Parse locale from query parameter
  const url = new URL(request.url);
  const localeParam = url.searchParams.get("locale");
  const locale = localeParam === "zh-CN" ? "zh-CN" : "en-US"; // Default to en-US

  // Fetch podcasts
  const result = await fetchFeaturedPodcasts({ locale, limit: 100 });

  if (!result.success || !result.data) {
    return new Response("Failed to fetch podcasts", { status: 500 });
  }

  const podcasts = result.data.filter((p) => p.podcast.objectUrl); // Only include podcasts with audio

  // Generate signed URLs for all podcasts
  const podcastsWithUrls = await Promise.all(
    podcasts.map(async (item) => {
      const urlResult = await podcastObjectUrlToHttpUrl({
        id: item.analyst.id, // Use analyst ID as a fallback
        objectUrl: item.podcast.objectUrl!,
        extra: item.podcast.extra,
      });

      return {
        ...item,
        s3SignedObjectUrl: urlResult?.signedObjectUrl || null,
        mimeType: urlResult?.mimeType || "audio/mpeg",
      };
    }),
  );

  // Filter out podcasts without valid URLs
  const validPodcasts = podcastsWithUrls.filter((p) => p.s3SignedObjectUrl);

  // Set language code for RSS feed
  const languageCode = locale === "zh-CN" ? "zh" : "en";

  // Generate RSS XML
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Atypica Insight Radio</title>
    <description>In an age of information overload, atypica.AI makes research reports something you can not only read, but listen to. We turn traditional market research into an insightful audio journey you can enjoy anytime and anywhere. Each episode brings fresh ideas and perspectives to help you hear the consumers, and understand the market. 💡 And if you'd like, you can also create your own research reports and podcasts with atypica.AI. We can't wait to hear your voice too.</description>
    <language>${languageCode}</language>
    <link>${baseUrl}/insight-radio</link>
    <atom:link href="${baseUrl}/insight-radio/podcast.xml" rel="self" type="application/rss+xml"/>

    <itunes:author>atypica.AI</itunes:author>
    <itunes:summary>In an age of information overload, atypica.AI makes research reports something you can not only read, but listen to. We turn traditional market research into an insightful audio journey you can enjoy anytime and anywhere. Each episode brings fresh ideas and perspectives to help you hear the consumers, and understand the market. 💡 And if you’d like, you can also create your own research reports and podcasts with atypica.AI. We can’t wait to hear your voice too.</itunes:summary>
    <itunes:type>episodic</itunes:type>
    <itunes:owner>
      <itunes:name>atypica.AI</itunes:name>
      <itunes:email>hi@atypica.ai</itunes:email>
    </itunes:owner>
    <itunes:image href="https://bmrlab-prod.s3.us-east-1.amazonaws.com/atypica/public/atypica-insight-radio-podcast-cover.png"/>
    <itunes:category text="Business">
      <itunes:category text="Management"/>
    </itunes:category>
    <itunes:category text="Technology"/>
    <itunes:explicit>false</itunes:explicit>

    ${validPodcasts
      .map((item, index) => {
        const title =
          item.podcast.extra?.metadata?.title || item.studyUserChat.title || "Untitled Episode";
        const description = item.podcast.script || "AI-powered research insights";
        const pubDate = new Date(item.podcast.generatedAt).toUTCString();
        const audioUrl = item.s3SignedObjectUrl!;
        const episodeUrl = `${baseUrl}/artifacts/podcast/${item.podcast.token}/share?utm_source=podcast&utm_medium=feed`;
        const guid = item.podcast.token;
        // Determine episode type based on kindDetermination
        const kind = item.podcast.extra?.kindDetermination?.kind;
        const episodeType = kind === "debate" ? "full" : "full"; // All episodes are full episodes
        return `
    <item>
      <title>${escapeXml(title)}</title>
      <description><![CDATA[${formatSummary(description, episodeUrl)}]]></description>
      <link>${escapeXml(episodeUrl)}</link>
      <guid isPermaLink="false">${escapeXml(guid)}</guid>
      <pubDate>${pubDate}</pubDate>
      <enclosure url="${escapeXml(audioUrl)}" type="${item.mimeType}"/>
      <itunes:title>${escapeXml(title)}</itunes:title>
      <itunes:summary><![CDATA[${formatSummary(description, episodeUrl)}]]></itunes:summary>
      <itunes:episodeType>${episodeType}</itunes:episodeType>
      <itunes:episode>${validPodcasts.length - index}</itunes:episode>
      <itunes:explicit>false</itunes:explicit>
    </item>`;
      })
      .join("\n")}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    },
  });
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Format description with line breaks for CDATA
 * Converts newlines to <br> tags and escapes CDATA end markers
 */
function formatDescriptionWithBreaks(text: string): string {
  return text
    .replace(/\]\]>/g, "]]]]><![CDATA[>") // Escape CDATA end marker if present
    .replace(/\n/g, "<br>"); // Convert newlines to <br> tags
}

/**
 * Format summary with character limit and promotional text
 */
function formatSummary(text: string, episodeUrl: string): string {
  // Truncate to 1000 display width (considers Chinese characters as 2 width)
  const truncated = truncateByDisplayWidth(text, 1000, "");
  const wasTruncated = truncated.length < text.length;

  // Apply formatting (line breaks)
  const formatted = formatDescriptionWithBreaks(truncated);

  // Add ellipsis if truncated
  const withEllipsis = wasTruncated ? `${formatted}...` : formatted;

  // Add promotional text
  return `${withEllipsis}<br><br>🔗 <a href="${episodeUrl}">Discover the complete story and deeper insights</a>`;
}
