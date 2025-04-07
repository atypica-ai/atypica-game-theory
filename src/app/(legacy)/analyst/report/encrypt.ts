"use server";
import { decryptText, encryptText } from "@/lib/cipher";

export async function encryptAnalystReportUrl(id: number) {
  const encoded = encryptText(id.toString());
  return `/analyst/report/${encodeURIComponent(encoded)}`;
}

export async function decryptAnalystId(token: string) {
  const decoded = decryptText(token);
  return parseInt(decoded);
}
