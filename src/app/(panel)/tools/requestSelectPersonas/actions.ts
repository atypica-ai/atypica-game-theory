"use server";

import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";

export type PanelPersonaSummary = {
  id: number;
  token: string;
  name: string;
  tags: string[];
};

export async function fetchPersonasByTokens(
  tokens: string[],
): Promise<ServerActionResult<PanelPersonaSummary[]>> {
  return withAuth(async () => {
    const personas = await prisma.persona.findMany({
      where: { token: { in: tokens } },
      select: { id: true, token: true, name: true, tags: true },
      orderBy: { id: "desc" },
    });
    return { success: true, data: personas };
  });
}

export async function fetchPersonasByIds(
  ids: number[],
): Promise<ServerActionResult<PanelPersonaSummary[]>> {
  return withAuth(async () => {
    if (ids.length === 0) return { success: true, data: [] };
    const personas = await prisma.persona.findMany({
      where: { id: { in: ids } },
      select: { id: true, token: true, name: true, tags: true },
      orderBy: { id: "desc" },
    });
    return { success: true, data: personas };
  });
}
