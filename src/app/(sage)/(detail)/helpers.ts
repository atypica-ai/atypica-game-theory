/**
 * Helper functions for Sage detail pages
 * Can be used in both client and server contexts
 */

import type { SageExtra } from "@/app/(sage)/types";
import type { Sage } from "@/prisma/client";
import type { SageProcessingStatus } from "./types";

/**
 * Determine sage processing status from extra field
 * Can be used in both client and server contexts
 */
export function getSageProcessingStatus(
  sage: Pick<Sage, "id"> & { extra: SageExtra },
): SageProcessingStatus {
  if (sage.extra.error) {
    return "error";
  } else if (sage.extra.processing) {
    if (Date.now() - sage.extra.processing.startsAt < 30 * 60 * 1000) {
      return "processing";
    } else {
      return "timeout";
    }
  } else {
    return "ready";
  }
}
