"use client";
import { fetchUserChatByIdAction } from "@/app/(agents)/agents/actions";
import { createParamConfig } from "@/hooks/use-list-query-params";
import { throwServerActionError } from "@/lib/serverAction";
import { UserChat } from "@/prisma/client";
import { useEffect, useState } from "react";
import PersonasList from "./PersonasList";

export const SearchParamsConfig = {
  scoutUserChat: createParamConfig.string(""),
  page: createParamConfig.number(1),
  search: createParamConfig.string(""),
  tiers: createParamConfig.numberArray([2, 3]),
  locales: createParamConfig.stringArray(["zh-CN", "en-US"]),
} as const;

export type PersonasSearchParams = {
  scoutUserChat: string;
  page: number;
  search: string;
  tiers: number[];
  locales: string[];
};

interface PersonasPageClientProps {
  initialSearchParams: Record<string, string | number | boolean>;
}

export function PersonasPageClient({ initialSearchParams }: PersonasPageClientProps) {
  const [scoutUserChat, setScoutUserChat] = useState<UserChat | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadScoutUserChat = async () => {
      if (initialSearchParams.scoutUserChat) {
        const scoutUserChatId = parseInt(String(initialSearchParams.scoutUserChat));
        const scoutUserChatResult = await fetchUserChatByIdAction(scoutUserChatId, "scout");
        if (!scoutUserChatResult.success) {
          throwServerActionError(scoutUserChatResult);
        }
        setScoutUserChat(scoutUserChatResult.data);
      }
      setIsLoading(false);
    };

    loadScoutUserChat();
  }, [initialSearchParams.scoutUserChat]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <PersonasList scoutUserChat={scoutUserChat || undefined} initialParams={initialSearchParams} />
  );
}
