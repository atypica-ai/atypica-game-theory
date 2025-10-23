import "server-only";

import { PodcastKind } from "@/app/(podcast)/types";
import { Locale } from "next-intl";
import { podcastScriptDebateSystem } from "./podcastType/debate";
import { podcastScriptDeepDiveSystem } from "./podcastType/deepDive";
import { podcastScriptOpinionOrientedSystem } from "./podcastType/opinionOriented";

export const podcastScriptSystem = ({
  locale,
  podcastKind,
}: {
  locale: Locale;
  podcastKind: PodcastKind;
}) => {
  switch (podcastKind) {
    case "deepDive":
      return podcastScriptDeepDiveSystem({ locale });
    case "opinionOriented":
      return podcastScriptOpinionOrientedSystem({ locale });
    case "debate":
      return podcastScriptDebateSystem({ locale });
  }
};
