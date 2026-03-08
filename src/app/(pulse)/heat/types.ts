export type PulsePostData = {
  postId: string;
  content: string;
  views: number;
  likes: number;
  retweets: number;
  replies: number;
  url?: string;
  author?: string;
};
