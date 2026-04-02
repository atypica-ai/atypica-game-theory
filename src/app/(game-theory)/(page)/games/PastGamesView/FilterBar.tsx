"use client";

import type { ReactNode } from "react";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "running", label: "Running" },
  { value: "failed", label: "Failed" },
] as const;

export type StatusFilter = (typeof STATUS_OPTIONS)[number]["value"];

export function FilterBar({
  statusFilter,
  onStatusChange,
  participantSearch,
  onParticipantSearchChange,
  sortOrder,
  onSortChange,
}: {
  statusFilter: StatusFilter;
  onStatusChange: (v: StatusFilter) => void;
  participantSearch: string;
  onParticipantSearchChange: (v: string) => void;
  sortOrder: "newest" | "oldest";
  onSortChange: (v: "newest" | "oldest") => void;
}) {
  return (
    <div
      className="px-8 py-3 border-b flex items-center gap-4 flex-wrap"
      style={{ borderColor: "var(--gt-border)", background: "var(--gt-surface)" }}
    >
      {/* Status filter */}
      <div className="flex items-center gap-1">
        {STATUS_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.value}
            active={statusFilter === opt.value}
            onClick={() => onStatusChange(opt.value)}
          >
            {opt.label}
          </FilterChip>
        ))}
      </div>

      <span className="w-px h-4" style={{ background: "var(--gt-border-md)" }} />

      {/* Participant search */}
      <input
        type="text"
        placeholder="Search by persona…"
        value={participantSearch}
        onChange={(e) => onParticipantSearchChange(e.target.value)}
        className="text-[13px] px-3 py-1.5 outline-none"
        style={{
          background: "var(--gt-bg)",
          border: "1px solid var(--gt-border)",
          borderRadius: "0.375rem",
          color: "var(--gt-t1)",
          minWidth: "180px",
          fontFamily: "inherit",
        }}
      />

      <div className="flex-1" />

      {/* Sort */}
      <div className="flex items-center gap-1">
        <span
          className="text-[11px] uppercase mr-1"
          style={{
            color: "var(--gt-t4)",
            fontFamily: "IBMPlexMono, monospace",
            letterSpacing: "0.06em",
          }}
        >
          Sort
        </span>
        <FilterChip active={sortOrder === "newest"} onClick={() => onSortChange("newest")}>
          Newest
        </FilterChip>
        <FilterChip active={sortOrder === "oldest"} onClick={() => onSortChange("oldest")}>
          Oldest
        </FilterChip>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 text-[12px] font-[500] transition-colors"
      style={{
        borderRadius: "0.375rem",
        color: active ? "var(--gt-blue)" : "var(--gt-t3)",
        background: active ? "var(--gt-blue-bg)" : "transparent",
        border: `1px solid ${active ? "var(--gt-blue-border)" : "transparent"}`,
        fontFamily: "inherit",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
