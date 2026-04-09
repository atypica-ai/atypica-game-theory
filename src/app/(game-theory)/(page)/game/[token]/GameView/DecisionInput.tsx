"use client";

import { submitHumanDecision } from "@/app/(game-theory)/humanActions";
import { getGameType } from "@/app/(game-theory)/gameTypes";
import type { HumanInputConfig, HumanInputField, HumanInputFieldVariant } from "@/app/(game-theory)/gameTypes/types";
import { HUMAN_PLAYER_ID, PersonaDecisionEvent } from "@/app/(game-theory)/types";
import { useCallback, useRef, useState } from "react";
import { PanelShell, useCountdown, useDeadline } from "./HumanInputPanel";

// ── Variant → color mapping ─────────────────────────────────────────────────

const VARIANT_COLORS: Record<HumanInputFieldVariant, { color: string; bg: string; border: string }> = {
  positive: { color: "var(--gt-pos)", bg: "var(--gt-pos-bg)", border: "hsl(125 49% 43% / 0.3)" },
  negative: { color: "var(--gt-neg)", bg: "var(--gt-neg-bg)", border: "hsl(2 63% 54% / 0.3)" },
  warning:  { color: "var(--gt-warn)", bg: "var(--gt-warn-bg)", border: "hsl(48 93% 45% / 0.3)" },
  neutral:  { color: "var(--gt-blue)", bg: "var(--gt-blue-bg)", border: "var(--gt-blue-border)" },
};

// ── Enum field component ────────────────────────────────────────────────────

function EnumField({
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
        <span className="text-[11px] font-[600] uppercase" style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.08em" }}>
          {field.label}
        </span>
      )}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${field.options.length}, minmax(0, 1fr))` }}>
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
              <span className="text-[15px] font-[600] leading-tight" style={{ color: colors.color, fontFamily: "var(--gt-font-outfit), system-ui, sans-serif", letterSpacing: "var(--gt-tracking-tight)" }}>
                {opt.label}
              </span>
              <span className="text-[12px] leading-snug" style={{ color: "var(--gt-t3)", fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic" }}>
                {opt.hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Number field component ──────────────────────────────────────────────────

function NumberField({
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
  const clamp = (raw: string) => {
    const n = parseInt(raw, 10);
    if (isNaN(n)) return raw;
    if (n < field.min) return String(field.min);
    if (n > field.max) return String(field.max);
    return String(n);
  };

  return (
    <div className={compact ? "flex flex-col items-center gap-1" : "flex flex-col gap-2"}>
      <label className="text-[11px] font-[600] uppercase" style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.08em" }}>
        {field.label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onChange(clamp(e.target.value))}
        min={field.min}
        max={field.max}
        step={field.step ?? 1}
        disabled={disabled}
        autoFocus={!compact}
        className={`bg-transparent outline-none tabular-nums text-center ${compact ? "w-16 pb-1" : "w-full pb-2"}`}
        style={{
          fontSize: compact ? "16px" : "20px",
          fontWeight: 600,
          color: "var(--gt-t1)",
          fontFamily: "IBMPlexMono, monospace",
          borderBottom: "2px solid var(--gt-border-md)",
          caretColor: "var(--gt-blue)",
        }}
      />
      {field.hint && !compact && (
        <span className="text-[11px]" style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}>
          {field.hint}
        </span>
      )}
      <span className="text-[10px] tabular-nums" style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}>
        {field.min}–{field.max}
      </span>
    </div>
  );
}

// ── Main DecisionInput ──────────────────────────────────────────────────────

export function DecisionInput({
  token,
  roundId,
  gameTypeName,
  currentScores,
  onSubmitted,
}: {
  token: string;
  roundId: number;
  gameTypeName: string;
  currentScores: Record<number, number>;
  onSubmitted: (event: PersonaDecisionEvent) => void;
}) {
  const gameType = getGameType(gameTypeName);
  const config: HumanInputConfig = gameType.humanInput;

  const submittedRef = useRef(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form state — keyed by field key
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of config.fields) {
      if (f.type === "enum") init[f.key] = "";
      else init[f.key] = "";
    }
    return init;
  });

  const setValue = useCallback((key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
    setValidationError(null);
  }, []);

  // Build action object from form values
  const buildAction = useCallback((): Record<string, unknown> | null => {
    const action: Record<string, unknown> = {};
    for (const f of config.fields) {
      const raw = formValues[f.key];
      if (f.type === "enum") {
        if (!raw) return null; // enum not selected
        action[f.key] = raw;
      } else {
        if (raw === "") return null; // number not entered
        const n = parseInt(raw, 10);
        if (isNaN(n) || n < f.min || n > f.max) return null;
        action[f.key] = n;
      }
    }
    if (config.validate) {
      const err = config.validate(action);
      if (err) {
        setValidationError(err);
        return null;
      }
    }
    return action;
  }, [config, formValues]);

  const submitAction = useCallback((action: Record<string, unknown>) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    onSubmitted({
      type: "persona-decision",
      personaId: HUMAN_PLAYER_ID,
      personaName: "You",
      reasoning: null,
      content: action,
      round: roundId,
    });
    void submitHumanDecision(token, action, roundId);
  }, [token, roundId, onSubmitted]);

  const handleSubmit = useCallback(() => {
    const action = buildAction();
    if (action) submitAction(action);
  }, [buildAction, submitAction]);

  // Deadline auto-submit with defaultAction
  const submitRef = useRef(submitAction);
  submitRef.current = submitAction;
  const deadlineRef = useRef(() => {
    submitRef.current(config.defaultAction);
  });
  useDeadline(30_000, deadlineRef);

  const { secondsLeft, progress } = useCountdown(30_000);
  const humanScore = currentScores[HUMAN_PLAYER_ID] ?? 0;

  // Determine layout: multiple number fields → compact row
  const numberFields = config.fields.filter((f): f is Extract<HumanInputField, { type: "number" }> => f.type === "number");
  const enumFields = config.fields.filter((f): f is Extract<HumanInputField, { type: "enum" }> => f.type === "enum");
  const isMultiNumber = numberFields.length > 1;

  // For single-enum-only games, submit immediately on click (no submit button needed)
  const isSingleEnumOnly = enumFields.length === 1 && numberFields.length === 0;

  const handleEnumChange = useCallback((key: string, value: string) => {
    setValue(key, value);
    if (isSingleEnumOnly) {
      // Build action directly with this value
      const action: Record<string, unknown> = { [key]: value };
      submitAction(action);
    }
  }, [setValue, isSingleEnumOnly, submitAction]);

  // Check if form is complete enough to submit
  const isFormComplete = (() => {
    for (const f of config.fields) {
      const raw = formValues[f.key];
      if (f.type === "enum" && !raw) return false;
      if (f.type === "number" && (raw === "" || isNaN(parseInt(raw, 10)))) return false;
    }
    return true;
  })();

  const needsSubmitButton = !isSingleEnumOnly;

  return (
    <PanelShell label="Your Move" round={roundId} secondsLeft={secondsLeft} progress={progress}>
      <div className="px-8 py-5 flex flex-col gap-3">
        {/* Score display */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[12px]" style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}>your score</span>
          <span className="text-[15px] font-[700] tabular-nums" style={{ color: "var(--gt-t1)", fontFamily: "IBMPlexMono, monospace" }}>{humanScore}</span>
        </div>

        {/* Enum fields */}
        {enumFields.map((field) => (
          <EnumField
            key={field.key}
            field={field}
            value={formValues[field.key] || null}
            onChange={(v) => handleEnumChange(field.key, v)}
            disabled={submittedRef.current}
          />
        ))}

        {/* Number fields — compact row if multiple, full-width if single */}
        {isMultiNumber ? (
          <div className="flex items-end justify-center gap-4 py-2">
            {numberFields.map((field) => (
              <NumberField
                key={field.key}
                field={field}
                value={formValues[field.key]}
                onChange={(v) => setValue(field.key, v)}
                disabled={submittedRef.current}
                compact
              />
            ))}
          </div>
        ) : (
          numberFields.map((field) => (
            <NumberField
              key={field.key}
              field={field}
              value={formValues[field.key]}
              onChange={(v) => setValue(field.key, v)}
              disabled={submittedRef.current}
            />
          ))
        )}

        {/* Validation error */}
        {validationError && (
          <span className="text-[12px] text-center" style={{ color: "var(--gt-neg)", fontFamily: "IBMPlexMono, monospace" }}>
            {validationError}
          </span>
        )}

        {/* Submit button (not shown for single-enum-only games) */}
        {needsSubmitButton && (
          <button
            onClick={handleSubmit}
            disabled={!isFormComplete}
            className="h-10 px-6 text-[13px] font-[500] w-full transition-opacity"
            style={{
              background: isFormComplete ? "var(--gt-blue)" : "var(--gt-border-md)",
              color: isFormComplete ? "white" : "var(--gt-t4)",
              borderRadius: "0.375rem",
              cursor: isFormComplete ? "pointer" : "not-allowed",
            }}
          >
            Submit
          </button>
        )}
      </div>
    </PanelShell>
  );
}
