import { fetchAllSessions } from "@/app/(game-theory)/actions";
import { prisma } from "@/prisma/prisma";
import { PastGamesView } from "./PastGamesView";

export default async function GamesPage() {
  const result = await fetchAllSessions();
  const sessions = result.success ? result.data : [];

  const allPersonaIds = new Set<number>();
  for (const s of sessions) {
    for (const p of s.extra.participants ?? []) {
      if (p.personaId > 0) allPersonaIds.add(p.personaId);
    }
  }

  const personaTags: Record<number, string[]> = {};
  if (allPersonaIds.size > 0) {
    const personas = await prisma.persona.findMany({
      where: { id: { in: [...allPersonaIds] } },
      select: { id: true, tags: true },
    });
    for (const p of personas) {
      personaTags[p.id] = Array.isArray(p.tags) ? (p.tags as string[]) : [];
    }
  }

  return <PastGamesView sessions={sessions} personaTags={personaTags} />;
}
