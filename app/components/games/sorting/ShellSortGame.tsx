"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import VisualiserLayout from "@/components/VisualiserLayout";
import { StatsModal, CompletionStats } from "@/components/games/sorting/StatsModal";
import { useHints } from "@/lib/useHints";
import { useProgress } from "@/lib/useProgress";
import { getModuleConfig, getNextModule } from "@/lib/sorting/gameConfigs";
import { SHELL_GAPS, shellShouldSwap, shuffle } from "@/lib/sorting/algorithms";
import { correctSound, wrongSound, completionSound } from "@/lib/sounds";
import { useRouter } from "next/navigation";

const SLUG = "shell-sort";
const CONFIG = getModuleConfig(SLUG)!;
const TOTAL_LEVELS = CONFIG.levels.length;
const W = 820, H = 400;
const SOLDIER_W = 54, SOLDIER_H = 70;
const SOLDIER_Y = H / 2 - SOLDIER_H / 2;

interface Soldier {
  id: number;
  rank: number;
  x: number;
  finalPos: number;
}

function makeSoldiers(count: number): Soldier[] {
  const ranks = shuffle(Array.from({ length: count }, (_, i) => i + 1));
  return ranks.map((rank, id) => ({
    id, rank,
    x: 20 + id * (SOLDIER_W + 10),
    finalPos: id,
  }));
}

function ShellCanvas({ level, onComplete, watchMode }: {
  level: number; onComplete: (ops: number) => void; watchMode: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const doneRef = useRef(false);
  const watchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashRef = useRef<{ text: string; alpha: number; correct: boolean } | null>(null);
  const soldiersRef = useRef<Soldier[]>([]);
  const gapIdxRef = useRef(0);
  const posRef = useRef(0);
  const opsRef = useRef(0);
  const selectedRef = useRef<number | null>(null);
  const shakeRef = useRef(0);

  function getCurrentGap(): number {
    return SHELL_GAPS[gapIdxRef.current] ?? 1;
  }

  function soldierX(pos: number): number {
    return 20 + pos * (SOLDIER_W + 10);
  }

  function advancePointer() {
    const gap = getCurrentGap();
    const soldiers = soldiersRef.current;
    // Move to next pair
    posRef.current++;
    if (posRef.current + gap >= soldiers.length) {
      gapIdxRef.current++;
      posRef.current = 0;
      if (gapIdxRef.current >= SHELL_GAPS.length) {
        // Done
        doneRef.current = true;
        completionSound();
        setTimeout(() => onComplete(opsRef.current), 500);
      }
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    doneRef.current = false;
    gapIdxRef.current = 0;
    posRef.current = 0;
    opsRef.current = 0;
    selectedRef.current = null;

    const count = 8;
    soldiersRef.current = makeSoldiers(count);
    soldiersRef.current.forEach((s, i) => { s.x = soldierX(i); s.finalPos = i; });

    function handleClick(e: MouseEvent) {
      if (watchMode || doneRef.current) return;
      const rect = canvas!.getBoundingClientRect();
      const cx = (e.clientX - rect.left) * (W / rect.width);
      const cy = (e.clientY - rect.top) * (H / rect.height);

      const gap = getCurrentGap();
      const soldiers = soldiersRef.current;
      const i = posRef.current;
      const j = i + gap;
      if (j >= soldiers.length) return;

      // User clicks one of the two soldiers in current comparison
      const si = soldiers[i];
      const sj = soldiers[j];
      const clickedI = cx > si.x && cx < si.x + SOLDIER_W && cy > SOLDIER_Y && cy < SOLDIER_Y + SOLDIER_H;
      const clickedJ = cx > sj.x && cx < sj.x + SOLDIER_W && cy > SOLDIER_Y && cy < SOLDIER_Y + SOLDIER_H;

      if (!clickedI && !clickedJ) {
        // Check skip button area
        if (cy > H - 50 && cx > W / 2 - 50 && cx < W / 2 + 50) {
          // User says no swap
          const correct = !shellShouldSwap(soldiers.map((s) => s.rank), i, gap);
          opsRef.current++;
          if (correct) {
            correctSound();
            flashRef.current = { text: "✓ NO SWAP NEEDED", alpha: 1, correct: true };
            advancePointer();
          } else {
            wrongSound();
            shakeRef.current = 8;
            flashRef.current = { text: "WRONG — SWAP IS NEEDED", alpha: 1, correct: false };
          }
        }
        return;
      }

      // User clicks to initiate swap
      const shouldSwap = shellShouldSwap(soldiers.map((s) => s.rank), i, gap);
      opsRef.current++;

      if (shouldSwap) {
        correctSound();
        [soldiers[i].rank, soldiers[j].rank] = [soldiers[j].rank, soldiers[i].rank];
        flashRef.current = { text: "✓ SWAPPED", alpha: 1, correct: true };
      } else {
        wrongSound();
        shakeRef.current = 8;
        flashRef.current = { text: "NO SWAP NEEDED — CLICK SKIP", alpha: 1, correct: false };
      }
      advancePointer();
    }

    if (!watchMode) canvas.addEventListener("click", handleClick);

    if (watchMode) {
      const autoStep = () => {
        if (doneRef.current) return;
        const gap = getCurrentGap();
        const soldiers = soldiersRef.current;
        const i = posRef.current;
        const j = i + gap;
        if (j < soldiers.length && shellShouldSwap(soldiers.map((s) => s.rank), i, gap)) {
          [soldiers[i].rank, soldiers[j].rank] = [soldiers[j].rank, soldiers[i].rank];
          opsRef.current++;
        } else {
          opsRef.current++;
        }
        advancePointer();
        if (!doneRef.current) watchTimerRef.current = setTimeout(autoStep, 250);
      };
      watchTimerRef.current = setTimeout(autoStep, 700);
    }

    function render() {
      animRef.current = requestAnimationFrame(render);
      const soldiers = soldiersRef.current;
      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#06090e");
      bg.addColorStop(1, "#040608");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      const gap = getCurrentGap();
      const i = posRef.current;
      const j = i + gap;
      const gapLabel = SHELL_GAPS[gapIdxRef.current];

      // Gap indicator
      ctx.fillStyle = "#f6c453";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`GAP: ${gapLabel}`, W / 2, 20);
      ctx.fillStyle = "rgba(232,244,255,0.3)";
      ctx.font = "9px monospace";
      ctx.fillText(`OPS: ${opsRef.current}  POS: ${i}/${soldiers.length - gap - 1}`, W / 2, 36);

      // Gap bracket between comparing soldiers
      if (!doneRef.current && j < soldiers.length) {
        const si = soldiers[i];
        const sj = soldiers[j];
        const sx = si.x + SOLDIER_W / 2;
        const ex = sj.x + SOLDIER_W / 2;
        ctx.strokeStyle = "rgba(0,229,255,0.5)";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(sx, SOLDIER_Y - 12); ctx.lineTo(ex, SOLDIER_Y - 12); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(sx, SOLDIER_Y - 8); ctx.lineTo(sx, SOLDIER_Y - 16); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ex, SOLDIER_Y - 8); ctx.lineTo(ex, SOLDIER_Y - 16); ctx.stroke();
        ctx.fillStyle = "#00e5ff";
        ctx.font = "9px monospace";
        ctx.fillText(`gap=${gap}`, (sx + ex) / 2, SOLDIER_Y - 20);
      }

      // Draw soldiers
      soldiers.forEach((soldier, idx) => {
        const isComparing = !doneRef.current && (idx === i || idx === j) && j < soldiers.length;
        const shake = isComparing && shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current : 0;

        // Body
        ctx.fillStyle = isComparing ? "rgba(246,196,83,0.2)" : "rgba(0,60,120,0.4)";
        ctx.strokeStyle = isComparing ? "#f6c453" : "rgba(0,120,200,0.5)";
        ctx.lineWidth = isComparing ? 2 : 1;
        ctx.roundRect(soldier.x + shake, SOLDIER_Y + 16, SOLDIER_W, SOLDIER_H - 16, 4);
        ctx.fill(); ctx.stroke();
        // Head
        ctx.beginPath();
        ctx.arc(soldier.x + SOLDIER_W / 2 + shake, SOLDIER_Y + 12, 13, 0, Math.PI * 2);
        ctx.fillStyle = isComparing ? "rgba(246,196,83,0.25)" : "rgba(0,60,120,0.4)";
        ctx.fill();
        ctx.strokeStyle = isComparing ? "#f6c453" : "rgba(0,120,200,0.5)";
        ctx.stroke();
        // Hat
        ctx.fillStyle = isComparing ? "#f6c453" : "rgba(0,120,200,0.7)";
        ctx.fillRect(soldier.x + SOLDIER_W / 2 - 14 + shake, SOLDIER_Y - 2, 28, 8);

        // Rank
        ctx.fillStyle = isComparing ? "#f6c453" : "rgba(232,244,255,0.7)";
        ctx.font = "bold 15px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(soldier.rank), soldier.x + SOLDIER_W / 2 + shake, SOLDIER_Y + SOLDIER_H / 2 + 8);
        ctx.textBaseline = "alphabetic";
      });

      if (shakeRef.current > 0) shakeRef.current--;

      // Skip button
      if (!watchMode && !doneRef.current && j < soldiers.length) {
        const si = soldiers[i];
        const sj = soldiers[j];
        const shouldSwap = shellShouldSwap(soldiers.map((s) => s.rank), i, gap);
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 1;
        ctx.roundRect(W / 2 - 50, H - 46, 100, 32, 6);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(232,244,255,0.6)";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("SKIP (no swap)", W / 2, H - 26);

        ctx.fillStyle = "rgba(232,244,255,0.4)";
        ctx.font = "10px monospace";
        ctx.fillText(`Click highlighted soldiers to swap, or SKIP if no swap`, W / 2, H - 12);
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
          ctx.fillText(flashRef.current.text, W / 2, H / 2 - 40);
          ctx.globalAlpha = 1;
        }
      }

      if (doneRef.current) {
        ctx.fillStyle = "rgba(6,8,20,0.78)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#6ee7b7";
        ctx.font = "bold 26px monospace";
        ctx.textAlign = "center";
        ctx.fillText("FORMATION SORTED!", W / 2, H / 2);
        ctx.textAlign = "left";
      }
    }

    render();
    return () => {
      cancelAnimationFrame(animRef.current);
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
      style={{ width: "100%", maxWidth: W, display: "block", margin: "0 auto", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}
    />
  );
}

export default function ShellSortGame() {
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
    optimalOperations: 20,
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
          <ShellCanvas key={currentLevel} level={currentLevel} onComplete={handleLevelComplete} watchMode={levelConfig.isWatchMode} />
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
