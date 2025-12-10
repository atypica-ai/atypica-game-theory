import { StudyUITools, ToolName } from "@/ai/tools/types";
import { ToolUIPart } from "ai";
import { useTranslations } from "next-intl";

import { fetchPodcastByToken } from "@/app/(study)/artifacts/podcast/actions";
import { AnalystPodcastShareButton } from "@/app/(study)/study/components/AnalystPodcastShareButton";
import { ExtractServerActionData } from "@/lib/serverAction";
import { MicIcon } from "lucide-react";
import { useEffect, useState } from "react";

export const GeneratePodcastResultMessage = ({
  toolInvocation,
}: {
  toolInvocation: Extract<
    ToolUIPart<Pick<StudyUITools, ToolName.generatePodcast>>,
    { state: "output-available" }
  >;
}) => {
  const t = useTranslations("Components.GeneratePodcastResultMessage");
  const [podcast, setPodcast] = useState<
    ExtractServerActionData<typeof fetchPodcastByToken>["podcast"] | null
  >(null);

  useEffect(() => {
    const podcastToken = toolInvocation.output.podcastToken;
    if (podcastToken) {
      fetchPodcastByToken(podcastToken)
        .then((result) => {
          if (!result.success) throw result;
          setPodcast(result.data.podcast);
        })
        .catch((error) => console.log(error));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolInvocation.input, toolInvocation.state]);

  if (!podcast) return null;

  return (
    <div className="">
      <div className="text-sm mt-4 mb-2">{t("podcastGenerated")}</div>
      <AnalystPodcastShareButton podcastToken={podcast.token}>
        <div className="relative mb-4 w-[360px] h-[202.5px] cursor-pointer border border-input/50 rounded-md overflow-hidden bg-muted/50 flex items-center justify-center">
          <MicIcon className="size-12 text-muted-foreground" />
        </div>
      </AnalystPodcastShareButton>
    </div>
  );
};
