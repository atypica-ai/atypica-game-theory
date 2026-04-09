"use client";

import { getGameType } from "@/app/(game-theory)/gameTypes";
import type {
  HumanInputConfig,
  HumanInputField,
  HumanInputFieldVariant,
} from "@/app/(game-theory)/gameTypes/types";
import { HUMAN_PLAYER_ID } from "@/app/(game-theory)/types";
import { Target } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { useCountdown, useDeadline } from "../HumanInputPanel";

/** Duration for human decision input before auto-submit (ms) */
const DECISION_DEADLINE_MS = 30_000;

// ── Variant colors ────────────────────────────────────────────────────────────

const VARIANT_COLORS: Record<HumanInputFieldVariant, { color: string; bg: string; border: string }> = {
  positive: { color: "var(--gt-pos)", bg: "var(--gt-pos-bg)", border: "hsl(125 49% 43% / 0.3)" },
  negative: { color: "var(--gt-neg)", bg: "var(--gt-neg-bg)", border: "hsl(2 63% 54% / 0.3)" },
  warning:  { color: "var(--gt-warn)", bg: "var(--gt-warn-bg)", border: "hsl(48 93% 45% / 0.3)" },
  neutral:  { color: "var(--gt-blue)", bg: "var(--gt-blue-bg)", border: "var(--gt-blue-border)" },
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface CommitmentCardProps {
  roundId: number;
  gameTypeName: string;
  currentScores: Record<number, number>;
  isSettling: boolean;
  onSubmit: (action: Record<string, unknown>) => void;
}

// ── CommitmentCard ────────────────────────────────────────────────────────────

export function CommitmentCard({
  roundId,
  gameTypeName,
  currentScores,
  isSettling,
  onSubmit,
}: CommitmentCardProps) {
  const gameType = getGameType(gameTypeName);
  const config: HumanInputConfig = gameType.humanInput;
  const submittedRef = useRef(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form state
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of config.fields) init[f.key] = "";
    return init;
  });

  const setValue = useCallback((key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
    setValidationError(null);
  }, []);

  // Build action from form
  const buildAction = useCallback((): Record<string, unknown> | null => {
    const action: Record<string, unknown> = {};
    for (const f of config.fields) {
      const raw = formValues[f.key];
      if (f.type === "enum") {
        if (!raw) return null;
        action[f.key] = raw;
      } else {
        if (raw === "") return null;
        const n = parseInt(raw, 10);
        if (isNaN(n) || n < f.min || n > f.max) return null;
        action[f.key] = n;
      }
    }
    if (config.validate) {
      const err = config.validate(action);
      if (err) { setValidationError(err); return null; }
    }
    return action;
  }, [config, formValues]);

  const submitAction = useCallback((action: Record<string, unknown>) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    onSubmit(action);
  }, [onSubmit]);

  const handleSubmit = useCallback(() => {
    const action = buildAction();
    if (action) submitAction(action);
  }, [buildAction, submitAction]);

  // Deadline
  const submitRef = useRef(submitAction);
  submitRef.current = submitAction;
  const deadlineRef = useRef(() => submitRef.current(config.defaultAction));
  useDeadline(DECISION_DEADLINE_MS, deadlineRef);
  const { secondsLeft, progress } = useCountdown(DECISION_DEADLINE_MS);

  // Field classification
  const numberFields = config.fields.filter(
    (f): f is Extract<HumanInputField, { type: "number" }> => f.type === "number",
  );
  const enumFields = config.fields.filter(
    (f): f is Extract<HumanInputField, { type: "enum" }> => f.type === "enum",
  );
  const isSingleEnumOnly = enumFields.length === 1 && numberFields.length === 0;
  const isMultiNumber = numberFields.length > 1;
  const disabled = submittedRef.current || isSettling;

  const handleEnumChange = useCallback(
    (key: string, value: string) => {
      setValue(key, value);
      if (isSingleEnumOnly) submitAction({ [key]: value });
    },
    [setValue, isSingleEnumOnly, submitAction],
  );

  const isFormComplete = (() => {
    for (const f of config.fields) {
      const raw = formValues[f.key];
      if (f.type === "enum" && !raw) return false;
      if (f.type === "number") {
        if (raw === "") return false;
        const n = parseInt(raw, 10);
        if (isNaN(n) || n < f.min || n > f.max) return false;
      }
    }
    return true;
  })();

  const barColor =
    progress < 0.15 ? "var(--gt-neg)" : progress < 0.4 ? "var(--gt-warn)" : "var(--gt-blue)";

  const humanScore = currentScores[HUMAN_PLAYER_ID] ?? 0;

  return (
    <motion.div
      key="commitment"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="card-lab"
    >
      {/* Timer bar */}
      <div className="h-[3px] w-full rounded-t-md overflow-hidden" style={{ background: "var(--gt-border)" }}>
        <div className="h-full" style={{ width: `${progress * 100}%`, background: barColor, transition: "width 0.25s linear, background 0.6s" }} />
      </div>

      <div className="p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center"
            style={{ background: "var(--gt-row-alt)", color: "var(--gt-blue)" }}
          >
            <Target size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: "var(--gt-t1)", letterSpacing: "-0.03em" }}>
              Final Commitment
            </h2>
            <p className="text-xs" style={{ color: "var(--gt-t3)" }}>
              Select your strategic value for Round {roundId}
              {humanScore > 0 && (
                <span style={{ fontFamily: "IBMPlexMono, monospace" }}> · Score: {humanScore}</span>
              )}
            </p>
          </div>
          <div className="ml-auto">
            <span
              className="text-[12px] tabular-nums"
              style={{ color: progress < 0.4 ? barColor : "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}
            >
              {secondsLeft}s
            </span>
          </div>
        </div>

        <div className="space-y-8">
          {/* Enum fields */}
          {enumFields.map((field) => (
            <EnumFieldUI
              key={field.key}
              field={field}
              value={formValues[field.key] || null}
              onChange={(v) => handleEnumChange(field.key, v)}
              disabled={disabled}
            />
          ))}

          {/* Number fields */}
          {isMultiNumber ? (
            <div className="flex items-end justify-center gap-6 py-2">
              {numberFields.map((field) => (
                <NumberFieldUI
                  key={field.key}
                  field={field}
                  value={formValues[field.key]}
                  onChange={(v) => setValue(field.key, v)}
                  disabled={disabled}
                  compact
                />
              ))}
            </div>
          ) : (
            numberFields.map((field) => (
              <NumberFieldUI
                key={field.key}
                field={field}
                value={formValues[field.key]}
                onChange={(v) => setValue(field.key, v)}
                disabled={disabled}
              />
            ))
          )}

        </div>

        {/* Validation error */}
        {validationError && (
          <p
            className="text-[12px] text-center mt-4"
            style={{ color: "var(--gt-neg)", fontFamily: "IBMPlexMono, monospace" }}
          >
            {validationError}
          </p>
        )}

        {/* Submit button */}
        {!isSingleEnumOnly && (
          <button
            onClick={handleSubmit}
            disabled={!isFormComplete || disabled}
            className="btn-lab w-full mt-8 flex items-center justify-center gap-2 text-lg"
          >
            {isSettling ? "Submitting..." : "SUBMIT DECISION"}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── Enum field ─────────────────────────────────────────────────────────────────

function EnumFieldUI({
  field,
  value,
  onChange,
  disabled,
}: {
  field: Extract<HumanInputField, { type: "enum" }>;
  value: string | null;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      {field.label && (
        <span
          className="text-[11px] font-semibold uppercase"
          style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.08em" }}
        >
          {field.label}
        </span>
      )}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${field.options.length}, minmax(0, 1fr))` }}
      >
        {field.options.map((opt) => {
          const colors = VARIANT_COLORS[opt.variant ?? "neutral"];
          const isChosen = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              disabled={disabled}
              className="flex flex-col items-start gap-2 px-5 py-4 border text-left transition-all"
              style={{
                borderRadius: "0.5rem",
                border: `1.5px solid ${isChosen ? colors.color : colors.border}`,
                background: isChosen ? colors.bg : "transparent",
                cursor: disabled ? "default" : "pointer",
                boxShadow: isChosen ? `0 0 0 1px ${colors.color}` : undefined,
                transform: isChosen ? "scale(1.01)" : undefined,
                transition: "all 0.15s ease",
              }}
            >
              <span
                className="text-[15px] font-semibold leading-tight"
                style={{
                  color: colors.color,
                  fontFamily: "var(--gt-font-outfit), system-ui, sans-serif",
                  letterSpacing: "var(--gt-tracking-tight)",
                }}
              >
                {opt.label}
              </span>
              <span
                className="text-[12px] leading-snug"
                style={{
                  color: "var(--gt-t3)",
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontStyle: "italic",
                }}
              >
                {opt.hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Number field ───────────────────────────────────────────────────────────────

function NumberFieldUI({
  field,
  value,
  onChange,
  disabled,
  compact,
}: {
  field: Extract<HumanInputField, { type: "number" }>;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  compact?: boolean;
}) {
  const n = parseInt(value, 10);
  const outOfRange = value !== "" && !isNaN(n) && (n < field.min || n > field.max);
  const displayValue = value !== "" && !isNaN(n) ? n : field.min;

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-1">
        <label
          className="text-[11px] font-semibold uppercase"
          style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.08em" }}
        >
          {field.label}
        </label>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          step={field.step ?? 1}
          disabled={disabled}
          className="bg-transparent outline-none tabular-nums text-center w-16 pb-1"
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: outOfRange ? "var(--gt-neg)" : "var(--gt-t1)",
            fontFamily: "IBMPlexMono, monospace",
            borderBottom: `2px solid ${outOfRange ? "var(--gt-neg)" : "var(--gt-border-md)"}`,
            caretColor: "var(--gt-blue)",
          }}
        />
        <span
          className="text-[10px] tabular-nums"
          style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}
        >
          {field.min}–{field.max}
        </span>
      </div>
    );
  }

  // Full-width number field with large display + slider (reference style)
  return (
    <div className="space-y-4">
      <div className="text-center">
        <div
          className="text-5xl font-bold mb-2 tabular-nums"
          style={{
            color: outOfRange ? "var(--gt-neg)" : "var(--gt-blue)",
            fontFamily: "IBMPlexMono, monospace",
          }}
        >
          {value === "" ? "—" : n}
        </div>
        <p
          className="text-[10px] font-bold uppercase"
          style={{ letterSpacing: "0.12em", color: "var(--gt-t4)" }}
        >
          {field.label}
        </p>
      </div>

      <div className="space-y-2">
        <input
          type="range"
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
          style={{
            background: "var(--gt-row-alt)",
            accentColor: "var(--gt-blue)",
          }}
        />
        <div
          className="flex justify-between text-[10px] font-bold tabular-nums"
          style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}
        >
          <span>{field.min} (MIN)</span>
          <span>{Math.round((field.min + field.max) / 2)}</span>
          <span>{field.max} (MAX)</span>
        </div>
      </div>
    </div>
  );
}
