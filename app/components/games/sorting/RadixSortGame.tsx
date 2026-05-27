"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import VisualiserLayout from "@/components/VisualiserLayout";
import { StatsModal, CompletionStats } from "@/components/games/sorting/StatsModal";
import { useHints } from "@/lib/useHints";
import { useProgress } from "@/lib/useProgress";
import { getModuleConfig, getNextModule } from "@/lib/sorting/gameConfigs";
import { radixCorrectChute, radixGetDigit, shuffle } from "@/lib/sorting/algorithms";
import { correctSound, wrongSound, completionSound } from "@/lib/sounds";
import { useRouter } from "next/navigation";

const SLUG = "radix-sort";
const CONFIG = getModuleConfig(SLUG)!;
const TOTAL_LEVELS = CONFIG.levels.length;
const W = 840, H = 460;
const CHUTE_COUNT = 10;
const CHUTE_W = 58, CHUTE_H = 110;
const CHUTE_Y = H - CHUTE_H - 30;
const PKG_W = 50, PKG_H = 36;
const BELT_Y = 80;

interface Package {
  id: number;
  value: number;
  x: number;
  y: number;
  placed: boolean;
  chute: number;
}

type RadixPhase = "sorting" | "collecting" | "done";

function chuteX(c: number): number {
  return 10 + c * (CHUTE_W + 4);
}

function makePackages(pass: number, count = 10): Package[] {
  const digits = pass === 2 ? 1 : pass === 3 ? 2 : 3;
  const max = Math.pow(10, digits) - 1;
  const min = Math.pow(10, digits - 1);
  const values = Array.from({ length: count }, () => Math.floor(Math.random() * (max - min + 1)) + min);
  return values.map((value, id) => ({
    id, value,
    x: 20 + id * (PKG_W + 10),
    y: BELT_Y,
    placed: false,
    chute: -1,
  }));
}

function RadixCanvas({ level, onComplete, watchMode }: {
  level: number; onComplete: (ops: number) => void; watchMode: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const doneRef = useRef(false);
  const watchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashRef = useRef<{ text: string; alpha: number; correct: boolean } | null>(null);

  const totalPasses = level === 2 ? 1 : level === 3 ? 2 : 3;
  const passRef = useRef(0);
  const packagesRef = useRef<Package[]>([]);
  const chutesRef = useRef<number[][]>(Array.from({ length: CHUTE_COUNT }, () => []));
  const phaseRef = useRef<RadixPhase>("sorting");
  const collectNextRef = useRef(0);
  const opsRef = useRef(0);
  const draggingRef = useRef<{ pkg: Package; ox: number; oy: number } | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const stabilityQuestionRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    doneRef.current = false;
    passRef.current = 0;
    chutesRef.current = Array.from({ length: CHUTE_COUNT }, () => []);
    phaseRef.current = "sorting";
    collectNextRef.current = 0;
    opsRef.current = 0;
    stabilityQuestionRef.current = false;

    packagesRef.current = makePackages(level, level >= 5 ? 16 : 10);

    function handleMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const sx = W / rect.width, sy = H / rect.height;
      mouseRef.current = { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
      if (draggingRef.current) {
        draggingRef.current.pkg.x = mouseRef.current.x - draggingRef.current.ox;
        draggingRef.current.pkg.y = mouseRef.current.y - draggingRef.current.oy;
      }
    }

    function handleMouseDown(e: MouseEvent) {
      if (watchMode || phaseRef.current !== "sorting") return;
      const rect = canvas!.getBoundingClientRect();
      const sx = W / rect.width, sy = H / rect.height;
      const mx = (e.clientX - rect.left) * sx;
      const my = (e.clientY - rect.top) * sy;
      const pkg = [...packagesRef.current].reverse().find((p) => !p.placed &&
        mx > p.x && mx < p.x + PKG_W && my > p.y && my < p.y + PKG_H);
      if (pkg) {
        draggingRef.current = { pkg, ox: mx - pkg.x, oy: my - pkg.y };
      }
    }

    function handleMouseUp() {
      if (!draggingRef.current) return;
      const pkg = draggingRef.current.pkg;
      draggingRef.current = null;

      let dropped = -1;
      for (let c = 0; c < CHUTE_COUNT; c++) {
        const cx = chuteX(c);
        if (pkg.x + PKG_W / 2 > cx && pkg.x + PKG_W / 2 < cx + CHUTE_W && pkg.y + PKG_H > CHUTE_Y - 10) {
          dropped = c;
          break;
        }
      }

      const correct = radixCorrectChute(pkg.value, passRef.current);
      opsRef.current++;

      if (dropped === correct) {
        correctSound();
        pkg.placed = true;
        pkg.chute = dropped;
        chutesRef.current[dropped].push(pkg.value);
        pkg.x = chuteX(dropped) + 4;
        pkg.y = CHUTE_Y + 10 + (chutesRef.current[dropped].length - 1) * 16;
        flashRef.current = { text: `✓ CHUTE ${dropped}`, alpha: 1, correct: true };

        if (packagesRef.current.every((p) => p.placed)) {
          phaseRef.current = "collecting";
          collectNextRef.current = 0;
        }
      } else if (dropped >= 0) {
        wrongSound();
        pkg.x = 20 + pkg.id * (PKG_W + 10);
        pkg.y = BELT_Y;
        flashRef.current = { text: `WRONG — CHUTE ${correct}`, alpha: 1, correct: false };
      } else {
        pkg.x = 20 + pkg.id * (PKG_W + 10);
        pkg.y = BELT_Y;
      }
    }

    function handleClick(e: MouseEvent) {
      if (phaseRef.current !== "collecting") return;
      const rect = canvas!.getBoundingClientRect();
      const cx = (e.clientX - rect.left) * (W / rect.width);
      const cy = (e.clientY - rect.top) * (H / rect.height);

      for (let c = 0; c < CHUTE_COUNT; c++) {
        const bx = chuteX(c);
        if (cx > bx && cx < bx + CHUTE_W && cy > CHUTE_Y - 10 && cy < CHUTE_Y + CHUTE_H) {
          if (c === collectNextRef.current) {
            correctSound();
            const vals = chutesRef.current[c];
            // Collect
            chutesRef.current[c] = [];
            opsRef.current++;
            collectNextRef.current++;
            flashRef.current = { text: `✓ COLLECTED ${c}`, alpha: 1, correct: true };

            if (collectNextRef.current >= CHUTE_COUNT) {
              // Reconstruct packages for next pass
              const newOrder = chutesRef.current.flat();
              // Actually reconstruct from all chutes collected so far
              const allCollected: number[] = [];
              for (let ci = 0; ci < CHUTE_COUNT; ci++) allCollected.push(...chutesRef.current[ci]);

              passRef.current++;
              chutesRef.current = Array.from({ length: CHUTE_COUNT }, () => []);
              collectNextRef.current = 0;

              if (passRef.current >= totalPasses) {
                doneRef.current = true;
                completionSound();
                setTimeout(() => onComplete(opsRef.current), 500);
              } else {
                // Rebuild packages from current sorted order
                const currentValues = packagesRef.current.map((p) => p.value);
                packagesRef.current = currentValues.map((value, id) => ({
                  id, value,
                  x: 20 + id * (PKG_W + 10),
                  y: BELT_Y,
                  placed: false,
                  chute: -1,
                }));
                phaseRef.current = "sorting";
              }
            }
          } else {
            wrongSound();
            flashRef.current = { text: `COLLECT IN ORDER! NEED ${collectNextRef.current}`, alpha: 1, correct: false };
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
        if (doneRef.current) return;
        if (phaseRef.current === "sorting") {
          const pkg = packagesRef.current.find((p) => !p.placed);
          if (pkg) {
            const c = radixCorrectChute(pkg.value, passRef.current);
            pkg.placed = true; pkg.chute = c;
            chutesRef.current[c].push(pkg.value);
            pkg.x = chuteX(c) + 4;
            pkg.y = CHUTE_Y + 10 + (chutesRef.current[c].length - 1) * 16;
            opsRef.current++;
            if (packagesRef.current.every((p) => p.placed)) {
              phaseRef.current = "collecting";
              collectNextRef.current = 0;
            }
          }
        } else {
          if (collectNextRef.current < CHUTE_COUNT) {
            chutesRef.current[collectNextRef.current] = [];
            collectNextRef.current++;
            opsRef.current++;
            if (collectNextRef.current >= CHUTE_COUNT) {
              passRef.current++;
              chutesRef.current = Array.from({ length: CHUTE_COUNT }, () => []);
              collectNextRef.current = 0;
              if (passRef.current >= totalPasses) {
                doneRef.current = true;
                completionSound();
                setTimeout(() => onComplete(opsRef.current), 500);
                return;
              } else {
                const currentValues = packagesRef.current.map((p) => p.value);
                packagesRef.current = currentValues.map((value, id) => ({
                  id, value,
                  x: 20 + id * (PKG_W + 10),
                  y: BELT_Y,
                  placed: false,
                  chute: -1,
                }));
                phaseRef.current = "sorting";
              }
            }
          }
        }
        if (!doneRef.current) watchTimerRef.current = setTimeout(autoStep, 300);
      };
      watchTimerRef.current = setTimeout(autoStep, 700);
    }

    function render() {
      animRef.current = requestAnimationFrame(render);
      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#100c06");
      bg.addColorStop(1, "#060405");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Conveyor belt
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fillRect(0, BELT_Y - 4, W, PKG_H + 8);
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, BELT_Y - 4); ctx.lineTo(x, BELT_Y + PKG_H + 4); ctx.stroke();
      }

      // Pass indicator
      const passLabel = passRef.current === 0 ? "ONES DIGIT" : passRef.current === 1 ? "TENS DIGIT" : "HUNDREDS DIGIT";
      ctx.fillStyle = "#f6c453";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`PASS ${passRef.current + 1}/${totalPasses}: ${passLabel}`, W / 2, 18);

      // Chutes
      for (let c = 0; c < CHUTE_COUNT; c++) {
        const bx = chuteX(c);
        const isNext = phaseRef.current === "collecting" && c === collectNextRef.current;
        ctx.fillStyle = isNext ? "rgba(0,229,255,0.08)" : "rgba(255,255,255,0.03)";
        ctx.strokeStyle = isNext ? "#00e5ff" : "rgba(255,255,255,0.08)";
        ctx.lineWidth = isNext ? 2 : 1;
        ctx.roundRect(bx, CHUTE_Y, CHUTE_W, CHUTE_H, 4);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = isNext ? "#00e5ff" : "rgba(232,244,255,0.4)";
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "center";
        ctx.fillText(String(c), bx + CHUTE_W / 2, CHUTE_Y + CHUTE_H - 8);

        // Items in chute
        chutesRef.current[c].forEach((val, i) => {
          const py = CHUTE_Y + 8 + i * 15;
          if (py + 12 > CHUTE_Y + CHUTE_H - 18) return;
          ctx.fillStyle = `hsl(${(val * 17) % 360},55%,42%)`;
          ctx.roundRect(bx + 4, py, CHUTE_W - 8, 13, 2);
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.font = "9px monospace";
          ctx.fillText(String(val), bx + CHUTE_W / 2, py + 10);
        });
      }

      // Packages on belt
      packagesRef.current.filter((p) => !p.placed).forEach((pkg) => {
        const isDragging = draggingRef.current?.pkg === pkg;
        const pass = passRef.current;
        const currentDigit = radixGetDigit(pkg.value, pass);
        const digits = String(pkg.value).padStart(3, "0");

        ctx.fillStyle = isDragging ? "rgba(167,139,250,0.5)" : "rgba(167,139,250,0.2)";
        ctx.strokeStyle = isDragging ? "#a78bfa" : "rgba(167,139,250,0.4)";
        ctx.lineWidth = isDragging ? 2 : 1;
        ctx.roundRect(pkg.x, pkg.y, PKG_W, PKG_H, 4);
        ctx.fill(); ctx.stroke();

        // Digits with highlighted active digit
        const dPositions = [2, 1, 0]; // hundreds, tens, ones
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "center";
        digits.split("").forEach((d, di) => {
          const dx = pkg.x + 8 + di * 14;
          const activeDigitPos = 2 - pass; // which character index is active
          ctx.fillStyle = di === activeDigitPos ? "#f6c453" : "rgba(232,244,255,0.4)";
          ctx.fillText(d, dx + 4, pkg.y + PKG_H / 2 + 5);
        });
      });

      // Ops + phase
      ctx.fillStyle = "rgba(232,244,255,0.3)";
      ctx.font = "9px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`OPS: ${opsRef.current}  PHASE: ${phaseRef.current.toUpperCase()}`, W - 10, 18);
      ctx.textAlign = "left";

      if (phaseRef.current === "collecting") {
        ctx.fillStyle = "#00e5ff";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`COLLECT CHUTES IN ORDER — NEXT: ${collectNextRef.current}`, W / 2, CHUTE_Y - 12);
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
          ctx.fillText(flashRef.current.text, W / 2, BELT_Y + PKG_H + 20);
          ctx.globalAlpha = 1;
        }
      }

      if (doneRef.current) {
        ctx.fillStyle = "rgba(6,8,20,0.78)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#f6c453";
        ctx.font = "bold 26px monospace";
        ctx.textAlign = "center";
        ctx.fillText("MAIL SORTED!", W / 2, H / 2);
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
      style={{ width: "100%", maxWidth: W, display: "block", margin: "0 auto", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}
    />
  );
}

export default function RadixSortGame() {
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
    optimalOperations: 30,
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
          <RadixCanvas key={currentLevel} level={currentLevel} onComplete={handleLevelComplete} watchMode={levelConfig.isWatchMode} />
          <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8 }}>
            <p style={{ fontFamily: "var(--font-tac)", fontSize: 13, color: "rgba(232,244,255,0.55)", margin: 0 }}>
              {levelConfig.description}
              {!levelConfig.isWatchMode && " Drag packages to the chute matching their highlighted digit."}
            </p>
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
