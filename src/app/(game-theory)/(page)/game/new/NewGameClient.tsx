"use client";

import {
  createGameSession,
  PersonaForPicker,
  searchPersonasForGame,
} from "@/app/(game-theory)/actions";
import { GameRulesDisplay } from "@/app/(game-theory)/components/GameRulesDisplay";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/lib/useIsMobile";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { UserMenu } from "../../components/UserMenu";

export type GameTypeInfo = {
  name: string;
  displayName: string;
  tagline: string;
  punchline: string;
  minPlayers: number;
  maxPlayers: number;
  horizonLabel: string;
  discussionRounds: number;
  rules?: string;
};

interface NewGameClientProps {
  gameTypes: GameTypeInfo[];
  personas: PersonaForPicker[];
}

// ── Main component ────────────────────────────────────────────────────────────

export function NewGameClient({ gameTypes, personas: initialPersonas }: NewGameClientProps) {
  const router = useRouter();
  const [selectedGameType, setSelectedGameType] = useState(gameTypes[0]?.name ?? "");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discussionRounds, setDiscussionRounds] = useState<number | undefined>(undefined);

  const [searchQuery, setSearchQuery] = useState("");
  const [personas, setPersonas] = useState<PersonaForPicker[]>(initialPersonas);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isMobile = useIsMobile();
  const [mobilePanel, setMobilePanel] = useState<"game" | "participants">("game");

  useEffect(() => {
    const id = setTimeout(() => {
      startTransition(async () => {
        const result = await searchPersonasForGame(searchQuery);
        if (result.success) {
          setPersonas(result.data);
          setSearchError(null);
        } else {
          setSearchError(result.message);
        }
      });
    }, 300);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const activeGameType = gameTypes.find((g) => g.name === selectedGameType);
  const required = activeGameType?.minPlayers ?? 2;
  const max = activeGameType?.maxPlayers ?? 2;
  const canLaunch = selectedIds.length >= required && selectedIds.length <= max && !isLaunching;

  function togglePersona(id: number) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= max) return prev;
      return [...prev, id];
    });
  }

  async function handleLaunch() {
    if (!canLaunch) return;
    setIsLaunching(true);
    setError(null);
    const result = await createGameSession(selectedGameType, selectedIds, discussionRounds);
    if (!result.success) {
      setError(result.message);
      setIsLaunching(false);
      return;
    }
    router.push(`/game/${result.token}`);
  }

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: "var(--gt-bg)" }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        className="shrink-0 border-b"
        style={{ borderColor: "var(--gt-border)", background: "var(--gt-surface)" }}
      >
        <div className="mx-auto flex items-center justify-between h-[60px] px-4 sm:px-8" style={{ maxWidth: "1100px" }}>
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href="/"
              className="text-[13px] transition-colors hover:underline shrink-0"
              style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
            >
              <span className="hidden sm:inline">Game Theory Lab</span>
              <span className="sm:hidden">GTL</span>
            </Link>
            <span className="text-[13px]" style={{ color: "var(--gt-t4)" }}>/</span>
            <span
              className="text-[15px] font-[600]"
              style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
            >
              New Experiment
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/play/new"
              className="flex items-center h-8 px-4 text-[13px] font-[500] transition-opacity hover:opacity-80"
              style={{
                background: "var(--gt-blue)",
                color: "white",
                borderRadius: "0.375rem",
                letterSpacing: "-0.025em",
              }}
            >
              Play
            </Link>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* ── Mobile tab bar ─────────────────────────────────────────────── */}
      {isMobile && (
        <div
          className="shrink-0 flex border-b"
          style={{ borderColor: "var(--gt-border)", background: "var(--gt-surface)" }}
        >
          <button
            onClick={() => setMobilePanel("game")}
            className="flex-1 py-3 text-[12px] uppercase font-[500] border-b-2 transition-colors"
            style={{
              borderBottomColor: mobilePanel === "game" ? "var(--gt-blue)" : "transparent",
              color: mobilePanel === "game" ? "var(--gt-blue)" : "var(--gt-t4)",
              fontFamily: "IBMPlexMono, monospace",
              letterSpacing: "0.1em",
            }}
          >
            01 · Game Type
          </button>
          <button
            onClick={() => setMobilePanel("participants")}
            className="flex-1 py-3 text-[12px] uppercase font-[500] border-b-2 transition-colors"
            style={{
              borderBottomColor: mobilePanel === "participants" ? "var(--gt-blue)" : "transparent",
              color: mobilePanel === "participants" ? "var(--gt-blue)" : "var(--gt-t4)",
              fontFamily: "IBMPlexMono, monospace",
              letterSpacing: "0.1em",
            }}
          >
            02 · Participants ({selectedIds.length}/{required})
          </button>
        </div>
      )}

      {/* ── Two-column body — centered at max-width ──────────────────────── */}
      <div className="flex-1 min-h-0 flex overflow-hidden justify-center">
      <div className="flex overflow-hidden w-full" style={{ maxWidth: "1100px" }}>

        {/* ── Left: Game Type ─────────────────────────────────────────── */}
        <div
          className="flex flex-col overflow-y-auto sm:border-r"
          style={{
            borderColor: "var(--gt-border)",
            flex: isMobile ? undefined : "1.5",
            display: isMobile && mobilePanel !== "game" ? "none" : "flex",
            width: isMobile ? "100%" : undefined,
          }}
        >
          <div className="px-4 sm:px-8 pt-6 pb-4 border-b hidden sm:block" style={{ borderColor: "var(--gt-border)" }}>
            <span
              className="text-[12px] uppercase"
              style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}
            >
              01 · Game Type
            </span>
          </div>

          <div className="flex-1">
            {gameTypes.map((gt) => {
              const isSelected = selectedGameType === gt.name;
              return (
                <div key={gt.name}>
                  {/* Row */}
                  <button
                    onClick={() => setSelectedGameType(gt.name)}
                    className={cn(
                      "w-full flex items-start gap-0 text-left border-b transition-colors",
                      isSelected ? "" : "hover:bg-[var(--gt-row-alt)]",
                    )}
                    style={{
                      borderColor: "var(--gt-border)",
                      borderLeft: isSelected ? "3px solid var(--gt-blue)" : "3px solid transparent",
                      background: isSelected ? "var(--gt-surface)" : "transparent",
                    }}
                  >
                    <div className="flex-1 px-4 sm:px-8 py-6">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className="text-[17px] font-[600] leading-tight"
                          style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
                        >
                          {gt.displayName}
                        </span>
                      </div>
                      <p className="text-[13px] mb-3" style={{ color: "var(--gt-t2)" }}>
                        {gt.punchline}
                      </p>
                      <div className="flex items-center gap-3">
                        <span
                          className="text-[12px]"
                          style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
                        >
                          {gt.minPlayers === gt.maxPlayers
                            ? `${gt.minPlayers} players`
                            : `${gt.minPlayers}–${gt.maxPlayers} players`}
                        </span>
                        <span className="w-px h-3" style={{ background: "var(--gt-border-md)" }} />
                        <span
                          className="text-[12px]"
                          style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
                        >
                          {gt.horizonLabel}
                        </span>
                        {gt.discussionRounds > 0 && (
                          <>
                            <span className="w-px h-3" style={{ background: "var(--gt-border-md)" }} />
                            <span
                              className="text-[12px]"
                              style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
                            >
                              {gt.discussionRounds}× discuss
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div
                      className="shrink-0 w-10 flex items-center justify-center h-full pt-7"
                      style={{ color: "var(--gt-t4)" }}
                    >
                      {isSelected ? "▴" : "▾"}
                    </div>
                  </button>

                  {/* Expanded rules */}
                  {isSelected && (
                    <div
                      className="px-4 sm:px-8 py-6 border-b"
                      style={{ borderColor: "var(--gt-border)", background: "var(--gt-row-alt)" }}
                    >
                      <GameRulesDisplay gameTypeName={gt.name} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: Participants ───────────────────────────────────────── */}
        <div
          className="flex flex-col overflow-hidden"
          style={{
            flex: isMobile ? undefined : "1",
            display: isMobile && mobilePanel !== "participants" ? "none" : "flex",
            width: isMobile ? "100%" : undefined,
          }}
        >
          <div
            className="px-4 sm:px-8 pt-6 pb-4 border-b flex items-center justify-between hidden sm:flex"
            style={{ borderColor: "var(--gt-border)" }}
          >
            <span
              className="text-[12px] uppercase"
              style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}
            >
              02 · Participants
            </span>
            <span
              className="text-[12px] font-[600] tabular-nums transition-colors"
              style={{
                color: selectedIds.length >= required ? "var(--gt-blue)" : "var(--gt-t4)",
                fontFamily: "IBMPlexMono, monospace",
              }}
            >
              {selectedIds.length} / {required}
            </span>
          </div>

          {/* Search input — bottom-border only */}
          <div className="px-4 sm:px-8 pt-5 pb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search personas…"
              className="w-full bg-transparent text-[14px] pb-2 outline-none transition-colors"
              style={{
                color: "var(--gt-t1)",
                borderBottom: "1px solid var(--gt-border-md)",
                caretColor: "var(--gt-blue)",
              }}
            />
          </div>

          <div className="px-4 sm:px-8 pb-3 flex items-center justify-between">
            <span
              className="text-[10px] uppercase"
              style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.06em" }}
            >
              {searchQuery ? `${personas.length} found` : `${personas.length} available`}
            </span>
            {searchError && (
              <span className="text-[10px]" style={{ color: "var(--gt-neg)", fontFamily: "IBMPlexMono, monospace" }}>
                search error
              </span>
            )}
          </div>

          {/* Persona list */}
          <div className={cn("flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-opacity", isPending && "opacity-50")}>
            {personas.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16">
                <span
                  className="text-[11px] uppercase"
                  style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}
                >
                  {searchQuery ? "No results" : "No personas available"}
                </span>
              </div>
            ) : (
              personas.map((persona, i) => {
                const isSelected = selectedIds.includes(persona.id);
                const isDisabled = !isSelected && selectedIds.length >= max;
                return (
                  <button
                    key={persona.id}
                    onClick={() => !isDisabled && togglePersona(persona.id)}
                    disabled={isDisabled}
                    className={cn(
                      "w-full flex items-center gap-3 text-left border-b transition-colors",
                      isSelected ? "" : !isDisabled && "hover:bg-[var(--gt-row-alt)]",
                      isDisabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer",
                    )}
                    style={{
                      borderColor: "var(--gt-border)",
                      borderLeft: isSelected ? "3px solid var(--gt-blue)" : "3px solid transparent",
                      background: isSelected ? "var(--gt-blue-bg)" : "transparent",
                      padding: "14px 28px",
                    }}
                  >
                    <HippyGhostAvatar seed={persona.id} className="size-8 rounded-full shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span
                        className={cn("text-[14px] font-[500] block truncate leading-snug")}
                        style={{ color: isSelected ? "var(--gt-blue)" : "var(--gt-t1)" }}
                      >
                        {persona.name}
                      </span>
                      {persona.source && (
                        <span
                          className="text-[11px] truncate block mt-0.5"
                          style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}
                        >
                          {persona.source}
                        </span>
                      )}
                    </div>
                    <span
                      className="shrink-0 text-[10px] tabular-nums"
                      style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {isSelected && (
                      <span className="shrink-0 text-[13px] font-[600]" style={{ color: "var(--gt-blue)" }}>
                        ✓
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
      </div>

      {/* ── Bottom bar ──────────────────────────────────────────────────── */}
      <div
        className="shrink-0 border-t"
        style={{ borderColor: "var(--gt-border)", background: "var(--gt-surface)" }}
      >
      <div className="mx-auto flex items-center justify-between gap-3 py-4 px-4 sm:px-8 flex-wrap" style={{ maxWidth: "1100px" }}>
        <div>
          {error ? (
            <span className="text-[12px]" style={{ color: "var(--gt-neg)", fontFamily: "IBMPlexMono, monospace" }}>
              {error}
            </span>
          ) : (
            <span
              className="text-[12px]"
              style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
            >
              {selectedIds.length < required
                ? `Select ${required - selectedIds.length} more participant${required - selectedIds.length !== 1 ? "s" : ""}`
                : "Ready to launch"}
            </span>
          )}
        </div>

        {/* Discussion rounds toggle */}
        <div className="flex items-center gap-3">
          <label
            className="flex items-center gap-2 cursor-pointer select-none"
            style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace", fontSize: "12px" }}
          >
            <input
              type="checkbox"
              checked={discussionRounds !== undefined}
              onChange={(e) => setDiscussionRounds(e.target.checked ? 1 : undefined)}
              style={{ accentColor: "var(--gt-blue)", cursor: "pointer" }}
            />
            discussion
          </label>
          {discussionRounds !== undefined && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDiscussionRounds(Math.max(0, discussionRounds - 1))}
                className="w-5 h-5 flex items-center justify-center transition-colors hover:opacity-70"
                style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace", fontSize: "14px" }}
              >
                −
              </button>
              <span
                className="w-4 text-center tabular-nums"
                style={{ color: "var(--gt-t1)", fontFamily: "IBMPlexMono, monospace", fontSize: "13px" }}
              >
                {discussionRounds}
              </span>
              <button
                onClick={() => setDiscussionRounds(discussionRounds + 1)}
                className="w-5 h-5 flex items-center justify-center transition-colors hover:opacity-70"
                style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace", fontSize: "14px" }}
              >
                +
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleLaunch}
          disabled={!canLaunch}
          className="h-9 px-6 text-[13px] font-[500] transition-opacity"
          style={{
            background: canLaunch ? "var(--gt-blue)" : "var(--gt-row-alt)",
            color: canLaunch ? "white" : "var(--gt-t4)",
            borderRadius: "0.375rem",
            cursor: canLaunch ? "pointer" : "not-allowed",
            letterSpacing: "var(--gt-tracking-tight)",
            border: canLaunch ? "none" : "1px solid var(--gt-border-md)",
          }}
        >
          {isLaunching ? (
            <span style={{ fontFamily: "IBMPlexMono, monospace", fontSize: "11px", letterSpacing: "0.1em" }}>
              Launching…
            </span>
          ) : (
            "Launch Experiment →"
          )}
        </button>
      </div>
      </div>
    </div>
  );
}
