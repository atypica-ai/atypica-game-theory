import { PlainTextToolResult } from "@/tools/utils";
import { tool } from "ai";
import { z } from "zod";
import { tryFindValidImage } from "./utils";

interface TikTokComment {
  id: string;
  content: string;
  user: {
    userid: string;
    secret_userid: string;
    nickname: string;
    image: string;
  };
  like_count: number;
  sub_comment_count: number;
}

export interface TikTokPostCommentsResult extends PlainTextToolResult {
  comments: TikTokComment[];
}

function parseXHSNoteComments(result: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  comments: any[];
}): TikTokPostCommentsResult {
  // 只取前十条
  const topComments = (result?.comments ?? []).slice(0, 10);
  const comments = topComments.map((comment) => {
    return {
      id: comment.cid,
      content: comment.text,
      user: {
        userid: comment.user.uid,
        secret_userid: comment.user.sec_uid,
        nickname: comment.user.nickname,
        image: tryFindValidImage(comment.user.avatar_thumb.url_list),
      },
      like_count: comment.digg_count,
      sub_comment_count: comment.reply_comment_total,
    };
  });
  const plainText = JSON.stringify(
    comments.map((comment) => ({
      userid: comment.user.userid,
      secret_userid: comment.user.secret_userid,
      nickname: comment.user.nickname,
      content: comment.content,
      like_count: comment.like_count,
      sub_comment_count: comment.sub_comment_count,
    })),
  );
  return {
    comments,
    plainText,
  };
}

async function tiktokPostComments({ postid }: { postid: string }) {
  for (let i = 0; i < 3; i++) {
    try {
      const headers = { Authorization: `Bearer ${process.env.TIKHUB_API_TOKEN!}` };
      const params = { aweme_id: postid, cursor: "0", count: "10" };
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(
        `${process.env.TIKHUB_API_BASE_URL}/tiktok/app/v3/fetch_video_comments?${queryString}`,
        { headers },
      );
      const res = await response.json();
      console.log("tiktokPostComments response:", JSON.stringify(res).slice(0, 100));
      if (res.code === 200) {
        const result = parseXHSNoteComments(res.data);
        return result;
      } else {
        console.log("Failed to fetch TikTok post comments, retrying...", i + 1);
        // 2005 错误是 超过所允许的访问间隔
        await new Promise((resolve) => setTimeout(resolve, 3 * 1000));
        continue;
      }
    } catch (error) {
      console.log("Error fetching TikTok post comments:", error);
    }
  }
  return {
    comments: [],
    plainText: "Failed to fetch TikTok post comments after 3 attempts",
  };
}

export const tiktokPostCommentsTool = tool({
  description: "获取 TikTok 特定帖子的评论，用于获取对特定品牌或者主题关注的用户，以及他们的反馈",
  parameters: z.object({
    postid: z.string().describe("The post ID to fetch comments from"),
  }),
  experimental_toToolResultContent: (result: PlainTextToolResult) => {
    return [{ type: "text", text: result.plainText }];
  },
  execute: async ({ postid }) => {
    const result = await tiktokPostComments({ postid });
    return result;
  },
});
