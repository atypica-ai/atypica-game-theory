import { ToolName, UIToolConfigs } from "@/ai/tools/types";
import { proxiedImageLoader } from "@/lib/utils";
import { ToolUIPart } from "ai";
import Image from "next/image";

export const SocialPostCommentsResultMessage = ({
  toolInvocation,
}: {
  toolInvocation: Extract<
    ToolUIPart<
      Pick<
        UIToolConfigs,
        | ToolName.xhsNoteComments
        | ToolName.dyPostComments
        | ToolName.tiktokPostComments
        | ToolName.insPostComments
        | ToolName.twitterPostComments
      >
    >,
    { state: "output-available" }
  >;
}) => {
  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-md">
      {/* 只挑选 10 条展示 */}
      {(toolInvocation.output.comments || []).slice(0, 10).map((comment) => (
        <div key={comment.id} className="flex items-start justify-start gap-3 mb-2">
          <div className="relative mt-2 w-6 h-6 rounded-full overflow-hidden">
            {comment.user.image && (
              <Image
                loader={proxiedImageLoader}
                src={comment.user.image}
                alt="User Avatar"
                className="object-cover"
                sizes="100%"
                fill
              />
            )}
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
