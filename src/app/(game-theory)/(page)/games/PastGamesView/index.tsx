"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
  type FilterFn,
} from "@tanstack/react-table";
import { SessionListItem } from "@/app/(game-theory)/actions";
import { gameTypeRegistry } from "@/app/(game-theory)/gameTypes";
import { GameType } from "@/app/(game-theory)/gameTypes/types";
import { GameSessionParticipant } from "@/app/(game-theory)/types";
import { computeOutcome, formatDateShort, type OutcomeResult } from "./utils";

const GAME_TYPES = Object.values(gameTypeRegistry) as unknown as GameType[];

// ── Precomputed row data ──────────────────────────────────────────────────────

interface SessionTableRow {
  token: string;
  gameType: string;
  gameTypeDisplay: string;
  status: string;
  createdAt: string;
  participants: GameSessionParticipant[];
  participantNames: string; // joined for filtering
  outcome: OutcomeResult | null;
}

function buildRows(sessions: SessionListItem[]): SessionTableRow[] {
  return sessions
    .filter((s) => s.status !== "failed")
    .map((s) => {
      const participants = s.extra.participants ?? [];
      const gt = (gameTypeRegistry as unknown as Record<string, GameType>)[s.gameType];
      return {
        token: s.token,
        gameType: s.gameType,
        gameTypeDisplay: gt?.displayName ?? s.gameType,
        status: s.status,
        createdAt: s.createdAt,
        participants,
        participantNames: participants.map((p) => p.name).join(" "),
        outcome: s.status === "completed" ? computeOutcome(s.events, participants) : null,
      };
    });
}

// ── Custom filter functions ───────────────────────────────────────────────────

const participantFilter: FilterFn<SessionTableRow> = (row, _columnId, filterValue: string) => {
  if (!filterValue) return true;
  return row.original.participantNames.toLowerCase().includes(filterValue.toLowerCase());
};

const statusFilter: FilterFn<SessionTableRow> = (row, _columnId, filterValue: string) => {
  if (!filterValue || filterValue === "all") return true;
  return row.original.status === filterValue;
};

const gameTypeFilterFn: FilterFn<SessionTableRow> = (row, _columnId, filterValue: string) => {
  if (!filterValue || filterValue === "all") return true;
  return row.original.gameType === filterValue;
};

// ── Cell renderers ────────────────────────────────────────────────────────────

function ParticipantChip({ name }: { name: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[11px] mr-1 mb-0.5"
      style={{
        borderRadius: "9999px",
        border: "1px solid var(--gt-border-md)",
        color: "var(--gt-t2)",
        background: "var(--gt-bg)",
        whiteSpace: "nowrap",
      }}
    >
      {name}
    </span>
  );
}

function OutcomeCell({ outcome, participants }: { outcome: OutcomeResult | null; participants: GameSessionParticipant[] }) {
  if (!outcome) return <span style={{ color: "var(--gt-t4)", fontSize: "12px" }}>—</span>;

  if (outcome.isFullTie) {
    return <span className="text-[12px] font-[500]" style={{ color: "var(--gt-warn)" }}>Tie</span>;
  }

  return (
    <div className="flex flex-col gap-0.5">
      {participants.map((p) => {
        const isWinner = outcome.winners.some((w) => w.personaId === p.personaId);
        const score = outcome.scores[p.personaId] ?? 0;
        return (
          <div key={p.personaId} className="flex items-center gap-1.5">
            <span
              className="text-[12px] font-[500] tabular-nums"
              style={{ color: isWinner ? "var(--gt-pos)" : "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
            >
              {score}
            </span>
            <span
              className="text-[12px]"
              style={{
                color: isWinner ? "var(--gt-t1)" : "var(--gt-t3)",
                maxWidth: "120px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {p.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg =
    status === "completed"
      ? { color: "var(--gt-pos)", bg: "var(--gt-pos-bg)", label: "Completed" }
      : status === "running"
        ? { color: "var(--gt-blue)", bg: "var(--gt-blue-bg)", label: "Running" }
        : { color: "var(--gt-t3)", bg: "transparent", label: status };

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-[500]"
      style={{
        borderRadius: "9999px",
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.color}40`,
        fontFamily: "IBMPlexMono, monospace",
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
}

// ── Header controls ───────────────────────────────────────────────────────────

function HeaderLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-[10px] uppercase block mb-1.5"
      style={{
        color: "var(--gt-t4)",
        fontFamily: "IBMPlexMono, monospace",
        letterSpacing: "0.08em",
        fontWeight: 400,
      }}
    >
      {children}
    </span>
  );
}

function SortHeader({
  label,
  sorted,
  onToggle,
}: {
  label: string;
  sorted: false | "asc" | "desc";
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1 group"
      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
    >
      <HeaderLabel>{label}</HeaderLabel>
      <span
        className="text-[10px] mb-1.5"
        style={{ color: sorted ? "var(--gt-blue)" : "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}
      >
        {sorted === "asc" ? "↑" : sorted === "desc" ? "↓" : "↕"}
      </span>
    </button>
  );
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <HeaderLabel>{label}</HeaderLabel>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-[12px] px-2 py-1 outline-none"
        style={{
          background: "var(--gt-bg)",
          border: "1px solid var(--gt-border)",
          borderRadius: "0.375rem",
          color: value && value !== "all" ? "var(--gt-blue)" : "var(--gt-t2)",
          fontFamily: "inherit",
          cursor: "pointer",
          appearance: "none",
          paddingRight: "20px",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 6px center",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SearchFilter({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <HeaderLabel>{label}</HeaderLabel>
      <input
        type="text"
        placeholder="Search…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-[12px] px-2 py-1 outline-none"
        style={{
          background: "var(--gt-bg)",
          border: "1px solid var(--gt-border)",
          borderRadius: "0.375rem",
          color: "var(--gt-t1)",
          fontFamily: "inherit",
          width: "140px",
        }}
      />
    </div>
  );
}

// ── Column definitions ────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<SessionTableRow>();

const columns = [
  columnHelper.accessor("createdAt", {
    id: "date",
    enableSorting: true,
    enableColumnFilter: false,
    cell: (info) => (
      <span style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace", fontSize: "12px", whiteSpace: "nowrap" }}>
        {formatDateShort(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("gameType", {
    id: "gameType",
    enableSorting: false,
    filterFn: gameTypeFilterFn,
    cell: (info) => (
      <span style={{ color: "var(--gt-t2)", fontSize: "13px", whiteSpace: "nowrap" }}>
        {info.row.original.gameTypeDisplay}
      </span>
    ),
  }),
  columnHelper.accessor("participantNames", {
    id: "participants",
    enableSorting: false,
    filterFn: participantFilter,
    cell: (info) => (
      <div className="flex flex-wrap">
        {info.row.original.participants.length > 0
          ? info.row.original.participants.map((p) => <ParticipantChip key={p.personaId} name={p.name} />)
          : <span style={{ color: "var(--gt-t4)", fontSize: "12px" }}>—</span>}
      </div>
    ),
  }),
  columnHelper.accessor("outcome", {
    id: "outcome",
    enableSorting: false,
    enableColumnFilter: false,
    cell: (info) => (
      <OutcomeCell outcome={info.getValue()} participants={info.row.original.participants} />
    ),
  }),
  columnHelper.accessor("status", {
    id: "status",
    enableSorting: false,
    filterFn: statusFilter,
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.display({
    id: "view",
    cell: (info) => (
      <Link
        href={`/game/${info.row.original.token}`}
        className="text-[13px] font-[500] hover:opacity-70 transition-opacity"
        style={{ color: "var(--gt-blue)", whiteSpace: "nowrap" }}
      >
        View →
      </Link>
    ),
  }),
];

// ── Main component ────────────────────────────────────────────────────────────

export function PastGamesView({ sessions }: { sessions: SessionListItem[] }) {
  const rows = useMemo(() => buildRows(sessions), [sessions]);

  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const getFilterValue = (colId: string) =>
    (columnFilters.find((f) => f.id === colId)?.value as string) ?? "";

  const setFilter = (colId: string, value: string) => {
    setColumnFilters((prev) =>
      value && value !== "all"
        ? [...prev.filter((f) => f.id !== colId), { id: colId, value }]
        : prev.filter((f) => f.id !== colId),
    );
  };

  const dateSort = sorting.find((s) => s.id === "date");

  const gameTypeOptions = [
    { value: "all", label: "All games" },
    ...GAME_TYPES.map((gt) => ({ value: gt.name, label: gt.displayName })),
  ];

  const statusOptions = [
    { value: "all", label: "All" },
    { value: "completed", label: "Completed" },
    { value: "running", label: "Running" },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gt-bg)" }}>

      {/* Header */}
      <header
        className="shrink-0 border-b"
        style={{ borderColor: "var(--gt-border)", background: "var(--gt-surface)" }}
      >
        <div
          className="mx-auto flex items-center justify-between h-[60px] px-8"
          style={{ maxWidth: "1200px" }}
        >
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-[13px] hover:underline"
              style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
            >
              Game Theory Lab
            </Link>
            <span style={{ color: "var(--gt-t4)", fontSize: "13px" }}>/</span>
            <span
              className="text-[15px] font-[600]"
              style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
            >
              Past Games
            </span>
          </div>
          <span style={{ color: "var(--gt-t3)", fontSize: "13px" }}>
            {table.getFilteredRowModel().rows.length} sessions
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 py-10 px-8">
        <div
          className="mx-auto"
          style={{
            maxWidth: "1200px",
            background: "var(--gt-surface)",
            border: "1px solid var(--gt-border)",
            borderRadius: "0.5rem",
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--gt-border)",
                  background: "var(--gt-surface)",
                }}
              >
                {/* Date */}
                <th className="px-5 pt-4 pb-3 text-left align-bottom" style={{ width: "90px" }}>
                  <SortHeader
                    label="Date"
                    sorted={dateSort ? (dateSort.desc ? "desc" : "asc") : false}
                    onToggle={() =>
                      setSorting([{ id: "date", desc: dateSort ? !dateSort.desc : true }])
                    }
                  />
                </th>

                {/* Game type */}
                <th className="px-5 pt-4 pb-3 text-left align-bottom" style={{ width: "180px" }}>
                  <SelectFilter
                    label="Game"
                    value={getFilterValue("gameType") || "all"}
                    options={gameTypeOptions}
                    onChange={(v) => setFilter("gameType", v)}
                  />
                </th>

                {/* Participants */}
                <th className="px-5 pt-4 pb-3 text-left align-bottom">
                  <SearchFilter
                    label="Participants"
                    value={getFilterValue("participants")}
                    onChange={(v) => setFilter("participants", v)}
                  />
                </th>

                {/* Outcome */}
                <th className="px-5 pt-4 pb-3 text-left align-bottom" style={{ width: "200px" }}>
                  <HeaderLabel>Outcome</HeaderLabel>
                </th>

                {/* Status */}
                <th className="px-5 pt-4 pb-3 text-left align-bottom" style={{ width: "130px" }}>
                  <SelectFilter
                    label="Status"
                    value={getFilterValue("status") || "all"}
                    options={statusOptions}
                    onChange={(v) => setFilter("status", v)}
                  />
                </th>

                {/* View */}
                <th className="px-5 pt-4 pb-3" style={{ width: "60px" }} />
              </tr>
            </thead>

            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div
                      className="py-16 text-center text-[13px]"
                      style={{ color: "var(--gt-t4)" }}
                    >
                      No sessions match the current filters.
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className="border-b"
                    style={{
                      borderColor: "var(--gt-border)",
                      background: i % 2 === 1 ? "var(--gt-row-alt)" : "transparent",
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-5 py-3 align-top">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {table.getRowModel().rows.length > 0 && (
            <div
              className="px-5 py-3 border-t"
              style={{ borderColor: "var(--gt-border)" }}
            >
              <span style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", fontSize: "11px" }}>
                {table.getFilteredRowModel().rows.length} of {rows.length} sessions
              </span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
