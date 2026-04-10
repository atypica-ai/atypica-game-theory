"use client";

import { AlertTriangle } from "lucide-react";
import { useCallback, useState } from "react";

interface ErrorDialogProps {
  message: string;
  onRetry: () => void;
  onAbort: () => void;
}

export function ErrorDialog({ message, onRetry, onAbort }: ErrorDialogProps) {
  const [aborting, setAborting] = useState(false);

  const handleAbort = useCallback(() => {
    setAborting(true);
    onAbort();
  }, [onAbort]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "hsl(24 6% 17% / 0.3)", backdropFilter: "blur(2px)" }}
    >
      <div
        className="card-lab p-6 w-full mx-6"
        style={{ maxWidth: "400px" }}
      >
        {/* Icon + title */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
            style={{ background: "var(--gt-neg-bg)", color: "var(--gt-neg)" }}
          >
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3
              className="text-[15px] font-semibold"
              style={{ color: "var(--gt-t1)", letterSpacing: "-0.025em" }}
            >
              Something went wrong
            </h3>
          </div>
        </div>

        {/* Error message */}
        <p
          className="text-[12px] leading-relaxed mb-6 px-1"
          style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
        >
          {message}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleAbort}
            disabled={aborting}
            className="flex-1 h-10 text-[13px] font-semibold rounded-md border transition-colors"
            style={{
              borderColor: "var(--gt-border-md)",
              color: aborting ? "var(--gt-t4)" : "var(--gt-t2)",
              background: "var(--gt-surface)",
              cursor: aborting ? "not-allowed" : "pointer",
            }}
          >
            {aborting ? "Ending..." : "End Game"}
          </button>
          <button
            onClick={onRetry}
            className="btn-lab flex-1 h-10 flex items-center justify-center"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}
