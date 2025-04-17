import { PlainTextToolResult } from "@/tools/utils";
import { tool } from "ai";
import { z } from "zod";
import { SocialUser } from "../types";

interface InsComment {
  id: string;
  content: string;
  user: SocialUser;
  like_count: number;
  sub_comment_count: number;
}

export interface InsPostCommentsResult extends PlainTextToolResult {
  comments: InsComment[];
}

function parseXHSNoteComments(result: {
  data: {
    count: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: any[];
  };
}): InsPostCommentsResult {
  // 只取前十条
  const topComments = (result?.data?.items ?? []).slice(0, 10);
  const comments = topComments.map((item) => {
    return {
      id: item.id,
      content: item.text,
      user: {
        userid: item.user?.id,
        nickname: item.user?.username,
        image: item.user?.profile_pic_url,
      },
      like_count: item.comment_like_count,
      sub_comment_count: item.child_comment_count,
    };
  });
  const plainText = JSON.stringify(
    comments.map((comment) => ({
      userid: comment.user.userid,
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

async function insPostComments({ postcode }: { postcode: string }) {
  for (let i = 0; i < 3; i++) {
    try {
      const headers = { Authorization: `Bearer ${process.env.TIKHUB_API_TOKEN!}` };
      const params = { url: `https://www.instagram.com/p/${postcode}/` };
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(
        `${process.env.TIKHUB_API_BASE_URL}/instagram/web_app/fetch_post_comments_by_url?${queryString}`,
        { headers },
      );
      const res = await response.json();
      console.log("insPostComments response:", JSON.stringify(res).slice(0, 100));
      if (res.code === 200) {
        const result = parseXHSNoteComments(res.data);
        return result;
      } else {
        console.log("Failed to fetch Instagram post comments, retrying...", i + 1);
        // 2005 错误是 超过所允许的访问间隔
        await new Promise((resolve) => setTimeout(resolve, 3 * 1000));
        continue;
      }
    } catch (error) {
      console.log("Error fetching Instagram post comments:", error);
    }
  }
  return {
    comments: [],
    plainText: "Failed to fetch Instagram post comments after 3 attempts",
  };
}

export const insPostCommentsTool = tool({
  description:
    "获取 Instagram 特定帖子的评论，用于获取对特定品牌或者主题关注的用户，以及他们的反馈",
  parameters: z.object({
    postcode: z.string().describe("The post slug to fetch comments from"),
  }),
  experimental_toToolResultContent: (result: PlainTextToolResult) => {
    return [{ type: "text", text: result.plainText }];
  },
  execute: async ({ postcode }) => {
    const result = await insPostComments({ postcode });
    return result;
  },
});
