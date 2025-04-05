"use server";
import { prisma } from "@/lib/prisma";
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
}) {
  const t = await getTranslations("Auth.SignUp");
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
    throw new Error(t("userAlreadyExists"));
  }

  const hashedPassword = await hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashedPassword },
  });
  await prisma.$transaction([
    prisma.userPointsLog.create({
      data: {
        userId: user.id,
        verb: "signup",
        points: 300,
      },
    }),
    prisma.userPoints.create({
      data: { userId: user.id, balance: 300 }, // 注册赠送 300 点
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
}
