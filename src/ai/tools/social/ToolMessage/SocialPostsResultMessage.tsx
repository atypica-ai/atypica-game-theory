import { SocialPost } from "@/ai/tools/types";
import { cn, formatTokensNumber, proxiedImageLoader } from "@/lib/utils";
import { ToolInvocation } from "ai";
import Image from "next/image";
import { FC } from "react";

export const SocialPostsResultMessage: FC<{
  toolInvocation: Omit<Extract<ToolInvocation, { state: "result" }>, "result"> & {
    result: {
      notes?: SocialPost[];
      posts?: SocialPost[];
    };
  };
}> = ({
  toolInvocation: {
    result: { notes, posts },
  },
}) => {
  return (
    <div
      className={cn(
        "flex flex-row gap-3 w-full overflow-x-scroll p-3 rounded-md",
        "bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800",
      )}
    >
      {/* 只挑选 10 条展示 */}
      {(notes || posts || []).slice(0, 10).map((post) => (
        <div key={post.id} className="flex flex-col items-center w-[160px]">
          <div className="relative w-[160px] h-[160px] rounded-lg overflow-hidden">
            {post.images_list?.[0]?.url && (
              <Image
                loader={proxiedImageLoader}
                src={post.images_list[0].url}
                alt="Note image"
                fill
                sizes="100%"
                className="object-cover"
              />
            )}
          </div>
          <div className="flex-1 p-1 w-full flex flex-col items-stretch justify-start overflow-hidden">
            <div className="flex items-center gap-1 mb-1">
              <div className="relative w-4 h-4">
                {post.user.image && (
                  <Image
                    loader={proxiedImageLoader}
                    src={post.user.image}
                    alt="User Avatar"
                    sizes="100%"
                    fill
                    className="object-cover rounded-full"
                  />
                )}
              </div>
              <div className="text-xs text-foreground/80 line-clamp-1">{post.user.nickname}</div>
            </div>
            {/* <h3 className="font-medium text-xs line-clamp-1">{post.title}</h3> */}
            <p className="text-foreground/80 text-xs mt-1 line-clamp-3">{post.desc}</p>
            <div className="mt-auto pt-1 flex justify-between gap-2 text-xs scale-75 origin-left">
              <span className="shrink-0">❤️ {formatTokensNumber(post.liked_count || 0)}</span>
              <span className="shrink-0">⭐ {formatTokensNumber(post.collected_count || 0)}</span>
              <span className="shrink-0">💬 {formatTokensNumber(post.comments_count || 0)}</span>
            </div>
            {/* <div>{note.id}</div> */}
          </div>
        </div>
      ))}
    </div>
  );
};
