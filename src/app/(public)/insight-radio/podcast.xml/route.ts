import { proxiedImageCdnUrl, proxiedObjectCdnUrl } from "@/app/(system)/cdn/lib";
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
  const platform = url.searchParams.get("platform"); // youtube | xiaoyuzhou | spotify | apple
  const locale = localeParam === "zh-CN" ? "zh-CN" : "en-US"; // Default to en-US

  // Fetch podcasts
  const result = await fetchFeaturedPodcasts({ locale, pageSize: 100 });

  if (!result.success || !result.data) {
    return new Response("Failed to fetch podcasts", { status: 500 });
  }

  const podcasts = result.data.filter((p) => p.podcast.objectUrl); // Only include podcasts with audio

  // Generate signed URLs for all podcasts
  const podcastsWithUrls = await Promise.all(
    podcasts.map(async (item) => {
      const mimeType = item.podcast.extra.metadata?.mimeType ?? "audio/mpeg";
      const audioSrc = proxiedObjectCdnUrl({
        name: item.podcast.extra.metadata?.title ?? undefined,
        objectUrl: item.podcast.objectUrl!,
        mimeType,
      });

      // Get cover image URL from podcast
      let coverImageUrl: string | undefined;
      if (item.podcast.extra.metadata?.coverObjectUrl) {
        coverImageUrl = proxiedImageCdnUrl({
          objectUrl: item.podcast.extra.metadata.coverObjectUrl,
          width: 2000,
          height: platform === "youtube" ? undefined : 2000,
        });
      }

      return {
        ...item,
        audioSrc: audioSrc,
        mimeType,
        coverImageUrl,
      };
    }),
  );

  // Filter out podcasts without valid URLs
  const validPodcasts = podcastsWithUrls.filter((p) => p.audioSrc);
  // Sort podcasts by createdAt in descending order (newest first)
  validPodcasts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Set language code for RSS feed
  const languageCode = locale === "zh-CN" ? "zh" : "en";
  const title = "Atypica Insight Radio";
  const description =
    locale === "zh-CN"
      ? `在信息爆炸的时代，Atypica.AI 让商业研究不仅能“看”，还能“听”。我们把传统的市场和商业调研，变成一场充满洞察力的音频之旅——随时随地，轻松获得新观点。每一期节目都带来鲜活的案例、趋势与视角，帮助你听见消费者，读懂市场。想让你的研究和观点也被世界听见？快来 Atypica.AI，一键生成属于你的研究与播客。`
      : "In an age of information overload, atypica.AI makes research reports something you can not only read, but listen to. We turn traditional market research into an insightful audio journey you can enjoy anytime and anywhere. Each episode brings fresh ideas and perspectives to help you hear the consumers, and understand the market. 💡 And if you'd like, you can also create your own research reports and podcasts with atypica.AI. We can't wait to hear your voice too.";
  const author = "atypica.AI";
  const email = "hi@atypica.ai";
  const logoSrc =
    locale === "zh-CN"
      ? "https://bmrlab-prod.s3.cn-north-1.amazonaws.com.cn/atypica/public/atypica-insight-podcast-logo-20251118.jpg"
      : "https://bmrlab-prod.s3.us-east-1.amazonaws.com/atypica/public/atypica-insight-podcast-logo-20251118.jpg";

  // Generate RSS XML
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${title}</title>
    <description>${description}</description>
    <language>${languageCode}</language>
    <link>${baseUrl}/insight-radio</link>
    <atom:link href="${baseUrl}/insight-radio/podcast.xml" rel="self" type="application/rss+xml"/>

    <itunes:author>${author}</itunes:author>
    <itunes:summary>${description}</itunes:summary>
    <itunes:type>episodic</itunes:type>
    <itunes:owner>
      <itunes:name>${author}</itunes:name>
      <itunes:email>${email}</itunes:email>
    </itunes:owner>
    <itunes:image href="${logoSrc}"/>
    <itunes:category text="Business">
      <itunes:category text="Management"/>
    </itunes:category>
    <itunes:category text="Technology"/>
    <itunes:explicit>false</itunes:explicit>

    ${validPodcasts
      .map((item, index) => {
        const title = item.title || "Untitled Episode";
        // Use showNotes if available, otherwise fallback to truncated script
        const showNotes = item.podcast.extra?.metadata?.showNotes;
        const description = showNotes ? showNotes : item.podcast.script || "AI-powered research insights";
        const pubDate = new Date(item.createdAt).toUTCString();
        const episodeUrl = item.url;
        const guid = item.podcast.token;
        // Determine episode type based on kindDetermination
        const kind = item.podcast.extra?.kindDetermination?.kind;
        const episodeType = kind === "debate" ? "full" : "full"; // All episodes are full episodes
        // Extract audio metadata
        const duration = item.podcast.extra?.metadata?.duration; // in seconds
        const fileSize = item.podcast.extra?.metadata?.size; // in bytes
        // Format description (add link, don't truncate if using showNotes)
        const formattedDescription = showNotes
          ? formatShowNotes({
              showNotes: description,
              studyUrl: episodeUrl,
              studyTitle: title,
              locale,
              baseUrl,
            })
          : formatSummary(description, episodeUrl, locale);
        // Use podcast cover image URL (if available)
        const coverImageUrl = item.coverImageUrl;
        return `
    <item>
      <title>${escapeXml(title)}</title>
      <description><![CDATA[${formattedDescription}]]></description>
      <link>${escapeXml(episodeUrl)}</link>
      <guid isPermaLink="false">${guid}</guid>
      <pubDate>${pubDate}</pubDate>
      <enclosure url="${escapeXml(item.audioSrc)}" type="${item.mimeType}"${fileSize ? ` length="${fileSize}"` : ""}/>
      <itunes:title>${escapeXml(title)}</itunes:title>
      <itunes:summary><![CDATA[${formattedDescription}]]></itunes:summary>
      <itunes:episodeType>${episodeType}</itunes:episodeType>
      <itunes:episode>${validPodcasts.length - index}</itunes:episode>${duration ? `\n      <itunes:duration>${formatDuration(duration)}</itunes:duration>` : ""}${coverImageUrl ? `\n      <itunes:image href="${escapeXml(coverImageUrl)}"/>` : ""}
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

/*
// remove podcast 的例子
<item>
  <title>${escapeXml(title)}</title>
  <description>AI-powered research insights</description>
  <link>${escapeXml(episodeUrl)}</link>
  <guid isPermaLink="true">${escapeXml(`${baseUrl}/podcast/${item.podcast.token}`)}</guid>
  <pubDate>${pubDate}</pubDate>
  <itunes:block>yes</itunes:block>
</item>
*/

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
function formatSummary(text: string, episodeUrl: string, locale: string): string {
  // Truncate to 1000 display width (considers Chinese characters as 2 width)
  const truncated = truncateByDisplayWidth(text, 1000, "");
  const wasTruncated = truncated.length < text.length;

  // Apply formatting (line breaks)
  const formatted = formatDescriptionWithBreaks(truncated);

  // Add ellipsis if truncated
  const withEllipsis = wasTruncated ? `${formatted}...` : formatted;

  // Add promotional text
  const linkText =
    locale === "zh-CN"
      ? "查看完整研究，探索更深入的洞察"
      : "View the full research and explore deeper insights";
  return `${withEllipsis}<br><br>🔗 <a href="${episodeUrl}">${linkText}</a>`;
}

/**
 * Format show notes without truncation (show notes are pre-formatted)
 */
function formatShowNotes({
  showNotes,
  studyUrl,
  studyTitle,
  locale,
  baseUrl,
}: {
  showNotes: string;
  studyUrl: string;
  studyTitle: string;
  locale: string;
  baseUrl: string;
}): string {
  // Apply formatting (line breaks)
  const formatted = formatDescriptionWithBreaks(showNotes);

  if (locale === "zh-CN") {
    return `📌 本期概览<br>${formatted}<br><br>📃 本期深度研究在这里获取：<br><a href="${studyUrl}">${studyTitle ?? "深度研究"}</a><br><br>关于 Atypica<br>Atypica 是一个面向全球市场、技术与消费者机制研究的智能体内容品牌，用跨学科方法拆解那些被忽视却决定未来走向的结构性变量、商业逻辑与模式变化。<br><br>💻 技术支持<br>智能体支持：<a href="${baseUrl}?utm_source=podcast&utm_medium=feed">atypica.AI</a><br>模型支持：Creative Reasoning<br><br>开启你感兴趣的研究话题，它们会成为未来某一期深度播客内容的种子<br><a href="${baseUrl}/insight-radio?utm_source=podcast&utm_medium=feed">查看所有深度研究</a>`;
  } else {
    return `📌 Overview<br>${formatted}<br><br>📃 Access the full research here：<br><a href="${studyUrl}">${studyTitle ?? "Deep Research"}</a><br><br>About Atypica<br>Atypica is an AI-powered content brand focused on global markets, technology, and consumer mechanisms. We use interdisciplinary methods to dissect overlooked structural variables, business logic, and pattern shifts that shape the future.<br><br>💻 Technical Support<br>Agent Support: <a href="${baseUrl}?utm_source=podcast&utm_medium=feed">atypica.AI</a><br>Model Support: Creative Reasoning<br><br>Start a research topic you're interested in, and it may become a future in-depth podcast episode<br><a href="${baseUrl}/insight-radio?utm_source=podcast&utm_medium=feed">View all research</a>`;
  }
}

/**
 * Format duration in seconds to HH:MM:SS format for iTunes
 * @param seconds Duration in seconds
 * @returns Formatted duration string (HH:MM:SS or MM:SS)
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }
}
