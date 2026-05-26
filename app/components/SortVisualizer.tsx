"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { sound } from "@/lib/sound";
import { Corners, Magnetic, fireBurst } from "@/components/Effects";
import {
  Play, Pause, StepForward, Reset, Check, ArrowRight, Flame, Live, Sparkle,
} from "@/components/Glyphs";
import { useProgress } from "@/lib/useProgress";
import { ProgressBadge } from "@/components/ProgressBadge";
import { SortStep, HighlightRole } from "@/lib/sortSteps";
import { SortConfig } from "@/lib/sortConfigs";

const SPEEDS = { slow: 1400, normal: 650, fast: 220 } as const;
type Speed = keyof typeof SPEEDS;

const VIS_PALETTE = [
  { top: "#c4b5fd", bot: "#5b21b6", g: "rgba(167,139,250,0.4)" },
  { top: "#a5f3fc", bot: "#0e7490", g: "rgba(103,232,249,0.35)" },
  { top: "#fde68a", bot: "#92400e", g: "rgba(246,196,83,0.4)" },
  { top: "#fda4af", bot: "#9f1239", g: "rgba(251,113,133,0.35)" },
  { top: "#6ee7b7", bot: "#065f46", g: "rgba(110,231,183,0.35)" },
  { top: "#93c5fd", bot: "#1d4ed8", g: "rgba(147,197,253,0.3)" },
  { top: "#fed7aa", bot: "#7c2d12", g: "rgba(254,215,170,0.3)" },
  { top: "#f9a8d4", bot: "#9d174d", g: "rgba(249,168,212,0.3)" },
];

const ROLE_COLORS: Record<HighlightRole, { top: string; bot: string; g: string }> = {
  comparing:   { top: "#fde68a", bot: "#92400e", g: "rgba(246,196,83,0.7)" },
  pivot:       { top: "#fda4af", bot: "#9f1239", g: "rgba(251,113,133,0.65)" },
  sorted:      { top: "#6ee7b7", bot: "#065f46", g: "rgba(110,231,183,0.55)" },
  minimum:     { top: "#a5f3fc", bot: "#0e7490", g: "rgba(103,232,249,0.55)" },
  inserting:   { top: "#c4b5fd", bot: "#5b21b6", g: "rgba(167,139,250,0.65)" },
  shifting:    { top: "#fde68a", bot: "#b45309", g: "rgba(246,196,83,0.45)" },
  "left-ptr":  { top: "#a5f3fc", bot: "#0e7490", g: "rgba(103,232,249,0.6)" },
  "right-ptr": { top: "#c4b5fd", bot: "#5b21b6", g: "rgba(167,139,250,0.6)" },
  "in-range":  { top: "#cbd5e1", bot: "#475569", g: "rgba(203,213,225,0.2)" },
  placed:      { top: "#fda4af", bot: "#9f1239", g: "rgba(251,113,133,0.5)" },
};

function Telemetry({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
    }}>
      <span style={{ fontSize: 11, color: "rgba(235,233,227,0.55)" }}>{label}</span>
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600,
        color: accent, textShadow: `0 0 8px ${accent}40`,
      }}>{value}</span>
    </div>
  );
}

function CodeLine({ n, active, indent = 0, children }: {
  n: number; active: boolean; indent?: number; children: React.ReactNode;
}) {
  return (
    <div style={{
      display: "flex", gap: 10, alignItems: "center",
      background: active ? "rgba(246,196,83,0.08)" : "transparent",
      borderLeft: "2px solid " + (active ? "#f6c453" : "transparent"),
      paddingLeft: 8, marginLeft: -10, transition: "all 0.2s",
    }}>
      <span style={{ color: "rgba(235,233,227,0.25)", width: 16, textAlign: "right", fontSize: 10 }}>{n}</span>
      <span style={{ paddingLeft: indent * 14, color: active ? "#ebe9e3" : "rgba(235,233,227,0.55)" }}>
        {children}
      </span>
    </div>
  );
}

function ComboMeter({ combo }: { combo: number }) {
  const tier = combo >= 5 ? "BLAZE" : combo >= 3 ? "HEATED" : combo >= 1 ? "WARMING" : "COLD";
  const color = combo >= 5 ? "#f6c453" : combo >= 3 ? "#fb7185" : combo >= 1 ? "#a78bfa" : "rgba(235,233,227,0.4)";
  const hot = combo >= 3;
  return (
    <div style={{ position: "relative" }}>
      <Corners color={hot ? "rgba(246,196,83,0.4)" : "rgba(255,255,255,0.12)"} size={10} thickness={1} />
      <div style={{
        padding: "14px 16px",
        background: hot
          ? "linear-gradient(135deg, rgba(246,196,83,0.08), rgba(251,113,133,0.05))"
          : "rgba(12,12,20,0.6)",
        border: "1px solid " + (hot ? "rgba(246,196,83,0.25)" : "rgba(255,255,255,0.06)"),
        borderRadius: 12, transition: "all 0.3s",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.22em", color: "rgba(235,233,227,0.4)" }}>COMBO</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em", color }}>{tier}</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 32, fontWeight: 700,
            color: combo > 0 ? color : "rgba(235,233,227,0.3)",
            textShadow: combo > 0 ? `0 0 14px ${color}80` : "none",
            transition: "all 0.3s",
          }}>×{combo}</span>
          {combo >= 3 && (
            <span style={{ animation: "float-y 1.4s ease-in-out infinite" }}>
              <Flame size={14} color={color} />
            </span>
          )}
        </div>
        <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: Math.min(100, combo * 20) + "%",
            background: `linear-gradient(90deg, ${color}, ${color}40)`,
            transition: "width 0.4s cubic-bezier(.16,1,.3,1)",
            boxShadow: combo > 0 ? `0 0 8px ${color}` : "none",
          }} />
        </div>
      </div>
    </div>
  );
}

interface SortVisualizerProps {
  config: SortConfig;
}

export default function SortVisualizer({ config }: SortVisualizerProps) {
  const {
    algoLabel, title, subtitle, estimatedTime, reward, coachWhisper,
    topicSlug, xpAmount, initialArray, generateSteps, comboTriggers,
    nextSlug, pseudocode, telemetry,
  } = config;

  const [steps] = useState<SortStep[]>(() => generateSteps(initialArray));
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>("normal");
  const [done, setDone] = useState(false);
  const [combo, setCombo] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeRef = useRef(false);
  const { progress, upsert } = useProgress(topicSlug, steps.length);

  const step = steps[idx];
  const MAX_VAL = Math.max(...initialArray);

  const advance = useCallback(() => {
    setIdx((prev) => {
      const next = prev + 1;
      if (next >= steps.length) {
        setPlaying(false);
        setDone(true);
        if (!completeRef.current) {
          completeRef.current = true;
          upsert(steps.length);
          sound.win();
          fireBurst(null, xpAmount, "XP");
        }
        return prev;
      }
      const s = steps[next];
      if (comboTriggers.includes(s.type)) {
        sound.swap();
        setCombo((c) => c + 1);
      } else if (["compare", "merge-compare", "scan-start", "pick", "pivot"].includes(s.type)) {
        sound.compare();
      } else if (["insert", "placed", "place-pivot", "merge-done"].includes(s.type)) {
        sound.place();
      }
      upsert(next);
      return next;
    });
  }, [steps, upsert, comboTriggers, xpAmount]);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(advance, SPEEDS[speed]);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, speed, advance]);

  useEffect(() => {
    if (combo === 0) return;
    const t = setTimeout(() => setCombo(0), 3500);
    return () => clearTimeout(t);
  }, [idx, combo]);

  const reset = () => {
    setPlaying(false);
    setIdx(0);
    setDone(false);
    setCombo(0);
    completeRef.current = false;
  };

  // Derive bar values from current step highlights for correct color
  const bars = useMemo(() => step.array.map((val, i) => {
    const role = step.highlights[i];
    const palette = VIS_PALETTE[i % VIS_PALETTE.length];
    const colors = role ? ROLE_COLORS[role] : palette;
    const height = Math.max(22, (val / MAX_VAL) * 290);
    const isHighlighted = role !== undefined && role !== "in-range";
    return { val, i, ...colors, height, role, isHighlighted };
  }), [step, MAX_VAL]);

  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px", position: "relative" }}>
      <ProgressBadge completed={progress.completedSteps} total={steps.length} />

      {/* Stage header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", color: "#f6c453",
            padding: "4px 10px", background: "rgba(246,196,83,0.08)", border: "1px solid rgba(246,196,83,0.25)", borderRadius: 4,
          }}>{algoLabel}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(235,233,227,0.35)", letterSpacing: "0.15em" }}>
            ESTIMATED {estimatedTime}
          </span>
          <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(255,255,255,0.1), transparent)" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(235,233,227,0.35)", letterSpacing: "0.15em" }}>
            REWARD · {reward}
          </span>
        </div>
        <h1 style={{
          fontFamily: "var(--font-display)", fontSize: 56, lineHeight: 1,
          letterSpacing: "-0.025em", color: "#ebe9e3", marginBottom: 10,
        }}>
          {title}
        </h1>
        <p style={{ fontSize: 15, color: "rgba(235,233,227,0.5)", maxWidth: 580, lineHeight: 1.55 }}>
          {subtitle}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 280px", gap: 18 }}>
        {/* ── Main stage ── */}
        <div style={{ position: "relative" }}>
          <Corners color="rgba(167,139,250,0.4)" size={12} thickness={1.2} />
          <div style={{
            background: "linear-gradient(180deg, rgba(167,139,250,0.03), rgba(0,0,0,0)), rgba(12,12,20,0.6)",
            border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14,
            padding: "22px 24px 18px", position: "relative", overflow: "hidden",
          }}>
            {/* Grid background */}
            <div style={{
              position: "absolute", inset: 0, opacity: 0.5,
              backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
              backgroundSize: "48px 48px",
              WebkitMaskImage: "radial-gradient(ellipse at center, #000 30%, transparent 80%)",
              maskImage: "radial-gradient(ellipse at center, #000 30%, transparent 80%)",
              pointerEvents: "none",
            }} />

            {/* Label row */}
            <div style={{
              position: "relative", display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 14,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Live size={6} color="#f6c453" />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(246,196,83,0.8)", letterSpacing: "0.18em" }}>
                  {algoLabel} · {(step.type.toUpperCase()).padEnd(14, "·")}
                </span>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {steps.map((_, i) => (
                  <span key={i} style={{
                    width: 4, height: 4, borderRadius: "50%",
                    background: i < idx ? "#a78bfa" : i === idx ? "#f6c453" : "rgba(255,255,255,0.08)",
                    transition: "all 0.3s", display: "inline-block",
                  }} />
                ))}
              </div>
            </div>

            {/* Bars */}
            <div style={{
              position: "relative", zIndex: 1,
              display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 16,
              height: 320,
            }}>
              {bars.map(({ val, i, top, bot, g, height, role, isHighlighted }) => (
                <div
                  key={i}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, position: "relative" }}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                >
                  {hover === i && (
                    <div style={{
                      position: "absolute", top: -42, left: "50%", transform: "translateX(-50%)",
                      background: "#11111c", border: "1px solid rgba(167,139,250,0.4)",
                      borderRadius: 6, padding: "4px 8px",
                      fontFamily: "var(--font-mono)", fontSize: 10, color: "#ebe9e3",
                      whiteSpace: "nowrap", boxShadow: "0 8px 20px rgba(0,0,0,0.5)", zIndex: 10,
                    }}>
                      <span style={{ color: "rgba(246,196,83,0.7)" }}>[{i}]</span> = {val}
                    </div>
                  )}
                  <div
                    className="bar-base"
                    style={{
                      width: 56, height,
                      ["--bc-top" as string]: top,
                      ["--bc-bot" as string]: bot,
                      ["--bar-glow" as string]: (isHighlighted ? 24 : 12) + "px",
                      ["--bar-glow-c" as string]: g,
                      transition: "height 0.4s cubic-bezier(.16,1,.3,1), background 0.3s, box-shadow 0.3s, transform 0.2s",
                      transform: hover === i ? "translateY(-6px)" : (role === "placed" || role === "sorted") ? "translateY(-3px)" : "none",
                    }}
                  />
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.04em", fontWeight: 600,
                    color: isHighlighted ? (role === "sorted" ? "#6ee7b7" : role === "left-ptr" ? "#a5f3fc" : role === "right-ptr" ? "#c4b5fd" : "#f6c453")
                      : "rgba(235,233,227,0.4)",
                    transition: "color 0.3s",
                  }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Step caption */}
            <div style={{
              marginTop: 18, paddingTop: 14,
              borderTop: "1px solid rgba(255,255,255,0.05)",
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
              position: "relative",
            }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(235,233,227,0.45)", letterSpacing: "0.12em" }}>
                STEP {String(idx + 1).padStart(2, "0")}
                <span style={{ color: "rgba(235,233,227,0.2)" }}> / {String(steps.length).padStart(2, "0")}</span>
              </span>
              <motion.span
                key={idx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  fontSize: 13, color: "rgba(235,233,227,0.7)",
                  fontStyle: "italic", lineHeight: 1.4, textAlign: "right", flex: 1,
                }}
              >
                {step.description}
              </motion.span>
            </div>
          </div>

          {/* Controls */}
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Magnetic strength={0.18}>
              <button
                className={playing ? "btn-ghost" : "btn-violet"}
                onClick={() => setPlaying((p) => !p)}
                style={{ padding: "10px 18px" }}
              >
                {playing ? <><Pause size={12} /> Pause</> : <><Play size={12} /> Play</>}
              </button>
            </Magnetic>
            <button
              className="btn-ghost"
              onClick={() => { setPlaying(false); advance(); }}
              disabled={idx >= steps.length - 1}
              style={{ padding: "10px 14px", opacity: idx >= steps.length - 1 ? 0.3 : 1 }}
            >
              <StepForward size={12} /> Step
            </button>
            <button className="btn-ghost" onClick={reset} style={{ padding: "10px 14px" }}>
              <Reset size={12} /> Reset
            </button>

            <div style={{ flex: 1 }} />

            <div style={{
              fontFamily: "var(--font-mono)", display: "flex", alignItems: "center",
              background: "rgba(12,12,20,0.6)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, overflow: "hidden",
            }}>
              <span style={{ padding: "8px 12px", fontSize: 9, color: "rgba(235,233,227,0.35)", letterSpacing: "0.18em" }}>TEMPO</span>
              {(["slow", "normal", "fast"] as Speed[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  style={{
                    padding: "8px 14px", border: "none",
                    background: speed === s ? "rgba(167,139,250,0.16)" : "transparent",
                    color: speed === s ? "#cdb9ff" : "rgba(235,233,227,0.45)",
                    fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em",
                    textTransform: "uppercase", cursor: "pointer", transition: "all 0.15s",
                    borderLeft: "1px solid rgba(255,255,255,0.05)",
                  }}
                >{s}</button>
              ))}
            </div>
          </div>

          {/* Completion banner */}
          {done && (
            <div style={{
              marginTop: 16, padding: "16px 18px",
              background: "linear-gradient(135deg, rgba(110,231,183,0.08), rgba(167,139,250,0.05))",
              border: "1px solid rgba(110,231,183,0.3)", borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(110,231,183,0.15)", border: "1px solid rgba(110,231,183,0.4)", borderRadius: 8,
                }}>
                  <Check size={18} color="#6ee7b7" />
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#6ee7b7", letterSpacing: "0.2em", marginBottom: 2 }}>
                    SORTED · +{xpAmount} XP
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "#ebe9e3" }}>
                    Pattern absorbed. Time to move on.
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <a href="/" className="btn-ghost" style={{ padding: "10px 14px", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                  ← Home
                </a>
                {nextSlug && (
                  <a
                    href={`/learn/${nextSlug}`}
                    className="btn-primary"
                    style={{ padding: "10px 16px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}
                  >
                    Next algo
                    <ArrowRight size={14} color="#fff4d6" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ComboMeter combo={combo} />

          {/* Telemetry */}
          <div style={{ position: "relative" }}>
            <Corners color="rgba(255,255,255,0.12)" size={10} thickness={1} />
            <div style={{
              padding: "16px 18px", background: "rgba(12,12,20,0.6)",
              border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12,
            }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.22em", color: "rgba(235,233,227,0.4)", marginBottom: 12 }}>
                TELEMETRY
              </div>
              {telemetry.map((t) => (
                <Telemetry key={t.label} label={t.label} value={t.getValue(step)} accent={t.accent} />
              ))}
            </div>
          </div>

          {/* Pseudocode */}
          <div style={{ position: "relative" }}>
            <Corners color="rgba(255,255,255,0.12)" size={10} thickness={1} />
            <div style={{
              padding: "16px 18px", background: "rgba(12,12,20,0.6)",
              border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12,
              fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 1.7,
            }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.22em", color: "rgba(235,233,227,0.4)", marginBottom: 10 }}>
                SOURCE
              </div>
              {pseudocode.map((line) => (
                <CodeLine key={line.n} n={line.n} active={line.active(step)} indent={line.indent}>
                  {line.text}
                </CodeLine>
              ))}
            </div>
          </div>

          {/* Coach whisper */}
          <div style={{
            padding: "12px 14px", background: "rgba(167,139,250,0.04)",
            border: "1px dashed rgba(167,139,250,0.2)", borderRadius: 10,
            display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <Sparkle size={10} color="#a78bfa" />
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em", color: "rgba(167,139,250,0.7)", marginBottom: 4 }}>
                COACH WHISPER
              </div>
              <p style={{ fontSize: 11, color: "rgba(235,233,227,0.55)", lineHeight: 1.5, margin: 0 }}>
                {coachWhisper}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
