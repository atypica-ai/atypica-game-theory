import "server-only";

import { Logger } from "pino";
import { createGoogleTTSClient } from "./google/client";
import { createVolcanoClient } from "./volcano/client";

/**
 * Simple engine selection based on script and locale
 *
 * Selection rules:
 * - Google TTS: en-US locale, 0-1 hosts (single speaker)
 * - Volcano TTS: all other cases (multi-speaker, other locales)
 */
export function selectTTSEngine(
  hostCount: 1 | 2,
  locale: string,
  logger?: Logger,
): "google" | "volcano" {
  // Google TTS: only for en-US with single speaker
  if (locale === "en-US" && hostCount <= 1) {
    logger?.info({
      msg: "Selected Google TTS",
      locale,
      hostCount,
    });
    return "google";
  }

  // Volcano TTS: for all other cases
  logger?.info({
    msg: "Selected Volcano TTS",
    locale,
    hostCount,
  });
  return "volcano";
}

/**
 * Get the appropriate TTS client based on selection
 */
export function getTTSClient(engine: "google" | "volcano", logger?: Logger) {
  if (engine === "google") {
    return createGoogleTTSClient(logger);
  }
  return createVolcanoClient(logger);
}
