import { cn } from "@/lib/utils";
import { ToolInvocation } from "ai";
import Image from "next/image";
import { FC } from "react";
import { DYPostCommentsResult } from "./postComments";
import { DYSearchResult } from "./search";
import { DYUserPostsResult } from "./userPosts";

export const DYSearchResultMessage: FC<{
  toolInvocation: Omit<Extract<ToolInvocation, { state: "result" }>, "result"> & {
    result: DYSearchResult;
  };
}> = ({ toolInvocation: { result } }) => {
  return (
    <div
      className={cn(
        "flex flex-row gap-3 w-full overflow-x-scroll p-3 rounded-md",
        "bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800",
      )}
    >
      {/* 只挑选 10 条展示 */}
      {(result.posts ?? []).slice(0, 10).map((post) => (
        <div key={post.id} className="flex flex-col items-center w-[120px]">
          <div className="relative w-[120px] h-[120px] rounded-lg overflow-hidden">
            <Image
              src={post.images_list[0]?.url}
              alt="Note image"
              fill
              sizes="100%"
              className="object-cover"
            />
          </div>
          <div className="p-1 w-full">
            <div className="flex items-center gap-1 mb-1">
              <div className="relative w-4 h-4">
                <Image
                  src={post.user.images}
                  alt="User Avatar"
                  sizes="100%"
                  fill
                  className="object-cover rounded-full"
                />
              </div>
              <div className="text-xs text-foreground/80 line-clamp-1">{post.user.nickname}</div>
            </div>
            <p className="text-foreground/80 text-xs mt-1 line-clamp-2">{post.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export const DYUserPostsResultMessage: FC<{
  toolInvocation: Omit<Extract<ToolInvocation, { state: "result" }>, "result"> & {
    result: DYUserPostsResult;
  };
}> = ({ toolInvocation: { result } }) => {
  return (
    <div
      className={cn(
        "flex flex-row gap-3 w-full overflow-x-scroll p-3 rounded-md",
        "bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800",
      )}
    >
      {/* 只挑选 10 条展示 */}
      {(result.posts ?? []).slice(0, 10).map((post) => (
        <div key={post.id} className="flex flex-col items-center w-[120px]">
          <div className="relative w-[120px] h-[120px] rounded-lg overflow-hidden">
            <Image
              src={post.images_list[0]?.url}
              alt="Note image"
              fill
              sizes="100%"
              className="object-cover"
            />
          </div>
          <div className="p-1 w-full">
            <div className="flex items-center gap-1 mb-1">
              <div className="relative w-4 h-4">
                <Image
                  src={post.user.images}
                  alt="User Avatar"
                  sizes="100%"
                  fill
                  className="object-cover rounded-full"
                />
              </div>
              <div className="text-xs text-foreground/80 line-clamp-1">{post.user.nickname}</div>
            </div>
            <p className="text-foreground/80 text-xs mt-1 line-clamp-2">{post.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export const DYPostCommentsResultMessage: FC<{
  toolInvocation: Omit<Extract<ToolInvocation, { state: "result" }>, "result"> & {
    result: DYPostCommentsResult;
  };
}> = ({ toolInvocation: { result } }) => {
  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-md">
      {/* 只挑选 10 条展示 */}
      {(result.comments ?? []).slice(0, 10).map((comment) => (
        <div key={comment.id} className="flex items-start justify-start gap-3 mb-2">
          <div className="relative mt-2 w-6 h-6 rounded-full overflow-hidden">
            <Image
              src={comment.user.images}
              alt="User Avatar"
              className="object-cover"
              sizes="100%"
              fill
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <strong className="text-xs text-foreground/80">{comment.user.nickname}</strong>
            <p className="text-foreground/80 text-xs line-clamp-2">{comment.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
