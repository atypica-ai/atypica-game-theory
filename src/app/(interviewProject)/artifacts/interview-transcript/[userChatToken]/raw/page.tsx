import { extractInterviewTranscript, InterviewTranscript } from "@/app/(interviewProject)/lib";
import { prisma } from "@/prisma/prisma";
import { notFound } from "next/navigation";
import { InterviewTranscriptDisplay } from "./InterviewTranscriptDisplay";

async function getTranscriptData(userChatToken: string): Promise<{
  transcript: InterviewTranscript;
  sessionInfo: {
    title: string | null;
    createdAt: Date;
    projectBrief: string;
    intervieweeUser: { name: string; email: string | null } | null;
    intervieweePersona: { name: string } | null;
  };
}> {
  // Find the UserChat and related InterviewSession
  const userChat = await prisma.userChat.findUnique({
    where: {
      token: userChatToken,
      kind: "interviewSession",
    },
    select: {
      id: true,
      interviewSession: {
        select: {
          id: true,
          title: true,
          createdAt: true,
          project: {
            select: {
              brief: true,
            },
          },
          intervieweeUser: {
            select: {
              name: true,
              email: true,
            },
          },
          intervieweePersona: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!userChat?.interviewSession) {
    notFound();
  }

  const session = userChat.interviewSession;

  // Extract transcript data
  const transcript = await extractInterviewTranscript(userChat.id);

  return {
    transcript,
    sessionInfo: {
      title: session.title,
      createdAt: session.createdAt,
      projectBrief: session.project.brief,
      intervieweeUser: session.intervieweeUser,
      intervieweePersona: session.intervieweePersona,
    },
  };
}

export default async function InterviewTranscriptPage({
  params,
}: {
  params: Promise<{
    userChatToken: string;
  }>;
}) {
  const { userChatToken } = await params;
  const { transcript, sessionInfo } = await getTranscriptData(userChatToken);
  return <InterviewTranscriptDisplay transcript={transcript} sessionInfo={sessionInfo} />;
}
