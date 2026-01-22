"use client";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ExtractServerActionData } from "@/lib/serverAction";
import { HistoryIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchDeepResearchHistoryAction } from "./actions";

type DeepResearchHistoryItem = ExtractServerActionData<typeof fetchDeepResearchHistoryAction>[number];

export function DeepResearchHistory() {
  const [sessions, setSessions] = useState<DeepResearchHistoryItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      const result = await fetchDeepResearchHistoryAction();
      if (result.success) {
        setSessions(result.data);
      } else {
        console.error("Failed to fetch history:", result.message);
      }
    };

    fetchHistory();
    const interval = setInterval(() => {
      fetchHistory();
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
      <DrawerContent className="w-[320px] mr-0 ml-auto">
        <DrawerHeader>
          <DrawerTitle className="text-center">Recent Sessions</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 space-y-2 overflow-y-auto scrollbar-thin">
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No sessions yet</p>
          ) : (
            sessions.map((session) => (
              <Link
                key={session.id}
                href={`/deepResearch/${session.token}`}
                className="block px-3 py-2 rounded hover:bg-muted transition-colors cursor-pointer"
                onClick={() => setOpen(false)}
              >
                <div className="text-sm truncate">{session.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(session.updatedAt).toLocaleString()}
                </div>
              </Link>
            ))
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
