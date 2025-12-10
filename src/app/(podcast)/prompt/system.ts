import "server-only";

import { PodcastKind } from "@/app/(podcast)/types";
import { Locale } from "next-intl";
import { podcastScriptDebateSystem } from "./podcastType/debate";
import { podcastScriptDeepDiveSystem } from "./podcastType/deepDive";
import { podcastScriptFastInsightSystem } from "./podcastType/fastInsight";
import { podcastScriptOpinionOrientedSystem } from "./podcastType/opinionOriented";

export const podcastScriptSystem = ({
  locale,
  podcastKind,
}: {
  locale: Locale;
  podcastKind: PodcastKind | keyof typeof PodcastKind;
}) => {
  switch (podcastKind) {
    case PodcastKind.deepDive:
      return podcastScriptDeepDiveSystem({ locale });
    case PodcastKind.opinionOriented:
      return podcastScriptOpinionOrientedSystem({ locale });
    case PodcastKind.fastInsight:
      return podcastScriptFastInsightSystem({ locale });
    case PodcastKind.debate:
      return podcastScriptDebateSystem({ locale });
    default:
      // Fallback to opinionOriented for unknown kinds
      return podcastScriptOpinionOrientedSystem({ locale });
  }
};
