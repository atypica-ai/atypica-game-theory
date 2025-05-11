"use server";
import { GoogleAnalytics } from "@next/third-parties/google";
import { googleAnalyticsMeasurementId } from "./config";
import { SegmentAnalytics } from "./segment";

export default async function Analytics() {
  // if (process.env.NODE_ENV !== "production") {
  //   return null;
  // }
  const gaId = await googleAnalyticsMeasurementId();
  return (
    <>
      {gaId && <GoogleAnalytics gaId={gaId} />}
      <SegmentAnalytics />
    </>
  );
}
