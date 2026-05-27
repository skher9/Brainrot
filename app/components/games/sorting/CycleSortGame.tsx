"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import VisualiserLayout from "@/components/VisualiserLayout";
import { StatsModal, CompletionStats } from "@/components/games/sorting/StatsModal";
import { useHints } from "@/lib/useHints";
import { useProgress } from "@/lib/useProgress";
import { getModuleConfig, getNextModule } from "@/lib/sorting/gameConfigs";
import { cycleCorrectPosition, cycleIsSorted, shuffle } from "@/lib/sorting/algorithms";
import { correctSound, wrongSound, completionSound } from "@/lib/sounds";
import { useRouter } from "next/navigation";

const SLUG = "cycle-sort";
const CONFIG = getModuleConfig(SLUG)!;
const TOTAL_LEVELS = CONFIG.levels.length;
const W = 820, H = 420;
const ITEM_R = 28;
const RING_R = 160;
const CX = W / 2, CY = H / 2 + 10;

function slotAngle(pos: number, total: number): number {
  return (pos / total) * Math.PI * 2 - Math.PI / 2;
}

function slotXY(pos: number, total: number): { x: number; y: number } {
  const a = slotAngle(pos, total);
  return { x: CX + Math.cos(a) * RING_R, y: CY + Math.sin(a) * RING_R };
}

interface CycleItem {
  id: number;
  value: number;
  currentPos: number;
}

interface CycleState {
  items: CycleItem[];
  held: CycleItem | null;
  ops: number;
  writes: number;
  phase: "playing" | "done";
}

function makeItems(n: number): CycleItem[] {
  const vals = shuffle(Array.from({ length: n }, (_, i) => i + 1));
  return vals.map((value, id) => ({ id, value, currentPos: id }));
}

function CycleCanvas({ level, onComplete, watchMode }: {
  level: number; onComplete: (ops: number) => void; watchMode: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const doneRef = useRef(false);
  const watchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashRef = useRef<{ text: string; alpha: number; correct: boolean } | null>(null);
  const stateRef = useRef<CycleState | null>(null);

  const N = level <= 2 ? 5 : level >= 4 ? 10 : 8;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    doneRef.current = false;

    stateRef.current = {
      items: makeItems(N),
      held: null,
      ops: 0,
      writes: 0,
      phase: "playing",
    };

    function getItemAtSlot(pos: number): CycleItem | null {
      return stateRef.current?.items.find((it) => it.currentPos === pos) ?? null;
    }

    function handleClick(e: MouseEvent) {
      const s = stateRef.current;
      if (!s || doneRef.current || watchMode) return;
      const rect = canvas!.getBoundingClientRect();
      const cx = (e.clientX - rect.left) * (W / rect.width);
      const cy = (e.clientY - rect.top) * (H / rect.height);

      // Find clicked slot
      let clickedPos = -1;
      for (let p = 0; p < N; p++) {
        const { x, y } = slotXY(p, N);
        if (Math.sqrt((cx - x) ** 2 + (cy - y) ** 2) < ITEM_R + 10) {
          clickedPos = p;
          break;
        }
      }
      if (clickedPos === -1) return;

      if (!s.held) {
        // Pick up item at this slot
        const item = getItemAtSlot(clickedPos);
        if (!item) return;
        s.held = item;
        flashRef.current = { text: `PICKED UP ${item.value} — NEEDS SLOT ${item.value - 1}`, alpha: 1, correct: true };
      } else {
        // Try to place held item at clicked slot
        const correctPos = s.held.value - 1; // 1-indexed
        const incumbent = getItemAtSlot(clickedPos);

        if (clickedPos === correctPos) {
          correctSound();
          s.held.currentPos = clickedPos;
          s.writes++;
          s.ops++;
          flashRef.current = { text: `✓ PLACED ${s.held.value}`, alpha: 1, correct: true };

          if (incumbent && incumbent.id !== s.held.id) {
            // Pick up displaced item
            incumbent.currentPos = -1;
            s.held = incumbent;
            flashRef.current = { text: `PLACED! Now hold ${incumbent.value}`, alpha: 1, correct: true };
          } else {
            s.held = null;
          }

          // Check done
          if (cycleIsSorted(s.items.map((it) => ({ pos: it.currentPos, val: it.value })).sort((a, b) => a.pos - b.pos).map((it) => it.val)) && !doneRef.current) {
            const allCorrect = s.items.every((it) => it.currentPos === it.value - 1);
            if (allCorrect) {
              doneRef.current = true;
              completionSound();
              setTimeout(() => onComplete(s.ops), 500);
            }
          }
        } else {
          wrongSound();
          flashRef.current = { text: `WRONG SLOT — ${s.held.value} BELONGS AT SLOT ${correctPos + 1}`, alpha: 1, correct: false };
        }
      }
    }

    if (!watchMode) canvas.addEventListener("click", handleClick);

    if (watchMode) {
      // Cycle sort algorithm auto-play
      const autoStep = () => {
        const s = stateRef.current;
        if (!s || doneRef.current) return;

        const arr = Array(N).fill(0);
        s.items.forEach((it) => { if (it.currentPos >= 0) arr[it.currentPos] = it.value; });

        // Find first item out of place
        const wrong = s.items.find((it) => it.currentPos !== it.value - 1);
        if (!wrong) {
          doneRef.current = true;
          completionSound();
          setTimeout(() => onComplete(s.ops), 500);
          return;
        }

        const target = wrong.value - 1;
        const atTarget = s.items.find((it) => it.currentPos === target);
        if (atTarget) {
          atTarget.currentPos = wrong.currentPos;
          wrong.currentPos = target;
          s.ops++;
          s.writes += 2;
        } else {
          wrong.currentPos = target;
          s.ops++;
          s.writes++;
        }

        watchTimerRef.current = setTimeout(autoStep, 600);
      };
      watchTimerRef.current = setTimeout(autoStep, 800);
    }

    function render() {
      animRef.current = requestAnimationFrame(render);
      const s = stateRef.current;
      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#080a10");
      bg.addColorStop(1, "#060809");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      if (!s) return;

      // Ring track
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(CX, CY, RING_R, 0, Math.PI * 2); ctx.stroke();

      // Slot positions
      for (let p = 0; p < N; p++) {
        const { x, y } = slotXY(p, N);
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, ITEM_R + 6, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "rgba(232,244,255,0.2)";
        ctx.font = "8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`slot ${p + 1}`, x, y + ITEM_R + 18);
      }

      // Items
      s.items.forEach((item) => {
        if (item.currentPos < 0) return; // held, don't draw on ring
        const isHeld = s.held?.id === item.id;
        const { x, y } = slotXY(item.currentPos, N);
        const correct = item.currentPos === item.value - 1;

        const grd = ctx.createRadialGradient(x, y, 0, x, y, ITEM_R);
        if (correct) { grd.addColorStop(0, "rgba(110,231,183,0.5)"); grd.addColorStop(1, "rgba(110,231,183,0.1)"); }
        else if (isHeld) { grd.addColorStop(0, "rgba(0,229,255,0.5)"); grd.addColorStop(1, "rgba(0,229,255,0.1)"); }
        else { grd.addColorStop(0, "rgba(167,139,250,0.4)"); grd.addColorStop(1, "rgba(167,139,250,0.05)"); }

        ctx.beginPath(); ctx.arc(x, y, ITEM_R, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();
        ctx.strokeStyle = correct ? "#6ee7b7" : isHeld ? "#00e5ff" : "rgba(167,139,250,0.6)";
        ctx.lineWidth = correct || isHeld ? 2.5 : 1.5;
        ctx.stroke();

        ctx.fillStyle = correct ? "#6ee7b7" : isHeld ? "#00e5ff" : "#c4b5fd";
        ctx.font = "bold 15px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(item.value), x, y);
        ctx.textBaseline = "alphabetic";
      });

      // Held item display near center
      if (s.held) {
        ctx.fillStyle = "rgba(0,229,255,0.15)";
        ctx.beginPath(); ctx.arc(CX, CY, ITEM_R + 4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#00e5ff";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(CX, CY, ITEM_R + 4, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "#00e5ff";
        ctx.font = "bold 16px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(s.held.value), CX, CY - 6);
        ctx.font = "8px monospace";
        ctx.fillText(`→ slot ${s.held.value}`, CX, CY + 12);
        ctx.textBaseline = "alphabetic";
      }

      // Stats
      ctx.fillStyle = "rgba(232,244,255,0.3)";
      ctx.font = "9px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`OPS: ${s.ops}  WRITES: ${s.writes}`, W - 12, 20);
      ctx.textAlign = "left";

      if (!watchMode && !s.held && !doneRef.current) {
        ctx.fillStyle = "rgba(232,244,255,0.4)";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("CLICK an item to pick it up, then click its correct slot", W / 2, H - 20);
      }

      // Flash
      if (flashRef.current) {
        flashRef.current.alpha -= 0.018;
        if (flashRef.current.alpha <= 0) flashRef.current = null;
        else {
          ctx.globalAlpha = flashRef.current.alpha;
          ctx.fillStyle = flashRef.current.correct ? "#6ee7b7" : "#fb7185";
          ctx.font = "bold 12px monospace";
          ctx.textAlign = "center";
          ctx.fillText(flashRef.current.text, W / 2, 40);
          ctx.globalAlpha = 1;
        }
      }

      if (doneRef.current) {
        ctx.fillStyle = "rgba(6,8,20,0.78)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#a78bfa";
        ctx.font = "bold 24px monospace";
        ctx.textAlign = "center";
        ctx.fillText("RING SORTED!", W / 2, H / 2 - 12);
        ctx.fillStyle = "rgba(232,244,255,0.4)";
        ctx.font = "11px monospace";
        ctx.fillText(`Only ${s.writes} writes — cycle sort minimizes memory writes`, W / 2, H / 2 + 14);
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

export default function CycleSortGame() {
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
    optimalOperations: 10,
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
          <CycleCanvas key={currentLevel} level={currentLevel} onComplete={handleLevelComplete} watchMode={levelConfig.isWatchMode} />
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
