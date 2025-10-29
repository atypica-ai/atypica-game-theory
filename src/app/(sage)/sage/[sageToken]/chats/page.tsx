import authOptions from "@/app/(auth)/authOptions";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { forbidden, notFound } from "next/navigation";
import { getSageByToken } from "../../../lib";
import { ChatsTab } from "./ChatsTab";

export default async function SageChatsPage({
  params,
}: {
  params: Promise<{ sageToken: string }>;
}) {
  const token = (await params).sageToken;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    forbidden();
  }

  const sage = await getSageByToken(token);

  if (!sage) {
    notFound();
  }

  // Check ownership
  if (sage.userId !== session.user.id) {
    forbidden();
  }

  // Fetch all chats associated with this sage
  const chats = await prisma.userChat.findMany({
    where: {
      userId: session.user.id,
      kind: "sageSession",
      extra: {
        path: ["sageId"],
        equals: sage.id,
      },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        take: 1,
        orderBy: { id: "desc" },
      },
    },
  });

  return <ChatsTab sage={sage} chats={chats} />;
}
