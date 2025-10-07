import z from "zod/v3";

// Common Zod schemas for social media tools
export const socialUserSchema = z.object({
  userid: z.string(),
  nickname: z.string(),
  image: z.string(),
});

export const socialPostSchema = z.object({
  id: z.string(),
  desc: z.string(),
  liked_count: z.number(),
  collected_count: z.number(),
  comments_count: z.number(),
  user: socialUserSchema,
  images_list: z.array(
    z.object({
      url: z.string(),
    }),
  ),
});

export const socialPostCommentSchema = z.object({
  id: z.string(),
  content: z.string(),
  user: socialUserSchema,
  like_count: z.number(),
  sub_comment_count: z.number(),
});

export type SocialUser = z.infer<typeof socialUserSchema>;
export type SocialPost = z.infer<typeof socialPostSchema>;
export type SocialPostComment = z.infer<typeof socialPostCommentSchema>;

// 下面两个类型，是不安全的，social tools 实际导出的是各自定义的类型
// social tools 给大模型的内容会有所不同，但是前段显示是完全一样的，这两个类型只用于前端组件类型约束
// 然后也不好硬统一，因为现在的格式很多已经保存在数据库里了
// ⚠️ 前提是，所有 social tools 都遵循着里的类型定义
export type SocialPostToolResult = {
  posts?: SocialPost[];
  notes?: SocialPost[];
  plainText: string;
};
export type SocialPostCommentToolResult = {
  comments?: SocialPostComment[];
  plainText: string;
};
