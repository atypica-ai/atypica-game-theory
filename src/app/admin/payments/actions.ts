"use server";
import { AdminPermission, checkAdminAuth } from "@/app/admin/utils";
import { PaymentMethod } from "@/app/payment/data";
import { ServerActionResult } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
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
  showAllStatuses: boolean = false,
  pageSize: number = 10,
): Promise<
  ServerActionResult<
    (PaymentRecord & {
      user: User;
      paymentLines: PaymentLine[];
    })[]
  >
> {
  await checkAdminAuth([AdminPermission.MANAGE_PAYMENTS]);
  const skip = (page - 1) * pageSize;

  // Build the where condition based on search query and status filter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  // Add search query filters if provided
  if (searchQuery) {
    where.OR = [
      { orderNo: { contains: searchQuery } },
      { user: { email: { contains: searchQuery } } },
    ];
  }

  // Add status filter if not showing all statuses
  if (!showAllStatuses) {
    where.status = "succeeded";
  }

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
