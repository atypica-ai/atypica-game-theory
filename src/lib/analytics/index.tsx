import { googleAdsId, googleAnalyticsMeasurementId } from "./config";
import { GoogleAnalyticsClient } from "./google/ga";
import { SegmentAnalytics } from "./segment";

export default async function Analytics() {
  // if (process.env.NODE_ENV !== "production") {
  //   return null;
  // }
  const [gaId, gadsId] = await Promise.all([googleAnalyticsMeasurementId(), googleAdsId()]);
  return (
    <>
      <GoogleAnalyticsClient gaId={gaId} gadsId={gadsId} />
      <SegmentAnalytics />
    </>
  );
}
