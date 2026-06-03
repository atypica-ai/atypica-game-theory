"use server";

export async function googleAnalyticsMeasurementId() {
  return process.env.GOOGLE_ANALYTICS_MEASUREMENT_ID;
}
