"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import VisualiserLayout from "@/components/VisualiserLayout";
import { StatsModal, CompletionStats } from "@/components/games/sorting/StatsModal";
import { useHints } from "@/lib/useHints";
import { useProgress } from "@/lib/useProgress";
import { getModuleConfig, getNextModule } from "@/lib/sorting/gameConfigs";
import { countingCorrectBucket, shuffle } from "@/lib/sorting/algorithms";
import { correctSound, wrongSound, completionSound } from "@/lib/sounds";
import { useRouter } from "next/navigation";

const SLUG = "counting-sort";
const CONFIG = getModuleConfig(SLUG)!;
const TOTAL_LEVELS = CONFIG.levels.length;
const W = 840, H = 440;
const BUCKET_COUNT = 10;
const BUCKET_W = 62, BUCKET_H = 100;
const BUCKET_Y = H - BUCKET_H - 40;
const BALLOT_W = 40, BALLOT_H = 32;

interface Ballot {
  id: number;
  value: number;
  x: number;
  y: number;
  placed: boolean;
}

interface CountState {
  ballots: Ballot[];
  counts: number[];
  outputPhase: boolean;
  outputIdx: number;
  result: number[];
  ops: number;
  dragging: { ballot: Ballot; ox: number; oy: number } | null;
  collectPhase: boolean; // after all ballots placed: collect in order
  collectNext: number; // next bucket to collect (0-9)
}

function makeBallots(count: number): Ballot[] {
  const values = Array.from({ length: count }, () => Math.floor(Math.random() * BUCKET_COUNT));
  return values.map((value, id) => ({
    id, value,
    x: 30 + (id % 12) * (BALLOT_W + 8),
    y: 30 + Math.floor(id / 12) * (BALLOT_H + 10),
    placed: false,
  }));
}

function bucketX(b: number): number {
  return 20 + b * (BUCKET_W + 4);
}

function CountingCanvas({ level, onComplete, watchMode }: {
  level: number; onComplete: (ops: number) => void; watchMode: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<CountState | null>(null);
  const animRef = useRef(0);
  const flashRef = useRef<{ text: string; alpha: number; correct: boolean } | null>(null);
  const doneRef = useRef(false);
  const watchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    doneRef.current = false;

    const ballotCount = level >= 4 ? 18 : 12;
    const ballots = makeBallots(ballotCount);
    const counts = Array(BUCKET_COUNT).fill(0);

    // L3: pre-fill counts, skip counting phase
    if (level === 3) {
      ballots.forEach((b) => { b.placed = true; counts[b.value]++; });
    }

    stateRef.current = {
      ballots,
      counts: [...counts],
      outputPhase: level === 3,
      outputIdx: 0,
      result: [],
      ops: 0,
      dragging: null,
      collectPhase: level === 3,
      collectNext: 0,
    };

    function handleMouseMove(e: MouseEvent) {
      const s = stateRef.current;
      if (!s?.dragging) return;
      const rect = canvas!.getBoundingClientRect();
      const sx = W / rect.width, sy = H / rect.height;
      s.dragging.ballot.x = (e.clientX - rect.left) * sx - s.dragging.ox;
      s.dragging.ballot.y = (e.clientY - rect.top) * sy - s.dragging.oy;
    }

    function handleMouseDown(e: MouseEvent) {
      if (watchMode) return;
      const s = stateRef.current;
      if (!s || s.collectPhase) return;
      const rect = canvas!.getBoundingClientRect();
      const sx = W / rect.width, sy = H / rect.height;
      const mx = (e.clientX - rect.left) * sx;
      const my = (e.clientY - rect.top) * sy;
      const ballot = [...s.ballots].reverse().find((b) => !b.placed &&
        mx > b.x && mx < b.x + BALLOT_W && my > b.y && my < b.y + BALLOT_H);
      if (ballot) {
        s.dragging = { ballot, ox: mx - ballot.x, oy: my - ballot.y };
      }
    }

    function handleMouseUp() {
      const s = stateRef.current;
      if (!s?.dragging) return;
      const ballot = s.dragging.ballot;
      s.dragging = null;

      // Find which bucket it was dropped on
      const bx = ballot.x + BALLOT_W / 2;
      let dropped = -1;
      for (let b = 0; b < BUCKET_COUNT; b++) {
        const bLeft = bucketX(b);
        if (bx > bLeft && bx < bLeft + BUCKET_W && ballot.y + BALLOT_H > BUCKET_Y - 10) {
          dropped = b;
          break;
        }
      }

      const correct = countingCorrectBucket(ballot.value);
      s.ops++;

      if (dropped === correct) {
        correctSound();
        ballot.placed = true;
        s.counts[dropped]++;
        ballot.x = bucketX(dropped) + 10;
        ballot.y = BUCKET_Y - s.counts[dropped] * (BALLOT_H * 0.7) - 10;
        flashRef.current = { text: `✓ BUCKET ${dropped}`, alpha: 1, correct: true };

        if (s.ballots.every((b) => b.placed)) {
          s.collectPhase = true;
          s.collectNext = 0;
        }
      } else if (dropped >= 0) {
        wrongSound();
        ballot.x = 30 + (ballot.id % 12) * (BALLOT_W + 8);
        ballot.y = 30 + Math.floor(ballot.id / 12) * (BALLOT_H + 10);
        flashRef.current = { text: `WRONG — BUCKET ${correct}`, alpha: 1, correct: false };
      } else {
        ballot.x = 30 + (ballot.id % 12) * (BALLOT_W + 8);
        ballot.y = 30 + Math.floor(ballot.id / 12) * (BALLOT_H + 10);
      }
    }

    function handleClick(e: MouseEvent) {
      const s = stateRef.current;
      if (!s || !s.collectPhase || doneRef.current) return;
      const rect = canvas!.getBoundingClientRect();
      const cx = (e.clientX - rect.left) * (W / rect.width);
      const cy = (e.clientY - rect.top) * (H / rect.height);

      // Click a bucket
      for (let b = 0; b < BUCKET_COUNT; b++) {
        const bLeft = bucketX(b);
        if (cx > bLeft && cx < bLeft + BUCKET_W && cy > BUCKET_Y - 20 && cy < BUCKET_Y + BUCKET_H) {
          if (b === s.collectNext) {
            correctSound();
            for (let i = 0; i < s.counts[b]; i++) s.result.push(b);
            s.counts[b] = 0;
            s.collectNext++;
            s.ops++;
            flashRef.current = { text: `✓ BUCKET ${b} COLLECTED`, alpha: 1, correct: true };
            if (s.collectNext >= BUCKET_COUNT && !doneRef.current) {
              doneRef.current = true;
              completionSound();
              setTimeout(() => onComplete(s.ops), 500);
            }
          } else {
            wrongSound();
            flashRef.current = { text: `COLLECT IN ORDER! NEED ${s.collectNext}`, alpha: 1, correct: false };
          }
          break;
        }
      }
    }

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);
    if (!watchMode) canvas.addEventListener("click", handleClick);

    if (watchMode) {
      const autoStep = () => {
        const s = stateRef.current;
        if (!s || doneRef.current) return;

        if (!s.collectPhase) {
          const ballot = s.ballots.find((b) => !b.placed);
          if (ballot) {
            const correct = countingCorrectBucket(ballot.value);
            ballot.placed = true;
            s.counts[correct]++;
            ballot.x = bucketX(correct) + 10;
            ballot.y = BUCKET_Y - s.counts[correct] * (BALLOT_H * 0.7) - 10;
            s.ops++;
            if (s.ballots.every((b) => b.placed)) s.collectPhase = true;
          }
        } else {
          if (s.collectNext < BUCKET_COUNT) {
            for (let i = 0; i < s.counts[s.collectNext]; i++) s.result.push(s.collectNext);
            s.counts[s.collectNext] = 0;
            s.collectNext++;
            s.ops++;
            if (s.collectNext >= BUCKET_COUNT && !doneRef.current) {
              doneRef.current = true;
              completionSound();
              setTimeout(() => onComplete(s.ops), 500);
              return;
            }
          }
        }

        if (!doneRef.current) watchTimerRef.current = setTimeout(autoStep, 300);
      };
      watchTimerRef.current = setTimeout(autoStep, 700);
    }

    function render() {
      animRef.current = requestAnimationFrame(render);
      const s = stateRef.current;
      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#0a0d1c");
      bg.addColorStop(1, "#060810");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      if (!s) return;

      // Draw buckets
      for (let b = 0; b < BUCKET_COUNT; b++) {
        const bx = bucketX(b);
        const isNext = s.collectPhase && b === s.collectNext;
        ctx.fillStyle = isNext ? "rgba(0,229,255,0.1)" : s.counts[b] === 0 && s.collectPhase ? "rgba(110,231,183,0.05)" : "rgba(255,255,255,0.03)";
        ctx.strokeStyle = isNext ? "#00e5ff" : "rgba(255,255,255,0.08)";
        ctx.lineWidth = isNext ? 2 : 1;
        ctx.roundRect(bx, BUCKET_Y, BUCKET_W, BUCKET_H, 6);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = isNext ? "#00e5ff" : "rgba(232,244,255,0.35)";
        ctx.font = `bold 13px monospace`;
        ctx.textAlign = "center";
        ctx.fillText(String(b), bx + BUCKET_W / 2, BUCKET_Y + BUCKET_H - 8);

        ctx.fillStyle = "rgba(232,244,255,0.5)";
        ctx.font = "10px monospace";
        ctx.fillText(s.counts[b] > 0 ? `×${s.counts[b]}` : "", bx + BUCKET_W / 2, BUCKET_Y + 16);
      }

      // Draw placed ballots in buckets
      s.ballots.filter((b) => b.placed).forEach((ballot) => {
        if (s.collectPhase && s.counts[ballot.value] === 0) return; // collected
        ctx.fillStyle = `hsl(${ballot.value * 36},60%,50%)`;
        ctx.globalAlpha = 0.7;
        ctx.roundRect(ballot.x, ballot.y, BALLOT_W - 4, BALLOT_H * 0.65, 3);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px monospace";
        ctx.fillText(String(ballot.value), ballot.x + (BALLOT_W - 4) / 2, ballot.y + 12);
      });

      // Draw unplaced ballots
      s.ballots.filter((b) => !b.placed).forEach((ballot) => {
        const isDragging = s.dragging?.ballot === ballot;
        ctx.globalAlpha = isDragging ? 0.8 : 1;
        ctx.fillStyle = `hsl(${ballot.value * 36},55%,42%)`;
        ctx.roundRect(ballot.x, ballot.y, BALLOT_W, BALLOT_H, 4);
        ctx.fill();
        ctx.strokeStyle = isDragging ? "#00e5ff" : "rgba(255,255,255,0.15)";
        ctx.lineWidth = isDragging ? 2 : 1;
        ctx.roundRect(ballot.x, ballot.y, BALLOT_W, BALLOT_H, 4);
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(ballot.value), ballot.x + BALLOT_W / 2, ballot.y + BALLOT_H / 2);
        ctx.textBaseline = "alphabetic";
        ctx.globalAlpha = 1;
      });

      // Result array
      if (s.result.length > 0) {
        ctx.fillStyle = "rgba(232,244,255,0.3)";
        ctx.font = "9px monospace";
        ctx.textAlign = "left";
        ctx.fillText("RESULT:", 10, H - 12);
        s.result.forEach((val, i) => {
          const rx = 70 + i * 22;
          ctx.fillStyle = `hsl(${val * 36},55%,38%)`;
          ctx.roundRect(rx, H - 26, 20, 18, 2);
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.font = "10px monospace";
          ctx.textAlign = "center";
          ctx.fillText(String(val), rx + 10, H - 12);
        });
      }

      // Collect phase label
      if (s.collectPhase && !doneRef.current) {
        ctx.fillStyle = "#00e5ff";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`CLICK BUCKETS IN ORDER — NEXT: ${s.collectNext}`, W / 2, 18);
      }

      // Ops
      ctx.fillStyle = "rgba(232,244,255,0.35)";
      ctx.font = "9px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`OPS: ${s.ops}`, W - 10, 18);
      ctx.textAlign = "left";

      // Flash
      if (flashRef.current) {
        flashRef.current.alpha -= 0.022;
        if (flashRef.current.alpha <= 0) flashRef.current = null;
        else {
          ctx.globalAlpha = flashRef.current.alpha;
          ctx.fillStyle = flashRef.current.correct ? "#6ee7b7" : "#fb7185";
          ctx.font = "bold 13px monospace";
          ctx.textAlign = "center";
          ctx.fillText(flashRef.current.text, W / 2, BUCKET_Y - 20);
          ctx.globalAlpha = 1;
        }
      }

      if (doneRef.current) {
        ctx.fillStyle = "rgba(6,8,20,0.78)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#6ee7b7";
        ctx.font = "bold 26px monospace";
        ctx.textAlign = "center";
        ctx.fillText("VOTES COUNTED!", W / 2, H / 2);
        ctx.textAlign = "left";
      }
    }

    render();

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mousedown", handleMouseDown);
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
      style={{ width: "100%", maxWidth: W, display: "block", margin: "0 auto", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", cursor: "default" }}
    />
  );
}

// L5: Range insight
function RangeInsight() {
  const [range, setRange] = useState(10);
  const memory = range * 4;
  return (
    <div style={{ padding: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, marginTop: 16 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", color: "rgba(232,244,255,0.35)", marginBottom: 10 }}>RANGE PROBLEM — MEMORY USAGE</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(232,244,255,0.5)" }}>Range: 0 to {range}</span>
        <input type="range" min={10} max={1000} value={range} onChange={(e) => setRange(Number(e.target.value))} style={{ flex: 1, accentColor: "#f6c453" }} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: range > 100 ? "#fb7185" : "#6ee7b7" }}>{memory} bytes</span>
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: range > 100 ? "#fb7185" : "#6ee7b7" }}>
        {range > 100 ? "⚠ With 1000 candidates you need 1000 buckets. Counting sort fails with large ranges." : "✓ Small range: counting sort is very efficient here."}
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(232,244,255,0.3)", marginBottom: 6 }}>WHEN IS COUNTING SORT EFFICIENT?</div>
        {[
          { text: "When k (range) is small relative to n (count)", correct: true },
          { text: "Always — it's always O(n)", correct: false },
          { text: "When values are already sorted", correct: false },
        ].map((opt, i) => (
          <button key={i} style={{
            display: "block", width: "100%", marginBottom: 6, padding: "8px 12px", textAlign: "left",
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 6, cursor: "pointer",
            fontFamily: "var(--font-tac)", fontSize: 12,
            color: opt.correct ? "#6ee7b7" : "rgba(232,244,255,0.6)",
          }}>
            {opt.text}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CountingSortGame() {
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
    optimalOperations: 18,
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
          {currentLevel === 5 ? (
            <RangeInsight />
          ) : (
            <CountingCanvas key={currentLevel} level={currentLevel} onComplete={handleLevelComplete} watchMode={levelConfig.isWatchMode} />
          )}
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
