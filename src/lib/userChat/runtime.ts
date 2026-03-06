import "server-only";

import { UserChatExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { ITXClientDenyList } from "@prisma/client/runtime/client";
import { Logger } from "pino";

type TxClient = Omit<typeof prisma, ITXClientDenyList>;
const DEFAULT_MANAGED_RUN_POLL_INTERVAL_MS = 10_000;
const MANAGED_RUN_PROGRESS_LOG_INTERVAL_MS = 60_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRunId() {
  return Date.now().toString();
}

/** Parse the start timestamp from a runId. Returns null if runId is missing or invalid. */
export function parseRunStartedAt(runId: string | undefined | null): Date | null {
  if (!runId) return null;
  const ts = Number(runId);
  if (Number.isNaN(ts) || ts <= 0) return null;
  return new Date(ts);
}

// ---------------------------------------------------------------------------
// Low-level DB operations (also used by sub-tools like scout / interview)
// ---------------------------------------------------------------------------

/** Write a new runId into DB. Fails if another run is already active. */
async function startUserChatRun({
  userChatId,
  tx,
}: {
  userChatId: number;
  tx?: TxClient;
}): Promise<{ runId: string }> {
  if (!tx) tx = prisma;
  const runId = buildRunId();
  const updatedRows = await tx.$executeRaw`
    UPDATE "UserChat"
    SET "extra" = jsonb_set(
      COALESCE("extra", '{}'::jsonb) - 'error',
      '{runId}',
      to_jsonb(${runId}::text),
      true
    ),
    "updatedAt" = NOW()
    WHERE "id" = ${userChatId}
      AND COALESCE("extra"->>'runId', '') = ''
  `;
  if (updatedRows === 0) {
    throw new Error("UserChat is already running");
  }
  return { runId };
}

/** Clear runId from DB. If `runId` is given, only clears if it still matches (ownership check). */
export async function clearUserChatRun({
  userChatId,
  runId,
  tx,
}: {
  userChatId: number;
  runId?: string;
  tx?: TxClient;
}): Promise<boolean> {
  if (!tx) tx = prisma;
  let updatedRows = 0;
  if (runId) {
    updatedRows = await tx.$executeRaw`
      UPDATE "UserChat"
      SET "extra" = COALESCE("extra", '{}'::jsonb) - 'runId',
          "updatedAt" = NOW()
      WHERE "id" = ${userChatId}
        AND COALESCE("extra"->>'runId', '') = ${runId}
    `;
  } else {
    // Force-clear (used by stopUserChatRunAction - user initiated stop)
    updatedRows = await tx.$executeRaw`
      UPDATE "UserChat"
      SET "extra" = COALESCE("extra", '{}'::jsonb) - 'runId',
          "updatedAt" = NOW()
      WHERE "id" = ${userChatId}
    `;
  }
  return updatedRows > 0;
}

/** Record error and remove runId atomically. Only succeeds if runId still matches. */
export async function failUserChatRun({
  userChatId,
  runId,
  error,
  tx,
}: {
  userChatId: number;
  runId: string;
  error: string;
  tx?: TxClient;
}): Promise<boolean> {
  if (!tx) tx = prisma;
  const updatedRows = await tx.$executeRaw`
    UPDATE "UserChat"
    SET "extra" = jsonb_set(
      COALESCE("extra", '{}'::jsonb) - 'runId',
      '{error}',
      to_jsonb(${error}::text),
      true
    ),
    "updatedAt" = NOW()
    WHERE "id" = ${userChatId}
      AND COALESCE("extra"->>'runId', '') = ${runId}
  `;
  return updatedRows > 0;
}

/** Check whether a specific runId is still the active one. */
async function isUserChatRunActive({
  userChatId,
  runId,
}: {
  userChatId: number;
  runId: string;
}): Promise<boolean> {
  const userChat = await prisma.userChat.findUnique({
    where: { id: userChatId },
    select: { extra: true },
  });
  return ((userChat?.extra as UserChatExtra | null)?.runId ?? null) === runId;
}

// ---------------------------------------------------------------------------
// Managed Run  –  the high-level API for agent execution entry points
// ---------------------------------------------------------------------------

export interface ManagedRun {
  /** The UUID identifying this execution session. */
  runId: string;
  /** Pass this to streamText / tools. Aborted when runId is invalidated. */
  abortSignal: AbortSignal;
  /** Call when execution finishes normally. Clears runId + stops watcher. */
  cleanup: () => Promise<void>;
}

/**
 * Start a managed run for a UserChat.
 *
 * 1. Writes a new runId into DB (fails if already running).
 * 2. Starts a background watcher that polls DB every `pollIntervalMs`.
 * 3. If runId changes or is cleared ➜ abortController.abort().
 * 4. Returns { runId, abortSignal, cleanup }.
 *
 * The caller uses `abortSignal` however they like (e.g. derive tool + main
 * abort controllers from it).  When done, call `cleanup()`.
 */
export async function startManagedRun({
  userChatId,
  logger,
  pollIntervalMs = DEFAULT_MANAGED_RUN_POLL_INTERVAL_MS,
  timeoutMs = 3_600_000, // 1 hour
}: {
  userChatId: number;
  logger: Logger;
  pollIntervalMs?: number;
  timeoutMs?: number;
}): Promise<ManagedRun> {
  const { runId } = await startUserChatRun({ userChatId });

  const abortController = new AbortController();
  const startTime = Date.now();
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;
  let lastProgressLogAt = startTime;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (timer) clearTimeout(timer);
  };

  const tick = () => {
    if (stopped) return;

    const elapsedMs = Date.now() - startTime;
    if (elapsedMs > timeoutMs) {
      logger.warn({ msg: "managed run timed out", runId, elapsedMs });
      stop();
      if (!abortController.signal.aborted) abortController.abort();
      return;
    }

    isUserChatRunActive({ userChatId, runId })
      .then((active) => {
        if (stopped) return;
        if (!active) {
          logger.info({ msg: "runId invalidated, aborting managed run", runId });
          stop();
          if (!abortController.signal.aborted) abortController.abort();
          return;
        }
        if (Date.now() - lastProgressLogAt >= MANAGED_RUN_PROGRESS_LOG_INTERVAL_MS) {
          const elapsedSeconds = Math.floor(elapsedMs / 1000);
          logger.info({ msg: "managed run ongoing", runId, elapsedSeconds });
          lastProgressLogAt = Date.now();
        }
        timer = setTimeout(tick, pollIntervalMs);
      })
      .catch((err) => {
        logger.error({ msg: "managed run watcher error", error: (err as Error).message });
        if (!stopped) timer = setTimeout(tick, pollIntervalMs);
      });
  };

  // Start first tick immediately
  timer = setTimeout(tick, 0);

  const cleanup = async () => {
    stop();
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    logger.info({ msg: "managed run finished", runId, elapsedSeconds });
    await clearUserChatRun({ userChatId, runId });
  };

  return { runId, abortSignal: abortController.signal, cleanup };
}
