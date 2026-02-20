"use client";
import { fetchAttachmentsInStudy } from "@/app/(study)/study/actions";
import { useStudyContext } from "@/app/(study)/study/hooks/StudyContext";
import { FileAttachment } from "@/components/chat/FileAttachment";
import { ExtractServerActionData } from "@/lib/serverAction";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export function AnalystAttachments() {
  const t = useTranslations("StudyPage.ChatBox");
  const {
    studyUserChat: { token: studyUserChatToken },
  } = useStudyContext();
  const [fileUIParts, setFileUIParts] = useState<
    ExtractServerActionData<typeof fetchAttachmentsInStudy>
  >([]);

  useEffect(() => {
    fetchAttachmentsInStudy({ userChatToken: studyUserChatToken }).then((result) => {
      if (!result.success) throw result;
      setFileUIParts(result.data);
    });
  }, [studyUserChatToken]);

  return fileUIParts.length ? (
    <div className="mt-4 flex items-center flex-wrap gap-2 w-full">
      <span className="text-xs text-muted-foreground">{t("attachments")}:</span>
      {fileUIParts.map((attachment, index) => (
        <FileAttachment key={index} attachment={attachment} />
      ))}
    </div>
  ) : null;
}
