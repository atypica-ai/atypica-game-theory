"use server";
import { sendVerificationCode } from "@/app/auth/verify/lib";
import { createUser } from "@/lib/auth";
import { ServerActionResult } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
import { getTranslations } from "next-intl/server";

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

  const user = await createUser({ email, password });

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

  try {
    await sendVerificationCode(user.email);
  } catch {
    return {
      success: false,
      code: "internal_server_error",
      message: "Failed to send verification code",
    };
  }

  return {
    success: true,
    data: {
      id: user.id,
      email: user.email,
    },
  };
}
