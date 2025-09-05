"use server";
import { rootLogger } from "./logging";

export async function serverLog(msg: string, context?: Record<string, string | number>) {
  rootLogger.info({ ...context, msg });
}
