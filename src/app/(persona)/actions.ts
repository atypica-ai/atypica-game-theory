"use server";
import { analyzeInterviewCompleteness, buildPersonaSummary } from "@/app/(persona)/processing";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { ChatMessageAttachment, PersonaImport, PersonaImportExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";

export async function createPersonaImport({
  objectUrl,
  name,
  size,
  mimeType,
}: ChatMessageAttachment): Promise<
  ServerActionResult<
    Omit<PersonaImport, "extra"> & {
      extra: PersonaImportExtra;
    }
  >
> {
  return withAuth(async (user) => {
    const data = await prisma.personaImport.create({
      data: {
        userId: user.id,
        attachments: [{ objectUrl, name, size, mimeType }],
      },
    });
    const personaImport = {
      ...data,
      attachments: data.attachments as unknown as ChatMessageAttachment[],
      extra: data.extra as unknown as PersonaImportExtra,
    };
    // Start processing immediately in the background using waitUntil
    waitUntil(
      Promise.all([
        buildPersonaSummary(personaImport),
        analyzeInterviewCompleteness(personaImport),
      ]),
    );
    return {
      success: true,
      data: { ...personaImport },
    };
  });
}

export async function reAnalyzePersonaImport(
  personaImportId: number,
): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    // Find the existing PersonaImport
    const personaImport = await prisma.personaImport.findUnique({
      where: { id: personaImportId, userId: user.id },
    });

    if (!personaImport) {
      return {
        success: false,
        message: "Persona import not found",
      };
    }

    // Clear existing results and errors
    await prisma.personaImport.update({
      where: { id: personaImportId },
      data: {
        summary: null,
        analysis: {},
        extra: {},
      },
    });

    const personaImportWithAttachments = {
      ...personaImport,
      attachments: personaImport.attachments as unknown as ChatMessageAttachment[],
    };

    // Start processing again in the background
    waitUntil(
      Promise.all([
        buildPersonaSummary(personaImportWithAttachments),
        analyzeInterviewCompleteness(personaImportWithAttachments),
      ]),
    );

    return {
      success: true,
      data: undefined,
    };
  });
}
