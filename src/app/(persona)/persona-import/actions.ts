"use server";

import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { ChatMessageAttachment, PersonaImport, PersonaImportExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";

export async function createPersonaImport(attachments: ChatMessageAttachment[]): Promise<
  ServerActionResult<
    Omit<PersonaImport, "extra"> & {
      extra: PersonaImportExtra;
    }
  >
> {
  return withAuth(async (user) => {
    if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
      return {
        success: false,
        message: "At least one attachment is required",
      };
    }
    const personaImport = await prisma.personaImport.create({
      data: {
        userId: user.id,
        attachments,
      },
    });
    return {
      success: true,
      data: {
        ...personaImport,
        extra: personaImport.extra as unknown as PersonaImportExtra,
      },
    };
  });
}

export async function fetchPersonaImportById(
  id: number,
): Promise<ServerActionResult<PersonaImport>> {
  return withAuth(async (user) => {
    try {
      const personaImport = await prisma.personaImport.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

      if (!personaImport) {
        return {
          success: false,
          code: "not_found",
          message: "PersonaImport not found",
        };
      }

      return {
        success: true,
        data: personaImport,
      };
    } catch (error) {
      console.error("Error fetching persona import:", error);
      return {
        success: false,
        message: "Failed to fetch persona import",
      };
    }
  });
}

export async function updatePersonaImportExtra(
  id: number,
  extra: any,
): Promise<ServerActionResult<PersonaImport>> {
  return withAuth(async (user) => {
    try {
      // Verify ownership
      const existingImport = await prisma.personaImport.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

      if (!existingImport) {
        return {
          success: false,
          code: "not_found",
          message: "PersonaImport not found",
        };
      }

      const updatedImport = await prisma.personaImport.update({
        where: { id },
        data: { extra },
      });

      return {
        success: true,
        data: updatedImport,
      };
    } catch (error) {
      console.error("Error updating persona import extra:", error);
      return {
        success: false,
        message: "Failed to update persona import extra",
      };
    }
  });
}

export async function updatePersonaImportSummary(
  id: number,
  summary: string,
): Promise<ServerActionResult<PersonaImport>> {
  return withAuth(async (user) => {
    try {
      // Verify ownership
      const existingImport = await prisma.personaImport.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

      if (!existingImport) {
        return {
          success: false,
          code: "not_found",
          message: "PersonaImport not found",
        };
      }

      const updatedImport = await prisma.personaImport.update({
        where: { id },
        data: {
          summary,
        },
      });

      return {
        success: true,
        data: updatedImport,
      };
    } catch (error) {
      console.error("Error updating persona import summary:", error);
      return {
        success: false,
        message: "Failed to update persona import summary",
      };
    }
  });
}

export async function updatePersonaImportAnalysis(
  id: number,
  analysisResult: any,
): Promise<ServerActionResult<PersonaImport>> {
  return withAuth(async (user) => {
    try {
      // Verify ownership
      const existingImport = await prisma.personaImport.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

      if (!existingImport) {
        return {
          success: false,
          code: "not_found",
          message: "PersonaImport not found",
        };
      }

      const updatedImport = await prisma.personaImport.update({
        where: { id },
        data: {
          analysis: analysisResult,
        },
      });

      return {
        success: true,
        data: updatedImport,
      };
    } catch (error) {
      console.error("Error updating persona import analysis:", error);
      return {
        success: false,
        message: "Failed to update persona import analysis",
      };
    }
  });
}
