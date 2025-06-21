import React from "react";

const StatusPage: React.FC = () => {
  return (
    <iframe
      className="w-dvw h-dvh border-none overflow-hidden"
      src="https://uptime-kuma.aws-cn-prod.museai.cc/status/atypica"
      title="Uptime Kuma Status"
      allowFullScreen
    />
  );
};

export default StatusPage;
