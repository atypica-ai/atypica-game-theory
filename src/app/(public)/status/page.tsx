import { getDeployRegion } from "@/lib/request/deployRegion";
import React from "react";

const StatusPage: React.FC = () => {
  const deployRegion = getDeployRegion();
  return (
    <iframe
      className="w-dvw h-[1300px] border-none overflow-hidden"
      src={`https://uptime-kuma.aws-cn-prod.museai.cc/status/${deployRegion === "mainland" ? "atypica-mainland" : "atypica-global"}`}
      title="Uptime Kuma Status"
      allowFullScreen
    />
  );
};

export default StatusPage;
