import { PlainTextToolResult, SocialUser } from "@/ai/tools/types";

export interface XHSNote {
  id: string;
  title: string;
  desc: string;
  type: string;
  liked_count: number;
  collected_count: number;
  comments_count: number;
  user: SocialUser;
  images_list: {
    url: string;
    width: number;
    height: number;
  }[];
}

export interface XHSSearchResult extends PlainTextToolResult {
  notes: XHSNote[];
  // total: number;
  plainText: string;
}
