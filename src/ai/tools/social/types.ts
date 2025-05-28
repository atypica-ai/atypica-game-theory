export interface SocialUser {
  userid: string;
  nickname: string;
  image: string;
}

export interface SocialPost {
  id: string;
  desc: string;
  liked_count: number;
  collected_count: number;
  comments_count: number;
  user: SocialUser;
  images_list: {
    url: string;
  }[];
}

export interface SocialPostComment {
  id: string;
  content: string;
  user: SocialUser;
  like_count: number;
  sub_comment_count: number;
}
