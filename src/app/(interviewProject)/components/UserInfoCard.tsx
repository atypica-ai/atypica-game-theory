import { cn } from "@/lib/utils";
import { FC } from "react";

interface UserInfoCardProps {
  user: {
    name?: string | null;
    email: string;
  };
  className?: string;
}

/**
 * UserInfoCard - 显示用户头像和用户名
 * 头像显示用户名或邮箱的首字母
 */
export const UserInfoCard: FC<UserInfoCardProps> = ({ user, className }) => {
  const displayName = user.name || user.email;
  const initial = user.name
    ? user.name.charAt(0).toUpperCase()
    : user.email.charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full",
        "bg-muted text-foreground",
        "border border-border",
        className,
      )}
    >
      <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-primary-foreground text-xs font-medium">{initial}</span>
      </div>
      <span className="text-sm font-medium">{displayName}</span>
    </div>
  );
};
