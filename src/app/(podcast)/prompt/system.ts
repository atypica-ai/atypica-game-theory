import "server-only";

import { Locale } from "next-intl";
import { podcastScriptOpinionOrientedSystem } from "./podcastTypes/opinionOriented";
import { podcastScriptDeepDiveSystem } from "./podcastTypes/deepDive";
import { podcastScriptDebateSystem } from "./podcastTypes/debate";

export const podcastScriptSystem = ({ locale, podcastKind }: { locale: Locale; podcastKind?: string }) => {
    switch (podcastKind) {
        case "deepDive":
            return podcastScriptDeepDiveSystem({ locale });
        case "opinionOriented":
            return podcastScriptOpinionOrientedSystem({ locale });
        case "debate":
            return podcastScriptDebateSystem({ locale });
        default:
            // Fallback to deepDive by default for backward compatibility
            return podcastScriptDeepDiveSystem({ locale });
    }
};