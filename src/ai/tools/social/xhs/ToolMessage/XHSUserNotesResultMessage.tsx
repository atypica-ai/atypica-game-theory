import { cn } from "@/lib/utils";
import { ToolInvocation } from "ai";
import Image from "next/image";
import { FC } from "react";
import { XHSUserNotesResult } from "../userNotes";

export const XHSUserNotesResultMessage: FC<{
  toolInvocation: Omit<Extract<ToolInvocation, { state: "result" }>, "result"> & {
    result: XHSUserNotesResult;
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
      {(result.notes ?? []).slice(0, 10).map((note) => (
        <div key={note.id} className="flex flex-col items-center w-[120px]">
          <div className="relative w-[120px] h-[120px] rounded-lg overflow-hidden">
            <Image
              src={note.images_list[0]?.url}
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
                  src={note.user.image}
                  alt="User Avatar"
                  sizes="100%"
                  fill
                  className="object-cover rounded-full"
                />
              </div>
              <div className="text-xs text-foreground/80 line-clamp-1">{note.user.nickname}</div>
            </div>
            <h3 className="font-medium text-xs line-clamp-1">{note.title}</h3>
            <p className="text-foreground/80 text-xs mt-1 line-clamp-2">{note.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
