import React from "react";

const StatusPage: React.FC = () => {
  return (
    <div className="flex-1 w-full flex flex-col items-stretch justify-start">
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
