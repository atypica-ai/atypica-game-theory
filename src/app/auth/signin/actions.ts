"use server";
import { authClientInfo, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
