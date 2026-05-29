"use client";
import { useState, useRef, useEffect } from "react";
import type { GameProps } from "../types";

const MONO = "var(--font-mono, 'JetBrains Mono', monospace)";

const SAMPLE_STRINGS = [
  "ABCABCBB",
  "PWWKEW",
  "AABCDE",
  "DVDF",
  "ANVILN",
  "ABCDEAB",
];

function computeMaxLen(s: string): number {
  const set = new Set<string>();
  let l = 0, max = 0;
  for (let r = 0; r < s.length; r++) {
    while (set.has(s[r])) { set.delete(s[l]); l++; }
    set.add(s[r]);
    if (r - l + 1 > max) max = r - l + 1;
  }
  return max;
}

interface LogEntry {
  l: number;
  r: number;
  windowStr: string;
  len: number;
  event: "expand" | "duplicate" | "shrink";
}

export default function LongestRun({ onSolve, onAttempt }: GameProps) {
  const [strIndex] = useState(() => Math.floor(Math.random() * SAMPLE_STRINGS.length));
  const str = SAMPLE_STRINGS[strIndex];
  const maxLen = computeMaxLen(str);

  const [L, setL] = useState(0);
  const [R, setR] = useState(-1);
  const [windowSet, setWindowSet] = useState<Set<string>>(new Set());
  const [longest, setLongest] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [solved, setSolved] = useState(false);
  const [submitFlash, setSubmitFlash] = useState<"none" | "success" | "error">("none");
  const [duplicateChar, setDuplicateChar] = useState<string | null>(null);
  const solvedRef = useRef(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (solved && !solvedRef.current) {
      solvedRef.current = true;
      const t = setTimeout(() => onSolve(), 800);
      return () => clearTimeout(t);
    }
  }, [solved, onSolve]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  function doAttempt() {
    if (!attempted) { setAttempted(true); onAttempt(); }
  }

  function expand() {
    if (solved || R >= str.length - 1) return;
    doAttempt();
    const newR = R + 1;
    const ch = str[newR];
    if (windowSet.has(ch)) {
      setDuplicateChar(ch);
      setLog(prev => [...prev, {
        l: L, r: newR,
        windowStr: str.slice(L, newR + 1),
        len: newR - L + 1,
        event: "duplicate",
      }]);
    } else {
      const newSet = new Set(windowSet);
      newSet.add(ch);
      setWindowSet(newSet);
      setR(newR);
      setDuplicateChar(null);
      const len = newR - L + 1;
      const newLongest = Math.max(longest, len);
      setLongest(newLongest);
      setLog(prev => [...prev, {
        l: L, r: newR,
        windowStr: str.slice(L, newR + 1),
        len,
        event: "expand",
      }]);
    }
  }

  function shrink() {
    if (solved || L > R) return;
    doAttempt();
    const ch = str[L];
    const newSet = new Set(windowSet);
    newSet.delete(ch);
    const newL = L + 1;
    setWindowSet(newSet);
    setL(newL);
    setLog(prev => [...prev, {
      l: newL, r: R,
      windowStr: str.slice(newL, R + 1),
      len: R - newL + 1,
      event: "shrink",
    }]);
    if (duplicateChar && !newSet.has(str[R + 1] ?? "")) {
      setDuplicateChar(null);
    }
  }

  function submit() {
    doAttempt();
    if (longest === maxLen) {
      setSubmitFlash("success");
      setSolved(true);
    } else {
      setSubmitFlash("error");
      setTimeout(() => setSubmitFlash("none"), 700);
    }
  }

  const currentLen = R >= L ? R - L + 1 : 0;
  const hasDuplicate = duplicateChar !== null;
  const reachedEnd = R >= str.length - 1;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      height: "100%", background: "#0a0a0a",
      fontFamily: MONO, userSelect: "none",
      overflowY: "auto", padding: "24px 16px 40px", boxSizing: "border-box",
    }}>
      {/* Header */}
      <div style={{ width: "100%", maxWidth: 540, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: "#475569", letterSpacing: "0.12em" }}>LONGEST RUN</span>
          <span style={{ fontSize: 10, color: "#10b981" }}>
            LONGEST: <span style={{ fontWeight: 700 }}>{longest}</span>
          </span>
        </div>
        <div style={{ fontSize: 9, color: "#374151", letterSpacing: "0.06em", lineHeight: 1.7 }}>
          EXPAND RIGHT — SHRINK LEFT WHEN DUPLICATE FOUND — FIND LONGEST WINDOW
        </div>
      </div>

      {/* String display */}
      <div style={{ display: "flex", gap: 5, marginBottom: 20, flexWrap: "wrap", justifyContent: "center" }}>
        {str.split("").map((ch, i) => {
          const inWindow = i >= L && i <= R && R >= L;
          const isDupPos = hasDuplicate && i === R + 1 && i < str.length;
          let bg = "#111";
          let border = "1px solid #1e1e1e";
          let color = "#374151";

          if (solved && inWindow) {
            bg = "rgba(34,197,94,0.14)"; border = "1px solid rgba(34,197,94,0.5)"; color = "#22c55e";
          } else if (isDupPos) {
            bg = "rgba(239,68,68,0.14)"; border = "1px solid rgba(239,68,68,0.5)"; color = "#ef4444";
          } else if (inWindow) {
            bg = "rgba(234,179,8,0.1)"; border = "1px solid rgba(234,179,8,0.35)"; color = "#eab308";
          }

          return (
            <div key={i} style={{
              width: 38, height: 46,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              background: bg, border, borderRadius: 5,
              transition: "all 0.15s",
              position: "relative",
            }}>
              <span style={{ fontSize: 15, fontWeight: 700, color }}>{ch}</span>
              <span style={{ fontSize: 7, color: inWindow ? "#92400e" : "#1e1e1e" }}>[{i}]</span>
              {i === L && R >= L && (
                <span style={{ position: "absolute", top: -15, fontSize: 8, color: "#eab308" }}>L</span>
              )}
              {i === R && R >= L && (
                <span style={{ position: "absolute", top: -15, fontSize: 8, color: "#eab308" }}>R</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Status */}
      <div style={{
        marginBottom: 14,
        padding: "8px 20px",
        background: hasDuplicate ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${hasDuplicate ? "rgba(239,68,68,0.3)" : "#1a1a1a"}`,
        borderRadius: 6,
        fontSize: 11, color: hasDuplicate ? "#ef4444" : "#64748b",
        letterSpacing: "0.06em", textAlign: "center",
      }}>
        {hasDuplicate
          ? `DUPLICATE: ${duplicateChar} — SHRINK LEFT`
          : R < L
            ? "PRESS EXPAND TO START"
            : `WINDOW: {${str.slice(L, R + 1).split("").join(", ")}}  LEN ${currentLen}`
        }
      </div>

      {/* Window chars */}
      {R >= L && (
        <div style={{
          marginBottom: 14,
          padding: "6px 14px",
          background: "rgba(234,179,8,0.04)",
          border: "1px solid rgba(234,179,8,0.12)",
          borderRadius: 4,
          fontSize: 10, color: "#92400e",
          letterSpacing: "0.06em",
        }}>
          L={L} · R={R} · chars in window: [{[...windowSet].join(", ")}]
        </div>
      )}

      {/* Buttons */}
      {!solved && (
        <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={expand}
            disabled={R >= str.length - 1}
            style={{
              padding: "9px 18px",
              background: R >= str.length - 1 ? "rgba(16,185,129,0.02)" : "rgba(16,185,129,0.08)",
              border: `1px solid ${R >= str.length - 1 ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.3)"}`,
              borderRadius: 5, cursor: R >= str.length - 1 ? "not-allowed" : "pointer",
              fontSize: 11, color: R >= str.length - 1 ? "#1a4a3a" : "#10b981",
              fontFamily: "inherit", letterSpacing: "0.08em",
              transition: "all 0.12s",
            }}
          >
            EXPAND →
          </button>
          <button
            onClick={shrink}
            disabled={L > R}
            style={{
              padding: "9px 18px",
              background: L > R ? "rgba(234,179,8,0.02)" : "rgba(234,179,8,0.08)",
              border: `1px solid ${L > R ? "rgba(234,179,8,0.08)" : "rgba(234,179,8,0.3)"}`,
              borderRadius: 5, cursor: L > R ? "not-allowed" : "pointer",
              fontSize: 11, color: L > R ? "#4a3a00" : "#eab308",
              fontFamily: "inherit", letterSpacing: "0.08em",
              transition: "all 0.12s",
            }}
          >
            ← SHRINK
          </button>
          {reachedEnd && (
            <button
              onClick={submit}
              style={{
                padding: "9px 18px",
                background: submitFlash === "error" ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
                border: `1px solid ${submitFlash === "error" ? "rgba(239,68,68,0.4)" : "rgba(16,185,129,0.4)"}`,
                borderRadius: 5, cursor: "pointer",
                fontSize: 11, color: submitFlash === "error" ? "#ef4444" : "#10b981",
                fontFamily: "inherit", letterSpacing: "0.08em", fontWeight: 700,
                transition: "all 0.15s",
              }}
            >
              SUBMIT ANSWER
            </button>
          )}
        </div>
      )}

      {submitFlash === "error" && (
        <div style={{ fontSize: 10, color: "#ef4444", marginBottom: 10, letterSpacing: "0.06em" }}>
          NOT THE MAXIMUM YET — KEEP EXPLORING
        </div>
      )}

      {solved && (
        <div style={{
          padding: "14px 24px",
          background: "rgba(34,197,94,0.06)",
          border: "1px solid rgba(34,197,94,0.25)",
          borderRadius: 6, fontSize: 11, color: "#22c55e",
          letterSpacing: "0.08em", textAlign: "center", lineHeight: 1.8, marginBottom: 12,
        }}>
          LONGEST SUBSTRING FOUND: {longest}
          <br />
          <span style={{ fontSize: 9, color: "#4ade80", opacity: 0.7 }}>
            O(n) — EACH CHAR ADDED & REMOVED AT MOST ONCE
          </span>
        </div>
      )}

      {/* Log */}
      {log.length > 0 && (
        <div style={{
          width: "100%", maxWidth: 500,
          maxHeight: 140, overflowY: "auto",
          background: "rgba(255,255,255,0.01)",
          border: "1px solid #141414",
          borderRadius: 4, padding: "8px 12px",
          marginBottom: 16,
        }}>
          {log.map((entry, i) => (
            <div key={i} style={{
              fontSize: 9, lineHeight: 1.7, letterSpacing: "0.04em",
              color: entry.event === "duplicate" ? "#7f1d1d" : entry.event === "shrink" ? "#92400e" : "#374151",
            }}>
              {entry.event === "expand" && `L=${entry.l} R=${entry.r}: ${entry.windowStr} (len ${entry.len})`}
              {entry.event === "duplicate" && `DUPLICATE at R=${entry.r}: ${str[entry.r]} already in window`}
              {entry.event === "shrink" && `SHRINK → L=${entry.l} R=${entry.r}: ${entry.windowStr} (len ${entry.len})`}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      )}

      {/* Footer */}
      <div style={{
        width: "100%", maxWidth: 540,
        padding: "10px 14px",
        background: "rgba(255,255,255,0.01)",
        border: "1px solid #141414",
        borderRadius: 4,
        fontSize: 9, color: "#374151", lineHeight: 1.7, letterSpacing: "0.04em",
      }}>
        EXPAND RIGHT FREELY · DUPLICATE? SHRINK LEFT UNTIL IT'S GONE · SET TRACKS WINDOW CONTENTS
      </div>
    </div>
  );
}
