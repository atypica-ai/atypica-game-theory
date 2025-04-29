"use server";
import { authClientInfo } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ServerActionResult } from "@/lib/serverAction";
import { hash } from "bcryptjs";
import { getTranslations } from "next-intl/server";
import { sendVerificationEmail } from "../verify/actions";

export async function signUp({
  email,
  password,
  invitationCode,
}: {
  email: string;
  password: string;
  invitationCode?: string;
}): Promise<ServerActionResult<{ id: number; email: string }>> {
  const t = await getTranslations("Auth.SignUp");

  email = email.toLowerCase();

  // 开放注册
  // if (!email.endsWith("@tezign.com")) {
  //   // If not a tezign.com email, require a valid invitation code
  //   if (!invitationCode) {
  //     return NextResponse.json(
  //       { error: "Non-tezign.com email addresses require an invitation code" },
  //       { status: 403 },
  //     );
  //   }
  //   // Verify the invitation code
  //   const invitation = await prisma.invitationCode.findUnique({
  //     where: { code: invitationCode },
  //   });
  //   if (!invitation) {
  //     return NextResponse.json({ error: "Invalid invitation code" }, { status: 403 });
  //   }
  //   if (invitation.usedBy) {
  //     return NextResponse.json(
  //       { error: "This invitation code has already been used" },
  //       { status: 403 },
  //     );
  //   }
  // }

  const exists = await prisma.user.findUnique({
    where: { email },
  });

  if (exists) {
    return {
      success: false,
      message: t("userAlreadyExists"),
    };
  }

  const lastLogin = await authClientInfo();
  const hashedPassword = await hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      lastLogin,
    },
  });
  await prisma.$transaction([
    prisma.userTokensLog.create({
      data: {
        userId: user.id,
        verb: "signup",
        value: 1_500_000,
      },
    }),
    prisma.userTokens.create({
      data: { userId: user.id, balance: 1_500_000 }, // 注册赠送 1_500_000 tokens
    }),
  ]);

  // If an invitation code was used, mark it as used
  // if (invitationCode && !email.endsWith("@tezign.com")) {
  if (invitationCode) {
    await prisma.invitationCode.update({
      where: { code: invitationCode },
      data: {
        usedBy: email,
        usedAt: new Date(),
      },
    });
  }

  await sendVerificationEmail(user.email);

  return {
    success: true,
    data: {
      id: user.id,
      email: user.email,
    },
  };
}
