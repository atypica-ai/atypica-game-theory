"use client";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { fetchUserChats, UserChat } from "@/data/UserChat";
import { cn } from "@/lib/utils";
import { HistoryIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export function StudyHistoryDrawer({
  open: initialOpen = false,
  onOpenChange,
  trigger = true,
  direction = "left",
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: boolean;
  direction?: "left" | "right";
}) {
  const t = useTranslations("HomePage.HistoryDrawer");
  const [chats, setChats] = useState<Omit<UserChat, "messages">[]>([]);
  const [open, setOpen] = useState(initialOpen);

  useEffect(() => {
    setOpen(initialOpen);
  }, [initialOpen]);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const result = await fetchUserChats("study");
        if (!result.success) {
          throw result;
        }
        setChats(result.data);
      } catch (error) {
        console.error("Failed to fetch active chats:", (error as Error).message);
      }
    };
    fetchChats();
    const interval = setInterval(() => {
      fetchChats();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectChat = (studyUserChat: Omit<UserChat, "messages">) => {
    const isHello = studyUserChat.title === "我是企业用户，想了解一下企业版";
    window.location.replace(`/study/${studyUserChat.token}` + (isHello ? "?hello=1" : ""));
    setOpen(false); // Close drawer when a chat is selected
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  return (
    <Drawer
      direction={direction}
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
        if (onOpenChange) {
          onOpenChange(open);
        }
      }}
      modal={true}
    >
      {trigger && (
        <DrawerTrigger asChild>
          <Button variant="ghost" className="size-8">
            <HistoryIcon className="size-4" />
          </Button>
        </DrawerTrigger>
      )}
      <DrawerContent className="w-[280px] mr-0 ml-auto">
        <DrawerHeader>
          <DrawerTitle className="text-center">{t("title")}</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 space-y-2 overflow-y-scroll">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => handleSelectChat(chat)}
              className={cn(
                "px-3 py-2 text-sm truncate rounded-md cursor-pointer",
                "text-zinc-500 dark:text-zinc-300 hover:bg-zinc-100 hover:dark:bg-zinc-800 transition-colors",
              )}
            >
              {chat.title || t("unnamedChat")}
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
