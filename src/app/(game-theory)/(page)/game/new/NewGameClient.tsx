"use client";

import {
  createGameSession,
  PersonaForPicker,
  searchPersonasForGame,
} from "@/app/(game-theory)/actions";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState, useTransition } from "react";

export type GameTypeInfo = {
  name: string;
  displayName: string;
  tagline: string;
  minPlayers: number;
  maxPlayers: number;
  horizonLabel: string;
  discussionRounds: number;
};

// Payoff matrix for Prisoner's Dilemma (Dal Bó & Fréchette 2011, easy treatment)
const PD_PAYOFFS: Record<string, Record<string, { you: number; them: number }>> = {
  cooperate: {
    cooperate: { you: 51, them: 51 },
    defect: { you: 22, them: 63 },
  },
  defect: {
    cooperate: { you: 63, them: 22 },
    defect: { you: 39, them: 39 },
  },
};

// Per-item accent colors (§5 of style.md)
const TAG_COLORS = ["#3b82f6", "#d97706", "#8b5cf6", "#22d3ee", "#f472b6", "#fb923c", "#93c5fd"];

interface NewGameClientProps {
  gameTypes: GameTypeInfo[];
  personas: PersonaForPicker[];
}

export function NewGameClient({ gameTypes, personas: initialPersonas }: NewGameClientProps) {
  const router = useRouter();
  const [selectedGameType, setSelectedGameType] = useState(gameTypes[0]?.name ?? "");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [personas, setPersonas] = useState<PersonaForPicker[]>(initialPersonas);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Debounced search — 300 ms after last keystroke
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
    const result = await createGameSession(selectedGameType, selectedIds);
    if (!result.success) {
      setError(result.message);
      setIsLaunching(false);
      return;
    }
    router.push(`/game/${result.token}`);
  }

  // Keep selected persona names resolvable even when search filters the list
  const allKnownPersonas = (() => {
    const map = new Map(personas.map((p) => [p.id, p]));
    // Re-inject selected personas that may have been filtered out by search
    initialPersonas.forEach((p) => {
      if (selectedIds.includes(p.id) && !map.has(p.id)) map.set(p.id, p);
    });
    return map;
  })();

  return (
    <div className="h-screen bg-[#09090b] text-white flex flex-col overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between px-8 py-5 border-b border-white/[0.06]"
      >
        <div className="flex items-center gap-3">
          <span className="font-IBMPlexMono text-xs tracking-[0.18em] text-ghost-green">01</span>
          <span className="font-IBMPlexMono text-xs tracking-[0.14em] uppercase text-zinc-500">
            Game Theory Lab
          </span>
        </div>
        <span className="flex items-center gap-2 px-3 py-1.5 border border-ghost-green/[0.3] bg-zinc-900/80">
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-ghost-green"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="font-IBMPlexMono text-xs tracking-[0.17em] uppercase text-ghost-green">
            Simulation Ready
          </span>
        </span>
      </motion.header>

      {/* ── Two-column main ─────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-px bg-white/[0.04]">

        {/* ── Left: Game Type ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="bg-[#09090b] p-8 lg:p-12 overflow-y-auto"
        >
          <div className="flex items-center gap-3 mb-10">
            <span className="font-IBMPlexMono text-xs tracking-[0.18em] text-ghost-green">01</span>
            <span className="font-IBMPlexMono text-xs tracking-[0.14em] uppercase text-zinc-500">
              Game Type
            </span>
          </div>

          <div className="space-y-4">
            {gameTypes.map((gt, i) => (
              <motion.div
                key={gt.name}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.16 + i * 0.06 }}
                onClick={() => setSelectedGameType(gt.name)}
                className={cn(
                  "relative cursor-pointer border transition-colors duration-200 overflow-hidden",
                  selectedGameType === gt.name
                    ? "border-ghost-green/[0.4]"
                    : "border-white/[0.06] hover:border-white/[0.12]",
                )}
              >
                {/* Ghost watermark */}
                <div
                  className="pointer-events-none absolute right-6 top-4 font-EuclidCircularA font-light text-[8rem] leading-none text-white/[0.025]"
                  aria-hidden
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                {/* Selection bar */}
                <div
                  className={cn(
                    "absolute left-0 top-0 h-full w-[3px] transition-colors duration-200",
                    selectedGameType === gt.name ? "bg-ghost-green" : "bg-transparent",
                  )}
                />
                <div className="p-8 pl-10">
                  <h2 className="font-EuclidCircularA text-4xl font-medium mb-2 leading-none">
                    {gt.displayName}
                  </h2>
                  <p className="font-InstrumentSerif italic text-xl text-zinc-500 mb-8">
                    &ldquo;{gt.tagline}&rdquo;
                  </p>
                  <div className="flex items-center gap-8 mb-10">
                    <div>
                      <span className="font-IBMPlexMono text-[10px] tracking-[0.14em] uppercase text-zinc-600 block mb-1.5">
                        Players
                      </span>
                      <span className="font-IBMPlexMono text-sm text-zinc-300">
                        {gt.minPlayers === gt.maxPlayers
                          ? gt.minPlayers
                          : `${gt.minPlayers}–${gt.maxPlayers}`}
                      </span>
                    </div>
                    <div className="w-px h-6 bg-white/[0.06]" />
                    <div>
                      <span className="font-IBMPlexMono text-[10px] tracking-[0.14em] uppercase text-zinc-600 block mb-1.5">
                        Horizon
                      </span>
                      <span className="font-IBMPlexMono text-sm text-zinc-300">
                        {gt.horizonLabel}
                      </span>
                    </div>
                    {gt.discussionRounds > 0 && (
                      <>
                        <div className="w-px h-6 bg-white/[0.06]" />
                        <div>
                          <span className="font-IBMPlexMono text-[10px] tracking-[0.14em] uppercase text-zinc-600 block mb-1.5">
                            Discussion
                          </span>
                          <span className="font-IBMPlexMono text-sm text-zinc-300">
                            {gt.discussionRounds} round{gt.discussionRounds !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Payoff display — game-type specific */}
                  {gt.name === "stag-hunt" && (
                    <div>
                      <span className="font-IBMPlexMono text-[10px] tracking-[0.14em] uppercase text-zinc-600 block mb-4">
                        Payoff Structure
                      </span>
                      <div className="grid grid-cols-2 gap-px bg-white/[0.05] w-fit text-left">
                        {(
                          [
                            { label: "Rabbit", pts: 10, note: "always", color: "text-zinc-200", bg: "bg-[#09090b]" },
                            { label: "Stag · succeed", pts: 25, note: "≥T hunters", color: "text-ghost-green", bg: "bg-ghost-green/[0.05]" },
                            { label: "Stag · fail", pts: 0, note: "<T hunters", color: "text-zinc-600", bg: "bg-[#09090b]" },
                          ] as const
                        ).map(({ label, pts, note, color, bg }) => (
                          <Fragment key={label}>
                            <div className={`${bg} px-4 py-4 min-w-[140px] flex items-center`}>
                              <span className="font-IBMPlexMono text-[9px] tracking-[0.12em] uppercase text-zinc-600">
                                {label}
                              </span>
                            </div>
                            <div className={`${bg} px-5 py-4`}>
                              <span className={`font-EuclidCircularA text-2xl font-light block leading-none mb-1 ${color}`}>
                                {pts}
                              </span>
                              <span className="font-IBMPlexMono text-[9px] text-zinc-700">{note}</span>
                            </div>
                          </Fragment>
                        ))}
                      </div>
                      <p className="font-IBMPlexMono text-[9px] tracking-[0.10em] uppercase text-zinc-700 mt-3">
                        T = roundup(40% × N) · e.g. 4 players in a group of 10
                      </p>
                    </div>
                  )}
                  {gt.name === "prisoner-dilemma" && (
                    <div>
                      <span className="font-IBMPlexMono text-[10px] tracking-[0.14em] uppercase text-zinc-600 block mb-4">
                        Payoff Matrix
                      </span>
                      <div className="grid grid-cols-3 gap-px bg-white/[0.05] w-fit text-left">
                        <div className="bg-[#09090b] px-4 py-3" />
                        {(["cooperate", "defect"] as const).map((col) => (
                          <div key={col} className="bg-[#0e0e10] px-5 py-3 min-w-[110px]">
                            <span className="font-IBMPlexMono text-[9px] tracking-[0.15em] uppercase text-zinc-600">
                              {col}
                            </span>
                          </div>
                        ))}
                        {(["cooperate", "defect"] as const).map((row) => (
                          <Fragment key={row}>
                            <div className="bg-[#0e0e10] px-4 py-4 flex items-center min-w-[110px]">
                              <span className="font-IBMPlexMono text-[9px] tracking-[0.15em] uppercase text-zinc-600">
                                {row}
                              </span>
                            </div>
                            {(["cooperate", "defect"] as const).map((col) => {
                              const cell = PD_PAYOFFS[row][col];
                              const isTempt = row === "defect" && col === "cooperate";
                              const isSucker = row === "cooperate" && col === "defect";
                              return (
                                <div
                                  key={col}
                                  className={cn(
                                    "px-5 py-4",
                                    isTempt
                                      ? "bg-ghost-green/[0.06]"
                                      : isSucker
                                        ? "bg-red-500/[0.05]"
                                        : "bg-[#09090b]",
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "font-EuclidCircularA text-2xl font-light block leading-none mb-1",
                                      isTempt
                                        ? "text-ghost-green"
                                        : isSucker
                                          ? "text-zinc-600"
                                          : "text-zinc-200",
                                    )}
                                  >
                                    {cell.you}
                                  </span>
                                  <span className="font-IBMPlexMono text-[9px] text-zinc-700">
                                    / {cell.them}
                                  </span>
                                </div>
                              );
                            })}
                          </Fragment>
                        ))}
                      </div>
                      <p className="font-IBMPlexMono text-[9px] tracking-[0.10em] uppercase text-zinc-700 mt-3">
                        Row = your choice · Col = their choice · large = your points
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Right: Participants ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.14 }}
          className="bg-[#09090b] p-8 lg:p-12 flex flex-col min-h-0"
        >
          {/* Section header + counter */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="font-IBMPlexMono text-xs tracking-[0.18em] text-ghost-green">02</span>
              <span className="font-IBMPlexMono text-xs tracking-[0.14em] uppercase text-zinc-500">
                Participants
              </span>
            </div>
            <span
              className={cn(
                "font-IBMPlexMono text-xs tracking-[0.14em] tabular-nums transition-colors duration-200",
                selectedIds.length === required ? "text-ghost-green" : "text-zinc-600",
              )}
            >
              {selectedIds.length} / {required}
            </span>
          </div>

          {/* ── Search input ─────────────────────────────────────────────── */}
          <div className="relative mb-4">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-IBMPlexMono text-[10px] tracking-[0.14em] text-zinc-600 pointer-events-none select-none">
              {"//"}
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH PERSONAS"
              className={cn(
                "w-full bg-[#0d0d0f] border text-white font-IBMPlexMono text-xs tracking-[0.12em] uppercase placeholder:text-zinc-700",
                "pl-10 pr-4 py-3 outline-none transition-colors duration-150",
                "focus:border-ghost-green/[0.5] focus:bg-[#0f0f11]",
                searchQuery ? "border-ghost-green/[0.25]" : "border-white/[0.06]",
              )}
            />
            {isPending && (
              <motion.span
                className="absolute right-4 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-ghost-green"
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </div>

          {/* result count line */}
          <div className="flex items-center justify-between mb-3">
            <span className="font-IBMPlexMono text-[9px] tracking-[0.14em] uppercase text-zinc-700">
              {searchQuery ? `${personas.length} found` : `${personas.length} recent`}
            </span>
            {searchError && (
              <span className="font-IBMPlexMono text-[9px] text-red-500 tracking-[0.10em]">
                search error
              </span>
            )}
          </div>

          {/* ── Persona list ─────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto min-h-0 mb-6">
            <div
              className={cn(
                "space-y-px bg-white/[0.04] transition-opacity duration-150",
                isPending && "opacity-50",
              )}
            >
              <AnimatePresence mode="popLayout">
                {personas.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-[#09090b] py-16 flex flex-col items-center gap-3"
                  >
                    <span className="font-IBMPlexMono text-xs tracking-[0.14em] uppercase text-zinc-700">
                      {searchQuery ? "No signals found" : "No personas available"}
                    </span>
                    {!searchQuery && (
                      <span className="font-IBMPlexMono text-[10px] text-zinc-800">
                        Create personas first in atypica
                      </span>
                    )}
                  </motion.div>
                ) : (
                  personas.map((persona, i) => {
                    const isSelected = selectedIds.includes(persona.id);
                    const isDisabled = !isSelected && selectedIds.length >= max;
                    return (
                      <motion.button
                        key={persona.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15, delay: i * 0.015 }}
                        onClick={() => !isDisabled && togglePersona(persona.id)}
                        disabled={isDisabled}
                        className={cn(
                          "relative w-full flex items-center gap-4 px-5 py-4 text-left transition-colors duration-150",
                          isSelected ? "bg-ghost-green/[0.04]" : "bg-[#09090b]",
                          !isDisabled && !isSelected && "hover:bg-white/[0.02]",
                          isDisabled ? "opacity-25 cursor-not-allowed" : "cursor-pointer",
                        )}
                      >
                        <div
                          className={cn(
                            "absolute left-0 top-0 h-full w-[3px] transition-colors duration-150",
                            isSelected ? "bg-ghost-green" : "bg-transparent",
                          )}
                        />
                        <span className="font-IBMPlexMono text-[10px] text-zinc-700 w-5 shrink-0 tabular-nums">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span
                            className={cn(
                              "font-EuclidCircularA text-sm font-medium block truncate leading-snug",
                              isSelected ? "text-white" : "text-zinc-300",
                            )}
                          >
                            {persona.name}
                          </span>
                          {persona.source && (
                            <span className="font-IBMPlexMono text-[9px] tracking-[0.10em] uppercase text-zinc-700 truncate block mt-0.5">
                              {persona.source}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {(persona.tags ?? []).slice(0, 3).map((_, ti) => (
                            <span
                              key={ti}
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: TAG_COLORS[ti % TAG_COLORS.length] }}
                            />
                          ))}
                        </div>
                        {isSelected && (
                          <span className="font-IBMPlexMono text-[10px] text-ghost-green shrink-0">
                            ✓
                          </span>
                        )}
                      </motion.button>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Selected summary */}
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-t border-white/[0.06] pt-5 shrink-0"
            >
              <span className="font-IBMPlexMono text-[9px] tracking-[0.14em] uppercase text-zinc-700 block mb-3">
                Selected participants
              </span>
              <div className="space-y-2">
                {selectedIds.map((id) => {
                  const p = allKnownPersonas.get(id);
                  return p ? (
                    <div key={id} className="flex items-center gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-ghost-green shrink-0" />
                      <span className="font-EuclidCircularA text-sm text-zinc-200">{p.name}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* ── Bottom CTA bar ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="border-t border-white/[0.06] px-8 py-5 flex items-center justify-between bg-[#09090b]"
      >
        <div className="h-5">
          {error ? (
            <span className="font-IBMPlexMono text-xs text-red-400 tracking-[0.10em]">{error}</span>
          ) : (
            <span className="font-IBMPlexMono text-xs tracking-[0.10em] uppercase text-zinc-600">
              {selectedIds.length < required
                ? `Select ${required - selectedIds.length} more participant${required - selectedIds.length !== 1 ? "s" : ""} to continue`
                : "Ready to launch"}
            </span>
          )}
        </div>

        <button
          onClick={handleLaunch}
          disabled={!canLaunch}
          className={cn(
            "h-11 px-8 font-EuclidCircularA text-sm font-medium tracking-[0.04em] transition-all duration-200",
            canLaunch
              ? "bg-ghost-green text-black cursor-pointer hover:bg-ghost-green/90"
              : "bg-zinc-800 text-zinc-600 cursor-not-allowed",
          )}
        >
          {isLaunching ? (
            <span className="font-IBMPlexMono text-xs tracking-[0.16em] uppercase">
              Initializing...
            </span>
          ) : (
            "Launch Experiment →"
          )}
        </button>
      </motion.div>
    </div>
  );
}
