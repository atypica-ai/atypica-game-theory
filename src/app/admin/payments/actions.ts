"use server";
import { checkAdminAuth } from "@/app/admin/utils";
import { PaymentMethod } from "@/app/payment/constants";
import { prisma } from "@/lib/prisma";
import { ServerActionResult } from "@/lib/serverAction";
import { PaymentLine, PaymentRecord as PaymentRecordPrisma, User } from "@prisma/client";

export type PaymentRecord = PaymentRecordPrisma & {
  paymentMethod: PaymentMethod;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  credential: Record<"alipay_pc_direct" | "alipay_wap" | "wx_pub", any>;
};

// Get payment records for display
export async function getPaymentRecords(
  page: number = 1,
  searchQuery?: string,
  pageSize: number = 10,
): Promise<
  ServerActionResult<
    (PaymentRecord & {
      user: User;
      paymentLines: PaymentLine[];
    })[]
  >
> {
  await checkAdminAuth();
  const skip = (page - 1) * pageSize;

  // Build the where condition based on search query
  const where = searchQuery
    ? {
        OR: [
          { orderNo: { contains: searchQuery } },
          { user: { email: { contains: searchQuery } } },
        ],
      }
    : {};

  const [records, totalCount] = await Promise.all([
    prisma.paymentRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        paymentLines: true,
        user: true,
      },
      skip,
      take: pageSize,
    }),
    prisma.paymentRecord.count({ where }),
  ]);

  return {
    success: true,
    data: records as (PaymentRecord & {
      user: User;
      paymentLines: PaymentLine[];
    })[],
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}
