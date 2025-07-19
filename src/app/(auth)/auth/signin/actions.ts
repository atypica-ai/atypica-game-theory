"use server";
import authOptions from "@/app/(auth)/authOptions";
import { authClientInfo } from "@/app/(auth)/lib";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";

export async function recordLastLogin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  const user = session.user;
  const lastLogin = await authClientInfo();
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin },
  });
}
