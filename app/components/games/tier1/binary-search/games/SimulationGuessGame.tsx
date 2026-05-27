"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { wrongSound, completionSound } from "@/lib/sounds";
import { simulateDelivery, simulateShipping, isMinimumAnswer } from "@/lib/binarySearchValidator";

type Mechanic = "binary_search_on_answer" | "binary_search_on_answer_hard";

interface Props {
  mechanic: Mechanic;
  onSolve: (attempts: number) => void;
  onAttempt?: () => void;
}

interface Attempt {
  guess: number;
  result: number;
  valid: boolean;
}

type Phase = "idle" | "simulating" | "result" | "complete";

function genDelivery() {
  const n = 6 + Math.floor(Math.random() * 5);
  const items = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 12));
  const maxItem = Math.max(...items);
  const sumItem = items.reduce((a, b) => a + b, 0);
  const lo = maxItem;
  const hi = sumItem * 2;
  const range = hi - lo;
  const answer = lo + 1 + Math.floor(Math.random() * (range * 0.5));
  const target = simulateDelivery(items, answer);
  return { items, target, lo, hi, answer };
}

function genShipping() {
  const n = 5 + Math.floor(Math.random() * 5);
  const items = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 8));
  const maxItem = Math.max(...items);
  const sumItem = items.reduce((a, b) => a + b, 0);
  const lo = maxItem;
  const hi = sumItem;
  const range = hi - lo;
  const answer = lo + 1 + Math.floor(Math.random() * (range * 0.5));
  const target = simulateShipping(items, answer);
  return { items, target, lo, hi, answer };
}

const S: React.CSSProperties = {
  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
};

export default function SimulationGuessGame({ mechanic, onSolve, onAttempt }: Props) {
  const isDelivery = mechanic === "binary_search_on_answer";
  const [items, setItems] = useState<number[]>([]);
  const [target, setTarget] = useState(0);
  const [lo, setLo] = useState(0);
  const [hi, setHi] = useState(0);
  const [guessInput, setGuessInput] = useState("");
  const [currentGuess, setCurrentGuess] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [animStep, setAnimStep] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [message, setMessage] = useState("");
  const [totalTests, setTotalTests] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const label = isDelivery ? "speed" : "capacity";
  const unit = isDelivery ? "hrs" : "days";
  const mechStr = isDelivery ? "delivery" as const : "shipping" as const;

  const init = useCallback(() => {
    const g = isDelivery ? genDelivery() : genShipping();
    setItems(g.items);
    setTarget(g.target);
    setLo(g.lo);
    setHi(g.hi);
    setGuessInput("");
    setCurrentGuess(0);
    setPhase("idle");
    setAttempts([]);
    setAnimStep(0);
    setShowHint(false);
    setTotalTests(0);
    setMessage(
      isDelivery
        ? `${g.items.length} packages. Deliver in ≤ ${g.target} hrs. Find minimum speed.`
        : `${g.items.length} weights. Ship in ≤ ${g.target} days. Find minimum capacity.`
    );
  }, [isDelivery]);

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    if (phase !== "simulating") return;
    if (animStep >= items.length) {
      timerRef.current = setTimeout(() => setPhase("result"), 150);
      return;
    }
    timerRef.current = setTimeout(() => setAnimStep(s => s + 1), 130);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, animStep, items.length]);

  const handleSubmit = () => {
    if (phase !== "idle" || !items.length) return;
    const g = parseInt(guessInput);
    if (isNaN(g) || g <= 0) { setMessage(`Enter positive ${label}.`); return; }

    const sim = isDelivery ? simulateDelivery : simulateShipping;
    const result = sim(items, g);
    const valid = result <= target;
    const newTests = totalTests + 1;

    setCurrentGuess(g);
    setAttempts(prev => [...prev, { guess: g, result, valid }]);
    setTotalTests(newTests);
    if (!valid) onAttempt?.();
    if (newTests >= 3) setShowHint(true);
    setAnimStep(0);
    setPhase("simulating");
  };

  const handleMinimumClaim = () => {
    const last = attempts[attempts.length - 1];
    if (!last?.valid) return;
    const isMin = isMinimumAnswer(items, last.guess, target, mechStr);
    if (isMin) {
      completionSound();
      setPhase("complete");
      setMessage(`✓ Minimum ${label} = ${last.guess}. ${totalTests} tests. Binary search: O(log n).`);
      onSolve(totalTests);
    } else {
      wrongSound();
      onAttempt?.();
      setMessage(`Not minimum — try ${last.guess - 1}. Binary search the lower half.`);
      setPhase("idle");
    }
  };

  const handleTryLower = () => {
    const last = attempts[attempts.length - 1];
    setPhase("idle");
    setGuessInput("");
    if (last) setMessage(`${last.guess} works (${last.result} ${unit}). Binary search lower — try halfway between ${lo} and ${last.guess}.`);
  };

  // Running totals for animation
  let animTotal = 0;
  let animLoad = 0;
  let animDay = 1;
  if (phase === "simulating" && currentGuess > 0 && animStep > 0) {
    if (isDelivery) {
      for (let i = 0; i < animStep; i++) animTotal += Math.ceil(items[i] / currentGuess);
    } else {
      for (let i = 0; i < animStep; i++) {
        if (animLoad + items[i] > currentGuess) { animDay++; animLoad = 0; }
        animLoad += items[i];
      }
      animTotal = animDay;
    }
  }

  const lastAttempt = attempts[attempts.length - 1];

  return (
    <div style={{ ...S, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.1em" }}>
          {isDelivery ? "PACKAGES" : "WEIGHTS"}:
          <span style={{ color: "#e2e8f0", marginLeft: 8 }}>
            {items.length} items | finish ≤ {target} {unit}
          </span>
        </div>
        <div style={{ fontSize: 10, color: "#475569" }}>TESTS: {totalTests}</div>
      </div>

      {/* Items */}
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        {items.map((item, i) => {
          const isActive = phase === "simulating" && i === animStep - 1;
          const isProcessed = phase === "simulating" && i < animStep - 1;
          const showResult = phase === "result" || phase === "complete";
          const bg = isActive
            ? "rgba(234,179,8,0.15)"
            : isProcessed
            ? "rgba(59,130,246,0.08)"
            : showResult && lastAttempt
            ? lastAttempt.valid ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.08)"
            : "#1a1a1a";
          const borderColor = isActive
            ? "#eab308"
            : isProcessed
            ? "rgba(59,130,246,0.4)"
            : showResult && lastAttempt
            ? lastAttempt.valid ? "#22c55e" : "#ef4444"
            : "#2a2a2a";
          return (
            <div key={i} style={{
              width: 36, height: 40, background: bg,
              border: `1.5px solid ${borderColor}`,
              borderRadius: 3, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 1,
              transition: "all 0.08s",
            }}>
              <span style={{ fontSize: 12, color: isActive ? "#eab308" : "#e2e8f0", fontWeight: 600 }}>{item}</span>
              <span style={{ fontSize: 7, color: "#374151" }}>{isDelivery ? "pkg" : "kg"}</span>
            </div>
          );
        })}
      </div>

      {/* Animation counter */}
      {phase === "simulating" && (
        <div style={{
          padding: "8px 12px",
          background: "rgba(234,179,8,0.05)", border: "1px solid rgba(234,179,8,0.2)",
          borderRadius: 4, fontSize: 12, color: "#eab308",
        }}>
          {isDelivery
            ? `${label}=${currentGuess}... ${animTotal} hrs elapsed`
            : `${label}=${currentGuess}... Day ${animTotal}, load ${animLoad}/${currentGuess}`}
        </div>
      )}

      {/* Input */}
      {phase === "idle" && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>
              TEST {label.toUpperCase()} (range: {lo}–{hi})
            </div>
            <input
              type="number"
              value={guessInput}
              onChange={e => setGuessInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder={String(Math.floor((lo + hi) / 2))}
              min={lo}
              max={hi}
              style={{
                width: "100%", padding: "8px 12px",
                background: "#111", border: "1px solid #2a2a2a",
                borderRadius: 4, color: "#e2e8f0", fontFamily: "inherit", fontSize: 13,
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <button onClick={handleSubmit} style={{
            padding: "8px 20px",
            background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)",
            borderRadius: 4, color: "#3b82f6", cursor: "pointer", fontFamily: "inherit", fontSize: 12,
          }}>
            RUN →
          </button>
        </div>
      )}

      {/* Result actions */}
      {phase === "result" && lastAttempt && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{
            padding: "10px 14px",
            background: lastAttempt.valid ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${lastAttempt.valid ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
            borderRadius: 4, fontSize: 12, color: lastAttempt.valid ? "#22c55e" : "#ef4444",
          }}>
            {label} = {lastAttempt.guess} → {lastAttempt.result} {unit}
            {lastAttempt.valid ? ` ✓ (≤ ${target})` : ` ✗ (> ${target}) — too slow`}
          </div>
          {lastAttempt.valid ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleMinimumClaim} style={{
                flex: 1, padding: "9px 0",
                background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
                borderRadius: 4, color: "#22c55e", cursor: "pointer", fontFamily: "inherit", fontSize: 11,
              }}>
                THIS IS MINIMUM
              </button>
              <button onClick={handleTryLower} style={{
                flex: 1, padding: "9px 0",
                background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.3)",
                borderRadius: 4, color: "#f97316", cursor: "pointer", fontFamily: "inherit", fontSize: 11,
              }}>
                TRY LOWER →
              </button>
            </div>
          ) : (
            <button onClick={() => { setPhase("idle"); setGuessInput(""); }} style={{
              padding: "9px 0",
              background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.3)",
              borderRadius: 4, color: "#3b82f6", cursor: "pointer", fontFamily: "inherit", fontSize: 11,
            }}>
              ↑ INCREASE {label.toUpperCase()}
            </button>
          )}
        </div>
      )}

      {/* Attempt chips */}
      {attempts.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {attempts.map((a, i) => (
            <div key={i} style={{
              padding: "3px 8px",
              background: a.valid ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${a.valid ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
              borderRadius: 3, fontSize: 10, color: a.valid ? "#22c55e" : "#ef4444",
            }}>
              {label[0]}={a.guess}:{a.result}{unit[0]}
            </div>
          ))}
        </div>
      )}

      {showHint && phase !== "complete" && (
        <div style={{ padding: "8px 12px", background: "rgba(234,179,8,0.05)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: 4, fontSize: 11, color: "#d97706" }}>
          💡 Higher {label} = fewer {unit}. There's a threshold where it becomes valid — binary search that threshold.
        </div>
      )}

      <div style={{
        padding: "10px 14px",
        background: phase === "complete" ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${phase === "complete" ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 4, fontSize: 12,
        color: phase === "complete" ? "#22c55e" : "#94a3b8",
        lineHeight: 1.5,
      }}>
        {message}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={init} style={{
          padding: "6px 14px", background: "transparent",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4,
          color: "#64748b", cursor: "pointer", fontFamily: "inherit", fontSize: 11, letterSpacing: "0.1em",
        }}>
          RESET
        </button>
      </div>
    </div>
  );
}
