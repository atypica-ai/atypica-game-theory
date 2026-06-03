import { googleAnalyticsMeasurementId } from "./config";
import { GoogleAnalyticsClient } from "./google/ga";

export default async function Analytics() {
  const gaId = await googleAnalyticsMeasurementId();
  return <GoogleAnalyticsClient gaId={gaId} />;
}
