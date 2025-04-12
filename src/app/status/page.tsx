import GlobalHeader from "@/components/GlobalHeader";
import React from "react";

const StatusPage: React.FC = () => {
  return (
    <div className="w-dvw h-dvh flex flex-col items-stretch justify-start">
      <GlobalHeader />
      <iframe
        className="w-full h-full border-none overflow-hidden"
        src="https://uptime-kuma.aws-cn-prod.museai.cc/status/atypica"
        title="Uptime Kuma Status"
        allowFullScreen
      />
    </div>
  );
};

export default StatusPage;
