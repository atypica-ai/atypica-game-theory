"use server";
import { withAuth } from "@/lib/request/withAuth";
import { prisma } from "@/prisma/prisma";

export async function retrieveLatestPaid(createdAtFrom: Date) {
  return withAuth(async (user) => {
    const paymentRecord = await prisma.paymentRecord.findFirst({
      where: {
        userId: user.id,
        createdAt: {
          gte: createdAtFrom,
        },
        status: "succeeded",
      },
      orderBy: { createdAt: "desc" },
    });
    return paymentRecord;
  });
}

/**
 * 注意：这个方法之前放在了 server action 里，意味着它可以被前端调用，现在移动到了 webhook/lib 下
 */
// export async function handlePaymentSuccess
