import { fetchPodcastByToken } from "@/app/(study)/artifacts/podcast/actions";
import { AnalystPodcastShareButton } from "@/app/(study)/study/components/AnalystPodcastShareButton";
import { StudyToolName, StudyUITools } from "@/app/(study)/tools/types";
import { ExtractServerActionData } from "@/lib/serverAction";
import { ToolUIPart } from "ai";
import { MicIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useState } from "react";

export const GeneratePodcastResultMessage = ({
  toolInvocation,
}: {
  toolInvocation: Extract<
    ToolUIPart<Pick<StudyUITools, StudyToolName.generatePodcast>>,
    { state: "output-available" }
  >;
}) => {
  const t = useTranslations("Components.GeneratePodcastResultMessage");
  const [data, setData] = useState<ExtractServerActionData<typeof fetchPodcastByToken> | null>(
    null,
  );

  useEffect(() => {
    const podcastToken = toolInvocation.output.podcastToken;
    if (podcastToken) {
      fetchPodcastByToken(podcastToken)
        .then((result) => {
          if (!result.success) throw result;
          setData(result.data);
        })
        .catch((error) => console.log(error));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolInvocation.input, toolInvocation.state]);

  if (!data) return null;

  return (
    <div className="">
      <div className="text-sm mt-4 mb-2">{t("podcastGenerated")}</div>
      <AnalystPodcastShareButton podcastToken={data.podcast.token}>
        <div className="relative mb-4 w-[360px] h-[202.5px] cursor-pointer border border-input/50 rounded-md overflow-hidden">
          {data.coverCdnHttpUrl ? (
            <Image src={data.coverCdnHttpUrl} alt="Podcast cover" fill className="object-cover" />
          ) : (
            <div className="w-full h-full bg-muted/50 flex items-center justify-center">
              <MicIcon className="size-12 text-muted-foreground" />
            </div>
          )}
        </div>
      </AnalystPodcastShareButton>
    </div>
  );
};
