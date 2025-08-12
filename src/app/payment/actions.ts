"use server";
import { withAuth } from "@/lib/request/withAuth";
import { Currency } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { ProductName } from "./data";

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

export type TProductPrices = Record<
  ProductName.TOKENS1M | ProductName.PRO1MONTH | ProductName.MAX1MONTH | ProductName.TEAMSEAT1MONTH,
  Record<Currency, number>
>;

export async function fetchProductPricesAction() {
  const result: TProductPrices = {
    [ProductName.TOKENS1M]: { USD: -1, CNY: -1 },
    [ProductName.PRO1MONTH]: { USD: -1, CNY: -1 },
    [ProductName.MAX1MONTH]: { USD: -1, CNY: -1 },
    [ProductName.TEAMSEAT1MONTH]: { USD: -1, CNY: -1 },
  };
  const products = await prisma.product.findMany();
  products.forEach((product) => {
    let productName:
      | ProductName.TOKENS1M
      | ProductName.PRO1MONTH
      | ProductName.MAX1MONTH
      | ProductName.TEAMSEAT1MONTH;
    if (product.name == "TOKENS1M") {
      productName = ProductName.TOKENS1M;
    } else if (product.name == "PRO1MONTH") {
      productName = ProductName.PRO1MONTH;
    } else if (product.name == "MAX1MONTH") {
      productName = ProductName.MAX1MONTH;
    } else if (product.name == "TEAMSEAT1MONTH") {
      productName = ProductName.TEAMSEAT1MONTH;
    } else {
      return;
    }
    let currency: Currency;
    if (product.currency === "CNY") {
      currency = Currency.CNY;
    } else if (product.currency === "USD") {
      currency = Currency.USD;
    } else {
      return;
    }
    const price = product.price;
    result[productName][currency] = price;
    result[productName][currency] = price;
  });
  return result;
}

/**
 * 注意：这个方法之前放在了 server action 里，意味着它可以被前端调用，现在移动到了 webhook/lib 下
 */
// export async function handlePaymentSuccess
