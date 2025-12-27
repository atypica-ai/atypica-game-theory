import { fetchDiscussionTimeline } from "@/app/(panel)/(page)/actions";
import { PanelConsole } from "./PanelConsole";

export default async function PanelTimelineViewPage({
  params,
}: {
  params: Promise<{ timelineToken: string }>;
}) {
  const { timelineToken } = await params;

  const result = await fetchDiscussionTimeline(timelineToken);

  if (!result.success) {
    return <div>Panel timeline not found</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Panel Discussion</h1>
      <PanelConsole timelineToken={timelineToken} />
    </div>
  );
}
