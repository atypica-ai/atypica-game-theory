"use server";
import { prisma } from "@/lib/prisma";
import { ServerActionResult } from "@/lib/serverAction";
import { Persona } from "@prisma/client";
// import withAuth from "./withAuth";

export async function fetchPersonas({
  scoutUserChatId,
  take = 30,
}: { scoutUserChatId?: number; take?: number } = {}): Promise<
  ServerActionResult<(Omit<Persona, "tags"> & { tags: string[] })[]>
> {
  const personas = await prisma.persona.findMany({
    where: scoutUserChatId ? { scoutUserChatId } : undefined,
    orderBy: {
      createdAt: "desc",
    },
    take,
  });
  return {
    success: true,
    data: personas.map((persona) => {
      return {
        ...persona,
        tags: persona.tags as string[],
      };
    }),
  };
}

export async function fetchPersonaById(
  personaId: number,
): Promise<ServerActionResult<Omit<Persona, "tags"> & { tags: string[] }>> {
  const persona = await prisma.persona.findUnique({
    where: { id: personaId },
  });
  if (!persona) {
    return {
      success: false,
      code: "not_found",
      message: "Persona not found",
    };
  }
  return {
    success: true,
    data: {
      ...persona,
      tags: persona.tags as string[],
    },
  };
}
