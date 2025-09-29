"use server";
import crypto from "crypto";

export async function googleAnalyticsMeasurementId() {
  return process.env.GOOGLE_ANALYTICS_MEASUREMENT_ID;
}

export async function googleAdsId() {
  return process.env.GOOGLE_ADS_ID;
}

export async function segmentAnalyticsWriteKey() {
  return process.env.SEGMENT_ANALYTICS_WRITE_KEY;
}

export async function calcIntercomUserHash(userId: string) {
  const key = process.env.INTERCOM_HMAC_SECRET_KEY;
  if (key) {
    return crypto.createHmac("sha256", key).update(userId).digest("hex");
  }
}
