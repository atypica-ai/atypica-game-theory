"use client";

import { fetchAttachmentsInStudy, fetchStudyPanelInfo } from "@/app/(study)/study/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ArrowRightIcon,
  ChevronRightIcon,
  FileIcon,
  Loader2Icon,
  PaperclipIcon,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useStudyContext } from "../hooks/StudyContext";
import StudyArtifactsListPanel from "./StudyArtifactsListPanel";

// ─── Attachments Item ───

function AttachmentsItem() {
  const t = useTranslations("StudyPage.BottomBar");
  const {
    studyUserChat: { token: studyUserChatToken },
  } = useStudyContext();

  const [isOpen, setIsOpen] = useState(false);
  const [attachments, setAttachments] = useState<
    { mediaType: string; filename?: string; url: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setIsLoading(true);
    fetchAttachmentsInStudy({ userChatToken: studyUserChatToken })
      .then((result) => {
        if (result.success) setAttachments(result.data);
      })
      .finally(() => setIsLoading(false));
  }, [studyUserChatToken]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 has-[>svg]:px-2 rounded-sm text-xs text-muted-foreground bg-background/80 backdrop-blur-sm"
        >
          <PaperclipIcon />
          <span>{t("attachments")}</span>
          {attachments.length > 0 && (
            <span className="font-medium text-foreground">{attachments.length}</span>
          )}
          <ChevronRightIcon className="size-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 dark:bg-zinc-800" align="center" side="top">
        <div className="px-3 py-2 flex items-center gap-2 bg-muted/30">
          <PaperclipIcon className="size-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{t("attachments")}</span>
          {attachments.length > 0 && (
            <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-[10px]">
              {attachments.length}
            </Badge>
          )}
        </div>
        <div className="p-2">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : attachments.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-3">
              {t("noAttachments")}
            </div>
          ) : (
            <div className="space-y-0.5">
              {attachments.map((attachment, index) => {
                const isImage = attachment.mediaType?.startsWith("image/");
                return (
                  <Link
                    key={index}
                    href={attachment.url}
                    target="_blank"
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors"
                  >
                    {isImage ? (
                      <div className="relative size-7 rounded overflow-hidden shrink-0 bg-zinc-100 dark:bg-zinc-800">
                        <Image
                          src={attachment.url}
                          alt={attachment.filename ?? ""}
                          fill
                          sizes="28px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <FileIcon className="size-7 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-xs truncate">
                      {attachment.filename ?? t("attachments")}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Panel Item ───

function PanelItem() {
  const t = useTranslations("StudyPage.BottomBar");
  const {
    studyUserChat: {
      context: { personaPanelId },
    },
  } = useStudyContext();

  const [isOpen, setIsOpen] = useState(false);
  const [panelInfo, setPanelInfo] = useState<{
    panelId: number;
    personaCount: number;
    title: string;
  } | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current || !personaPanelId) return;
    fetchedRef.current = true;
    fetchStudyPanelInfo(personaPanelId).then((result) => {
      if (result.success) setPanelInfo(result.data);
    });
  }, [personaPanelId]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 has-[>svg]:px-2 rounded-sm text-xs text-muted-foreground bg-background/80 backdrop-blur-sm"
        >
          <UsersIcon />
          <span>Panel</span>
          {panelInfo && panelInfo.personaCount > 0 && (
            <span className="font-medium text-foreground">{panelInfo.personaCount}</span>
          )}
          <ChevronRightIcon className="size-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 dark:bg-zinc-800" align="end" side="top">
        <div className="px-3 py-2 flex items-center gap-2 bg-muted/30">
          <UsersIcon className="size-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">Panel</span>
          {panelInfo && panelInfo.personaCount > 0 && (
            <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-[10px]">
              {panelInfo.personaCount}
            </Badge>
          )}
        </div>
        <div className="p-3">
          {!panelInfo ? (
            <div className="text-center text-xs text-muted-foreground py-2">{t("noPanel")}</div>
          ) : (
            <div className="space-y-2">
              {panelInfo.title && <div className="text-sm font-medium">{panelInfo.title}</div>}
              <div className="text-xs text-muted-foreground">
                {t("panelTitle", { count: panelInfo.personaCount })}
              </div>
              <Link
                href={`/panel/${panelInfo.panelId}`}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
              >
                <span>{t("goToPanel")}</span>
                <ArrowRightIcon className="size-3" />
              </Link>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Bottom Bar ───

export function StudyBottomBar({ download = false }: { download?: boolean }) {
  return (
    <div className="flex items-center gap-x-6 px-1 py-0.5">
      <StudyArtifactsListPanel popoverSide="top" download={download} />
      <AttachmentsItem />
      <PanelItem />
    </div>
  );
}
