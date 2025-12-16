import { cache } from "react";
import Parser from "rss-parser";

export interface SubstackPost {
  title?: string;
  slug: string;
  excerpt?: string;
  content?: string;
  pubDate?: string;
  link?: string;
  coverImage?: string;
}

interface CustomFeedItem {
  title?: string;
  link?: string;
  contentSnippet?: string;
  content?: string;
  contentEncoded?: string;
  pubDate?: string;
  enclosure?: {
    url?: string;
  };
}

const parser = new Parser<unknown, CustomFeedItem>({
  customFields: {
    item: [["content:encoded", "contentEncoded"]],
  },
});

/**
 * Fetch all Substack posts from RSS feed
 * Cached to avoid duplicate fetches during rendering
 */
export const getSubstackPosts = cache(async (): Promise<SubstackPost[]> => {
  try {
    const feed = await parser.parseURL("https://blog.atypica.ai/feed");
    return feed.items.map((item) => ({
      title: item.title,
      slug: item.link?.split("/").pop() || "",
      excerpt: item.contentSnippet,
      content: item.contentEncoded || item.content,
      pubDate: item.pubDate,
      link: item.link,
      coverImage: item.enclosure?.url,
    }));
  } catch (error) {
    console.error("Failed to fetch Substack posts:", error);
    return [];
  }
});

/**
 * Get a single post by slug
 */
export async function getPostBySlug(slug: string): Promise<SubstackPost | undefined> {
  const posts = await getSubstackPosts();
  return posts.find((post) => post.slug === slug);
}
