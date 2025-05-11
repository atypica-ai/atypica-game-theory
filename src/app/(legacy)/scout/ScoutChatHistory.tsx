import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { fetchUserChats, ScoutUserChat } from "@/lib/data/UserChat";
import { HistoryIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

export function ScoutChatHistory() {
  const t = useTranslations("ScoutPage.HistoryDrawer");
  const [chats, setChats] = useState<Omit<ScoutUserChat, "messages">[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchChats = async () => {
      const result = await fetchUserChats("scout");
      if (result.success) {
        setChats(result.data);
      } else {
        console.error(result.message);
      }
    };
    fetchChats();
    const interval = setInterval(() => {
      fetchChats();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Drawer direction="right" open={open} onOpenChange={setOpen} modal={true}>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon">
          <HistoryIcon className="h-5 w-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="w-[280px] mr-0 ml-auto">
        <DrawerHeader>
          <DrawerTitle className="text-center">{t("title")}</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 space-y-2 overflow-y-auto scrollbar-thin">
          {chats.map((chat) => (
            <Link
              key={chat.id}
              href={`/agents/scout/${chat.id}`}
              className="block px-3 py-2 text-sm truncate text-zinc-500 hover:bg-zinc-100 rounded cursor-pointer"
            >
              {chat.title || t("unnamedChat")}
            </Link>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
