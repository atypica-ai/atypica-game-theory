"use server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
// import withAuth from "./withAuth";

export async function fetchPersonas({
  scoutUserChatId,
  take = 30,
}: { scoutUserChatId?: number; take?: number } = {}) {
  try {
    const personas = await prisma.persona.findMany({
      where: scoutUserChatId ? { scoutUserChatId } : undefined,
      orderBy: {
        createdAt: "desc",
      },
      take,
    });
    return personas.map((persona) => {
      return {
        ...persona,
        tags: persona.tags as string[],
      };
    });
  } catch (error) {
    console.log("Error fetching personas:", error);
    throw error;
  }
}

export async function fetchPersonaById(personaId: number) {
  try {
    const persona = await prisma.persona.findUnique({
      where: { id: personaId },
    });
    if (!persona) notFound();
    return {
      ...persona,
      tags: persona.tags as string[],
    };
  } catch (error) {
    console.log("Error fetching persona:", error);
    throw error;
  }
}
