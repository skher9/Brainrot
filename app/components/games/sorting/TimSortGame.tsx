"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import VisualiserLayout from "@/components/VisualiserLayout";
import { StatsModal, CompletionStats } from "@/components/games/sorting/StatsModal";
import { useHints } from "@/lib/useHints";
import { useProgress } from "@/lib/useProgress";
import { getModuleConfig, getNextModule } from "@/lib/sorting/gameConfigs";
import { timFindRuns, TIM_MIN_RUN, mergeNextSide, shuffle } from "@/lib/sorting/algorithms";
import { correctSound, wrongSound, completionSound } from "@/lib/sounds";
import { useRouter } from "next/navigation";

const SLUG = "tim-sort";
const CONFIG = getModuleConfig(SLUG)!;
const TOTAL_LEVELS = CONFIG.levels.length;
const W = 820, H = 440;
const BOX_W = 44, BOX_H = 44;
const BOX_Y = H / 2 - BOX_H / 2 - 30;

function boxX(idx: number): number {
  return 20 + idx * (BOX_W + 6);
}

interface TimState {
  array: number[];
  runs: Array<{ start: number; end: number; confirmed: boolean }>;
  phase: "identify" | "merge" | "done";
  dragStart: number | null;
  dragEnd: number | null;
  mergeLeft: number[];
  mergeRight: number[];
  mergedSoFar: number[];
  li: number;
  ri: number;
  runIdx: number;
  ops: number;
}

function TimCanvas({ level, onComplete, watchMode }: {
  level: number; onComplete: (ops: number) => void; watchMode: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const doneRef = useRef(false);
  const watchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashRef = useRef<{ text: string; alpha: number; correct: boolean } | null>(null);
  const stateRef = useRef<TimState | null>(null);
  const mouseDownRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    doneRef.current = false;

    const arr = shuffle(Array.from({ length: 12 }, (_, i) => i + 1));
    const correctRuns = timFindRuns(arr);

    stateRef.current = {
      array: arr,
      runs: [],
      phase: "identify",
      dragStart: null,
      dragEnd: null,
      mergeLeft: [],
      mergeRight: [],
      mergedSoFar: [],
      li: 0, ri: 0,
      runIdx: 0,
      ops: 0,
    };

    if (level === 3) {
      // Pre-identified runs, start in merge phase
      stateRef.current.runs = correctRuns.map((r) => ({ ...r, confirmed: true }));
      stateRef.current.phase = "merge";
      initNextMerge(stateRef.current);
    }

    function initNextMerge(s: TimState) {
      const confirmedRuns = s.runs.filter((r) => r.confirmed);
      if (confirmedRuns.length < 2) { finalize(s); return; }
      const r1 = confirmedRuns[0];
      const r2 = confirmedRuns[1];
      s.mergeLeft = s.array.slice(r1.start, r1.end + 1);
      s.mergeRight = s.array.slice(r2.start, r2.end + 1);
      s.mergedSoFar = [];
      s.li = 0; s.ri = 0;
    }

    function finalize(s: TimState) {
      if (!doneRef.current) {
        doneRef.current = true;
        completionSound();
        setTimeout(() => onComplete(s.ops), 500);
      }
    }

    function handleMouseDown(e: MouseEvent) {
      if (watchMode || stateRef.current?.phase !== "identify") return;
      const rect = canvas!.getBoundingClientRect();
      const cx = (e.clientX - rect.left) * (W / rect.width);
      const cy = (e.clientY - rect.top) * (H / rect.height);
      if (cy > BOX_Y && cy < BOX_Y + BOX_H) {
        const idx = Math.floor((cx - 20) / (BOX_W + 6));
        if (idx >= 0 && idx < stateRef.current!.array.length) {
          stateRef.current!.dragStart = idx;
          stateRef.current!.dragEnd = idx;
          mouseDownRef.current = true;
        }
      }
    }

    function handleMouseMove(e: MouseEvent) {
      if (!mouseDownRef.current || !stateRef.current?.dragStart !== null) return;
      const s = stateRef.current;
      if (!s || s.dragStart === null) return;
      const rect = canvas!.getBoundingClientRect();
      const cx = (e.clientX - rect.left) * (W / rect.width);
      const idx = Math.floor((cx - 20) / (BOX_W + 6));
      if (idx >= 0 && idx < s.array.length) s.dragEnd = idx;
    }

    function handleMouseUp() {
      if (!mouseDownRef.current) return;
      mouseDownRef.current = false;
      const s = stateRef.current;
      if (!s || s.dragStart === null || s.dragEnd === null) return;

      const start = Math.min(s.dragStart, s.dragEnd);
      const end = Math.max(s.dragStart, s.dragEnd);
      s.dragStart = null; s.dragEnd = null;

      if (end - start + 1 < TIM_MIN_RUN) {
        wrongSound();
        flashRef.current = { text: `RUN NEEDS ≥${TIM_MIN_RUN} ELEMENTS`, alpha: 1, correct: false };
        return;
      }

      // Check if this selection is actually a valid run
      const slice = s.array.slice(start, end + 1);
      const isValidRun = slice.every((v, i) => i === 0 || slice[i] >= slice[i - 1]);
      if (!isValidRun) {
        wrongSound();
        flashRef.current = { text: "NOT A SORTED RUN", alpha: 1, correct: false };
        return;
      }

      correctSound();
      s.runs.push({ start, end, confirmed: true });
      s.ops++;
      flashRef.current = { text: `✓ RUN [${start}-${end}]`, alpha: 1, correct: true };

      // Check if all runs found
      const totalCovered = s.runs.reduce((sum, r) => sum + (r.end - r.start + 1), 0);
      if (totalCovered >= s.array.length || s.runs.length >= correctRuns.length) {
        s.phase = "merge";
        initNextMerge(s);
      }
    }

    function handleClick(e: MouseEvent) {
      const s = stateRef.current;
      if (!s || s.phase !== "merge" || doneRef.current) return;
      const rect = canvas!.getBoundingClientRect();
      const cx = (e.clientX - rect.left) * (W / rect.width);
      const cy = (e.clientY - rect.top) * (H / rect.height);
      const panelY = H - 120;
      if (cy < panelY) return;

      let pickedSide: 0 | 1 | null = cx < W / 2 ? 0 : 1;
      const correct = mergeNextSide(s.mergeLeft, s.mergeRight, s.li, s.ri);

      if (pickedSide === correct) {
        correctSound();
        if (pickedSide === 0) { s.mergedSoFar.push(s.mergeLeft[s.li]); s.li++; }
        else { s.mergedSoFar.push(s.mergeRight[s.ri]); s.ri++; }
        s.ops++;
        flashRef.current = { text: "✓ CORRECT", alpha: 1, correct: true };

        if (s.li >= s.mergeLeft.length && s.ri >= s.mergeRight.length) {
          // Merge done — replace the two runs with one
          const r1 = s.runs[0], r2 = s.runs[1];
          s.array.splice(r1.start, r2.end - r1.start + 1, ...s.mergedSoFar);
          s.runs = s.runs.slice(2);
          if (s.runs.length === 0) {
            finalize(s);
          } else if (s.runs.length >= 2) {
            initNextMerge(s);
          } else {
            finalize(s);
          }
        }
      } else {
        wrongSound();
        flashRef.current = { text: "PICK SMALLER", alpha: 1, correct: false };
      }
    }

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    if (!watchMode) canvas.addEventListener("click", handleClick);

    if (watchMode) {
      const autoStep = () => {
        const s = stateRef.current;
        if (!s || doneRef.current) return;
        if (s.phase === "identify") {
          if (correctRuns.length > s.runs.length) {
            const r = correctRuns[s.runs.length];
            s.runs.push({ ...r, confirmed: true });
            s.ops++;
            if (s.runs.length >= correctRuns.length) {
              s.phase = "merge";
              initNextMerge(s);
            }
          }
        } else {
          const side = mergeNextSide(s.mergeLeft, s.mergeRight, s.li, s.ri);
          if (side !== null) {
            if (side === 0) { s.mergedSoFar.push(s.mergeLeft[s.li]); s.li++; }
            else { s.mergedSoFar.push(s.mergeRight[s.ri]); s.ri++; }
            s.ops++;
            if (s.li >= s.mergeLeft.length && s.ri >= s.mergeRight.length) {
              const r1 = s.runs[0], r2 = s.runs[1];
              s.array.splice(r1.start, r2.end - r1.start + 1, ...s.mergedSoFar);
              s.runs = s.runs.slice(2);
              if (s.runs.length >= 2) initNextMerge(s);
              else { finalize(s); return; }
            }
          }
        }
        if (!doneRef.current) watchTimerRef.current = setTimeout(autoStep, 400);
      };
      watchTimerRef.current = setTimeout(autoStep, 800);
    }

    function render() {
      animRef.current = requestAnimationFrame(render);
      const s = stateRef.current;
      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#0c0f1a");
      bg.addColorStop(1, "#070810");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      if (!s) return;

      // Phase label
      ctx.fillStyle = "#f6c453";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`PHASE: ${s.phase.toUpperCase()}  OPS: ${s.ops}`, W / 2, 20);

      // Array boxes
      s.array.forEach((val, idx) => {
        const bx = boxX(idx);
        const inRun = s.runs.find((r) => idx >= r.start && idx <= r.end);
        const isDragging = s.dragStart !== null && s.dragEnd !== null &&
          idx >= Math.min(s.dragStart, s.dragEnd) && idx <= Math.max(s.dragStart, s.dragEnd);

        ctx.fillStyle = inRun ? "rgba(110,231,183,0.2)" : isDragging ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.05)";
        ctx.strokeStyle = inRun ? "rgba(110,231,183,0.6)" : isDragging ? "#a78bfa" : "rgba(255,255,255,0.12)";
        ctx.lineWidth = inRun || isDragging ? 2 : 1;
        ctx.roundRect(bx, BOX_Y, BOX_W, BOX_H, 4);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = inRun ? "#6ee7b7" : "rgba(232,244,255,0.7)";
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(val), bx + BOX_W / 2, BOX_Y + BOX_H / 2);
        ctx.textBaseline = "alphabetic";
      });

      // Run brackets
      s.runs.forEach((r) => {
        const sx = boxX(r.start);
        const ex = boxX(r.end) + BOX_W;
        ctx.strokeStyle = "rgba(110,231,183,0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, BOX_Y + BOX_H + 8);
        ctx.lineTo(ex, BOX_Y + BOX_H + 8);
        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx, BOX_Y + BOX_H + 4); ctx.lineTo(sx, BOX_Y + BOX_H + 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ex, BOX_Y + BOX_H + 4); ctx.lineTo(ex, BOX_Y + BOX_H + 12); ctx.stroke();
        ctx.fillStyle = "#6ee7b7";
        ctx.font = "9px monospace";
        ctx.fillText(`run [${r.start}-${r.end}]`, (sx + ex) / 2, BOX_Y + BOX_H + 24);
      });

      // Merge panel
      if (s.phase === "merge" && s.mergeLeft.length > 0) {
        const panelY = H - 120;
        ctx.fillStyle = "rgba(255,255,255,0.02)";
        ctx.roundRect(10, panelY, W - 20, 110, 8);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = "rgba(232,244,255,0.3)";
        ctx.font = "9px monospace";
        ctx.textAlign = "center";
        ctx.fillText("CLICK LEFT", W / 4, panelY + 12);
        ctx.fillText("CLICK RIGHT", (3 * W) / 4, panelY + 12);

        s.mergeLeft.slice(s.li).forEach((v, i) => {
          const bx = W / 4 - ((s.mergeLeft.length - s.li) * (BOX_W + 4)) / 2 + i * (BOX_W + 4);
          ctx.fillStyle = i === 0 ? "rgba(0,229,255,0.25)" : "rgba(167,139,250,0.12)";
          ctx.strokeStyle = i === 0 ? "#00e5ff" : "rgba(167,139,250,0.3)";
          ctx.lineWidth = 1.5;
          ctx.roundRect(bx, panelY + 22, BOX_W, BOX_H - 4, 4);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = i === 0 ? "#00e5ff" : "#c4b5fd";
          ctx.font = "bold 13px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(v), bx + BOX_W / 2, panelY + 22 + (BOX_H - 4) / 2);
          ctx.textBaseline = "alphabetic";
        });

        s.mergeRight.slice(s.ri).forEach((v, i) => {
          const bx = (3 * W) / 4 - ((s.mergeRight.length - s.ri) * (BOX_W + 4)) / 2 + i * (BOX_W + 4);
          ctx.fillStyle = i === 0 ? "rgba(0,229,255,0.25)" : "rgba(167,139,250,0.12)";
          ctx.strokeStyle = i === 0 ? "#00e5ff" : "rgba(167,139,250,0.3)";
          ctx.roundRect(bx, panelY + 22, BOX_W, BOX_H - 4, 4);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = i === 0 ? "#00e5ff" : "#c4b5fd";
          ctx.font = "bold 13px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(v), bx + BOX_W / 2, panelY + 22 + (BOX_H - 4) / 2);
          ctx.textBaseline = "alphabetic";
        });

        ctx.fillStyle = "rgba(232,244,255,0.25)";
        ctx.font = "9px monospace";
        ctx.textAlign = "center";
        ctx.fillText("MERGED →", W / 2, panelY + 76);
        s.mergedSoFar.forEach((v, i) => {
          const bx = W / 2 - (s.mergedSoFar.length * (BOX_W + 2)) / 2 + i * (BOX_W + 2) + 30;
          ctx.fillStyle = "rgba(110,231,183,0.2)";
          ctx.strokeStyle = "#6ee7b7";
          ctx.roundRect(bx, panelY + 82, BOX_W - 6, 22, 3);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#6ee7b7";
          ctx.font = "bold 11px monospace";
          ctx.fillText(String(v), bx + (BOX_W - 6) / 2, panelY + 97);
        });
      }

      // Identify instructions
      if (s.phase === "identify" && !watchMode) {
        ctx.fillStyle = "rgba(232,244,255,0.4)";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`DRAG to highlight sorted runs (≥${TIM_MIN_RUN} elements)`, W / 2, BOX_Y + BOX_H + 44);
      }

      // Flash
      if (flashRef.current) {
        flashRef.current.alpha -= 0.022;
        if (flashRef.current.alpha <= 0) flashRef.current = null;
        else {
          ctx.globalAlpha = flashRef.current.alpha;
          ctx.fillStyle = flashRef.current.correct ? "#6ee7b7" : "#fb7185";
          ctx.font = "bold 13px monospace";
          ctx.textAlign = "center";
          ctx.fillText(flashRef.current.text, W / 2, BOX_Y - 20);
          ctx.globalAlpha = 1;
        }
      }

      if (doneRef.current) {
        ctx.fillStyle = "rgba(6,8,20,0.78)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#a78bfa";
        ctx.font = "bold 24px monospace";
        ctx.textAlign = "center";
        ctx.fillText("TIMSORT COMPLETE!", W / 2, H / 2 - 16);
        ctx.fillStyle = "rgba(232,244,255,0.4)";
        ctx.font = "11px monospace";
        ctx.fillText("Python's .sort() and Java's Arrays.sort() use this algorithm!", W / 2, H / 2 + 12);
        ctx.textAlign = "left";
      }
    }

    render();
    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("click", handleClick);
      if (watchTimerRef.current) clearTimeout(watchTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, watchMode]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ width: "100%", maxWidth: W, display: "block", margin: "0 auto", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", cursor: "crosshair" }}
    />
  );
}

export default function TimSortGame() {
  const router = useRouter();
  const [currentLevel, setCurrentLevel] = useState(1);
  const [showStats, setShowStats] = useState(false);
  const [totalOps, setTotalOps] = useState(0);
  const [startTime] = useState(Date.now());
  const { hintsUsed, useHint } = useHints(SLUG);
  const { upsert } = useProgress(SLUG, TOTAL_LEVELS);
  const nextModule = getNextModule(SLUG);
  const levelConfig = CONFIG.levels[currentLevel - 1];

  const handleLevelComplete = useCallback((ops: number) => {
    setTotalOps((p) => p + ops);
    upsert(currentLevel);
    if (currentLevel >= TOTAL_LEVELS) setShowStats(true);
  }, [currentLevel, upsert]);

  const stats: CompletionStats = {
    operationsUsed: totalOps,
    optimalOperations: 24,
    timeSeconds: Math.floor((Date.now() - startTime) / 1000),
    hintsUsed,
    moduleName: CONFIG.name,
    moduleSlug: SLUG,
  };

  return (
    <>
      <VisualiserLayout
        title={CONFIG.name}
        category="Sorting"
        slug={SLUG}
        totalSteps={TOTAL_LEVELS}
        currentStep={currentLevel}
        onNext={() => { if (currentLevel >= TOTAL_LEVELS) setShowStats(true); else setCurrentLevel((l) => l + 1); }}
        onPrev={() => setCurrentLevel((l) => Math.max(1, l - 1))}
        hints={CONFIG.hints}
        hintsUsed={hintsUsed}
        onUseHint={useHint}
      >
        <div style={{ padding: "24px 24px 80px", maxWidth: 900, margin: "0 auto" }}>
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.22em", color: "#f6c453", padding: "3px 10px", background: "rgba(246,196,83,0.08)", border: "1px solid rgba(246,196,83,0.25)", borderRadius: 4 }}>
              LEVEL {currentLevel} — {levelConfig.name.toUpperCase()}
            </span>
          </div>
          <TimCanvas key={currentLevel} level={currentLevel} onComplete={handleLevelComplete} watchMode={levelConfig.isWatchMode} />
          <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8 }}>
            <p style={{ fontFamily: "var(--font-tac)", fontSize: 13, color: "rgba(232,244,255,0.55)", margin: 0 }}>{levelConfig.description}</p>
          </div>
        </div>
      </VisualiserLayout>
      <AnimatePresence>
        {showStats && (
          <StatsModal stats={stats} baseXP={levelConfig.baseXP} onClose={() => router.push("/")} onNextModule={() => nextModule && router.push(`/learn/sorting/${nextModule.slug}`)} nextModule={nextModule} />
        )}
      </AnimatePresence>
    </>
  );
}
