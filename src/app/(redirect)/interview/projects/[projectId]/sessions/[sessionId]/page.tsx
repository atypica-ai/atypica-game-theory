import authOptions from "@/app/(auth)/authOptions";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { forbidden, redirect } from "next/navigation";
import { z } from "zod/v3";

const paramsSchema = z.object({
  projectId: z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) {
      throw new Error("Invalid project ID");
    }
    return num;
  }),
  sessionId: z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) {
      throw new Error("Invalid session ID");
    }
    return num;
  }),
});

export default async function LegacySessionPageRedirect({
  params,
}: {
  params: Promise<z.input<typeof paramsSchema>>;
}) {
  const { projectId, sessionId } = paramsSchema.parse(await params);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    forbidden();
  }
  const interviewSession = await prisma.interviewSession.findUniqueOrThrow({
    where: {
      project: { userId: session.user.id },
      projectId: projectId,
      id: sessionId,
    },
    select: { userChat: { select: { token: true } } },
  });
  if (!interviewSession.userChat) {
    forbidden();
  }
  redirect(`/interview/session/view/${interviewSession.userChat.token}`);
}
