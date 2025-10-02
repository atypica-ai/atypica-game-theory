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

export interface SocialUser extends z.infer<typeof socialUserSchema> {}

export interface SocialPost extends z.infer<typeof socialPostSchema> {}

export interface SocialPostComment extends z.infer<typeof socialPostCommentSchema> {}
