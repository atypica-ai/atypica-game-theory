"use server";
import { ServerActionResult } from "@/lib/serverAction";
import { Persona } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
// import withAuth from "./withAuth";

export async function fetchPersonas({
  scoutUserChatId,
  page = 1,
  pageSize = 12,
}: { scoutUserChatId?: number; page?: number; pageSize?: number } = {}): Promise<
  ServerActionResult<(Omit<Persona, "tags"> & { tags: string[] })[]>
> {
  const skip = (page - 1) * pageSize;
  const where = scoutUserChatId ? { scoutUserChatId } : undefined;

  const [personas, totalCount] = await Promise.all([
    prisma.persona.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: pageSize,
    }),
    prisma.persona.count({ where }),
  ]);

  return {
    success: true,
    data: personas.map((persona) => {
      return {
        ...persona,
        tags: persona.tags as string[],
      };
    }),
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
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
