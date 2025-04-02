import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { sendVerificationEmail } from "./email";

export async function POST(req: Request) {
  try {
    const { email, password, invitationCode } = await req.json();

    // Check if email is allowed to register
    if (!email.endsWith("@tezign.com")) {
      // If not a tezign.com email, require a valid invitation code
      if (!invitationCode) {
        return NextResponse.json(
          { error: "Non-tezign.com email addresses require an invitation code" },
          { status: 403 },
        );
      }

      // Verify the invitation code
      const invitation = await prisma.invitationCode.findUnique({
        where: { code: invitationCode },
      });

      if (!invitation) {
        return NextResponse.json({ error: "Invalid invitation code" }, { status: 403 });
      }

      if (invitation.usedBy) {
        return NextResponse.json(
          { error: "This invitation code has already been used" },
          { status: 403 },
        );
      }
    }

    const exists = await prisma.user.findUnique({
      where: { email },
    });
    if (exists) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    const hashedPassword = await hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword },
    });
    await prisma.$transaction([
      prisma.userPointsLog.create({
        data: {
          userId: user.id,
          verb: "recharge",
          points: 300,
        },
      }),
      prisma.userPoints.create({
        data: { userId: user.id, balance: 300 }, // 注册赠送 300 点
      }),
    ]);

    // If an invitation code was used, mark it as used
    if (invitationCode && !email.endsWith("@tezign.com")) {
      await prisma.invitationCode.update({
        where: { code: invitationCode },
        data: {
          usedBy: email,
          usedAt: new Date(),
        },
      });
    }

    await sendVerificationEmail(user.email);

    return NextResponse.json({
      user: {
        email: user.email,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
