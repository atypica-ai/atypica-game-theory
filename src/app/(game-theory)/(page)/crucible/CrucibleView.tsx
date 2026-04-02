"use client";

import HippyGhostAvatar from "@/components/HippyGhostAvatar";

// 100 combatants — seeds spread across a wide range for diverse ghost appearances
const COMBATANTS = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  seed: (i + 1) * 13, // spread seeds for visual variety
}));

// ── Ghost cell ─────────────────────────────────────────────────────────────

function GhostCell({ id, seed }: { id: number; seed: number }) {
  const label = String(id).padStart(2, "0");

  return (
    <div
      className="cr-ghost-cell"
      style={{
        position: "relative",
        overflow: "hidden",
        background: "#080808",
        cursor: "crosshair",
      }}
    >
      {/* Ghost avatar fills the entire cell */}
      <HippyGhostAvatar seed={seed} className="size-full" />

      {/* ID badge — top left */}
      <span
        className="cr-cell-id"
        style={{
          position: "absolute",
          top: 4,
          left: 5,
          fontFamily: "var(--cr-font-mono)",
          fontSize: 9,
          fontWeight: 700,
          color: "rgba(255,255,255,0.22)",
          letterSpacing: "0.05em",
          zIndex: 5,
          pointerEvents: "none",
          lineHeight: 1,
        }}
      >
        {label}
      </span>

      {/* Status strip — bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: "#2a2a00",
          zIndex: 5,
        }}
      />

      {/* Hover red wash */}
      <div
        className="cr-cell-overlay"
        style={{
          position: "absolute",
          inset: 0,
          background: "transparent",
          transition: "background 0.1s",
          zIndex: 4,
        }}
      />
    </div>
  );
}

// ── Stat block ─────────────────────────────────────────────────────────────

function StatBlock({
  value,
  label,
  valueColor = "var(--cr-white)",
}: {
  value: string;
  label: string;
  valueColor?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span
        style={{
          fontFamily: "var(--cr-font-display)",
          fontSize: "clamp(40px, 5vw, 80px)",
          fontWeight: 700,
          color: valueColor,
          lineHeight: 0.9,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: "var(--cr-font-mono)",
          fontSize: 10,
          letterSpacing: "0.18em",
          color: "var(--cr-dim)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Action row ──────────────────────────────────────────────────────────────

function ActionRow({
  status,
  statusColor,
  title,
  desc,
  count,
}: {
  status: string;
  statusColor: string;
  title: string;
  desc: string;
  count?: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "120px 1fr auto",
        alignItems: "center",
        gap: 24,
        borderTop: "1px solid #1a1a1a",
        padding: "28px 0",
        cursor: "pointer",
      }}
    >
      {/* Status tag */}
      <span
        style={{
          fontFamily: "var(--cr-font-mono)",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.15em",
          color: statusColor,
          textTransform: "uppercase",
        }}
      >
        {status}
      </span>

      {/* Title + desc */}
      <div>
        <div
          style={{
            fontFamily: "var(--cr-font-display)",
            fontSize: "clamp(20px, 2.5vw, 36px)",
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: "var(--cr-white)",
            textTransform: "uppercase",
            lineHeight: 1,
            marginBottom: 6,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: "var(--cr-font-mono)",
            fontSize: 11,
            letterSpacing: "0.08em",
            color: "var(--cr-dim)",
          }}
        >
          {desc}
        </div>
      </div>

      {/* Count */}
      {count && (
        <span
          style={{
            fontFamily: "var(--cr-font-mono)",
            fontSize: 11,
            color: "#333",
            letterSpacing: "0.06em",
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────

export function CrucibleView() {
  return (
    <div style={{ background: "var(--cr-bg)", minHeight: "100vh" }}>

      {/* ── Thin top header ───────────────────────────────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          height: 44,
          background: "#000",
          borderBottom: "1px solid #1a0000",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span
            style={{
              fontFamily: "var(--cr-font-display)",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "var(--cr-red)",
              textTransform: "uppercase",
            }}
          >
            THE CRUCIBLE
          </span>
          <span
            style={{
              fontFamily: "var(--cr-font-mono)",
              fontSize: 9,
              color: "#333",
              letterSpacing: "0.1em",
            }}
          >
            ATYPICA TOURNAMENT SYS · v1.0
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* Pulsing status */}
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#333",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: "var(--cr-font-mono)",
                fontSize: 9,
                color: "#333",
                letterSpacing: "0.12em",
              }}
            >
              NO ACTIVE TOURNAMENT
            </span>
          </div>
          <span
            style={{
              fontFamily: "var(--cr-font-mono)",
              fontSize: 9,
              color: "#2a2a2a",
              letterSpacing: "0.1em",
            }}
          >
            100 // REGISTERED
          </span>
        </div>
      </header>

      {/* ── KILL BOARD — ghost grid fills viewport ─────────────────────────── */}
      <section
        className="cr-scanline-sweep"
        style={{
          position: "relative",
          width: "100vw",
          height: "calc(100vh - 44px)",
          // Blood-red grid lines = gap on red background
          display: "grid",
          gridTemplateColumns: "repeat(10, 1fr)",
          gridTemplateRows: "repeat(10, 1fr)",
          gap: "1px",
          background: "var(--cr-grid-line)",
        }}
      >
        {COMBATANTS.map(({ id, seed }) => (
          <GhostCell key={id} id={id} seed={seed} />
        ))}

        {/* Overlay: bottom-left — brutal title */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            zIndex: 10,
            padding: "0 28px 24px",
            background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 100%)",
            paddingTop: 80,
            width: "100%",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            {/* Big title */}
            <div style={{ lineHeight: 0.85 }}>
              <span
                className="cr-title-glitch"
                data-text="THE"
                style={{
                  fontFamily: "var(--cr-font-display)",
                  fontSize: "clamp(64px, 9vw, 130px)",
                  fontWeight: 700,
                  color: "var(--cr-white)",
                  display: "block",
                  letterSpacing: "-0.02em",
                  textTransform: "uppercase",
                }}
              >
                THE
              </span>
              <span
                className="cr-title-glitch"
                data-text="CRUCIBLE"
                style={{
                  fontFamily: "var(--cr-font-display)",
                  fontSize: "clamp(64px, 9vw, 130px)",
                  fontWeight: 700,
                  color: "var(--cr-red)",
                  display: "block",
                  letterSpacing: "-0.02em",
                  textTransform: "uppercase",
                }}
              >
                CRUCIBLE
              </span>
            </div>

            {/* Right: verdict + scroll hint */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 8,
                paddingBottom: 8,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--cr-font-mono)",
                  fontSize: "clamp(10px, 1.1vw, 14px)",
                  letterSpacing: "0.2em",
                  color: "var(--cr-dim)",
                  textTransform: "uppercase",
                }}
              >
                100&nbsp; ENTER
              </span>
              <div
                style={{
                  width: 48,
                  height: 1,
                  background: "var(--cr-red)",
                  alignSelf: "flex-end",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--cr-font-mono)",
                  fontSize: "clamp(10px, 1.1vw, 14px)",
                  letterSpacing: "0.2em",
                  color: "var(--cr-red)",
                  textTransform: "uppercase",
                }}
              >
                1&nbsp; SURVIVES
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Below fold: stats + actions ──────────────────────────────────────── */}
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "80px 40px 0",
        }}
      >
        {/* Stat row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 0,
            borderTop: "1px solid #1a1a1a",
            borderBottom: "1px solid #1a1a1a",
            marginBottom: 0,
          }}
        >
          {[
            { value: "100", label: "Combatants registered", color: "var(--cr-white)" },
            { value: "0", label: "Cycles completed", color: "var(--cr-dim)" },
            { value: "0", label: "Personas terminated", color: "var(--cr-red)" },
            { value: "—", label: "Current champion", color: "var(--cr-amber)" },
          ].map(({ value, label, color }, i) => (
            <div
              key={i}
              style={{
                padding: "36px 32px",
                borderRight: i < 3 ? "1px solid #1a1a1a" : "none",
              }}
            >
              <StatBlock value={value} label={label} valueColor={color} />
            </div>
          ))}
        </div>

        {/* Action rows */}
        <div style={{ paddingBottom: 80 }}>
          <ActionRow
            status="// STANDBY"
            statusColor="#333"
            title="Live Tournament"
            desc="No active slaughter — initiate below to begin"
            count="0 ROUNDS ELAPSED"
          />
          <ActionRow
            status="// ARCHIVES"
            statusColor="var(--cr-dim)"
            title="Past Tournaments"
            desc="Historical cycle records and outcome data"
            count="0 CYCLES"
          />
          <ActionRow
            status="// [REDACTED]"
            statusColor="var(--cr-red)"
            title="Memorial Wall"
            desc="Terminated personas — permanent erasure records"
            count="0 ERASED"
          />
        </div>
      </section>

      {/* ── CTA: full-width initiate button ──────────────────────────────── */}
      <div
        style={{
          borderTop: "1px solid #1a0000",
          background: "#0a0000",
        }}
      >
        <button
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            background: "none",
            border: "none",
            padding: "40px 40px",
            cursor: "pointer",
            fontFamily: "var(--cr-font-display)",
            fontSize: "clamp(18px, 2.8vw, 44px)",
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: "var(--cr-red)",
            textTransform: "uppercase",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#1a0000";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "none";
          }}
        >
          <span>Initiate New Tournament</span>
          <span
            style={{
              fontFamily: "var(--cr-font-mono)",
              fontSize: "clamp(11px, 1.2vw, 16px)",
              letterSpacing: "0.1em",
              color: "#333",
              fontWeight: 400,
            }}
          >
            100 PERSONAS REQUIRED // ADMIN ONLY
          </span>
        </button>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid #111",
          padding: "18px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontFamily: "var(--cr-font-mono)",
            fontSize: 9,
            color: "#222",
            letterSpacing: "0.1em",
          }}
        >
          ATYPICA GAME THEORY LAB
        </span>
        <span
          style={{
            fontFamily: "var(--cr-font-mono)",
            fontSize: 9,
            color: "#222",
            letterSpacing: "0.06em",
          }}
        >
          all eliminations are permanent and irreversible
        </span>
      </footer>
    </div>
  );
}
