import authOptions from "@/app/(auth)/authOptions";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { forbidden, redirect } from "next/navigation";

// 旧的路由，projects/id, 目前这个 url 在 tokens history 那里还会用到
export default async function LegacyProjectPageRedirect({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const projectId = parseInt((await params).projectId);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    forbidden();
  }
  const { token } = await prisma.interviewProject.findUniqueOrThrow({
    where: { userId: session.user.id, id: projectId },
    select: {
      token: true,
    },
  });
  redirect(`/interview/project/${token}`);
}
