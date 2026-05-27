"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import VisualiserLayout from "@/components/VisualiserLayout";
import { StatsModal, CompletionStats } from "@/components/games/sorting/StatsModal";
import { useHints } from "@/lib/useHints";
import { useProgress } from "@/lib/useProgress";
import { getModuleConfig, getNextModule } from "@/lib/sorting/gameConfigs";
import { insertionCorrectGap, shuffle } from "@/lib/sorting/algorithms";
import { correctSound, wrongSound, completionSound } from "@/lib/sounds";
import { useRouter } from "next/navigation";

const SLUG = "insertion-sort";
const CONFIG = getModuleConfig(SLUG)!;
const TOTAL_LEVELS = CONFIG.levels.length;

const ALBUM_COLORS = ["#a78bfa","#f6c453","#fb7185","#6ee7b7","#00e5ff","#fda4af","#c4b5fd","#fed7aa","#93c5fd","#a5f3fc","#6ee7b7","#fde68a","#c4b5fd","#fda4af","#a78bfa","#fed7aa","#fb7185","#93c5fd","#6ee7b7","#f6c453"];
const DECADES = ["64","67","69","71","73","75","77","79","81","83","85","87","89","91","93","95","97","99","02","04","07","09","11","13","15","17","19","21","23"];

const W = 860, H = 320;
const SHELF_Y = 220;
const ALBUM_W = 52, ALBUM_H = 52;
const SHELF_PAD = 30;

interface Album {
  id: number;
  year: number;
  color: string;
  x: number;
  y: number;
  placed: boolean;
}

function makeAlbums(count: number): Album[] {
  const years = shuffle(DECADES.slice(0, count).map(Number));
  return years.map((year, id) => ({
    id, year,
    color: ALBUM_COLORS[id % ALBUM_COLORS.length],
    x: W - ALBUM_W - 20,
    y: SHELF_Y - ALBUM_H,
    placed: false,
  }));
}

function albumSlotX(idx: number): number {
  return SHELF_PAD + idx * (ALBUM_W + 6);
}

function InsertionCanvas({
  level,
  onComplete,
  watchMode,
}: {
  level: number;
  onComplete: (ops: number) => void;
  watchMode: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sortedRef = useRef<Album[]>([]);
  const pendingRef = useRef<Album[]>([]);
  const draggingRef = useRef<{ album: Album; offsetX: number; offsetY: number } | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const opsRef = useRef(0);
  const flashRef = useRef<{ text: string; alpha: number; correct: boolean } | null>(null);
  const animRef = useRef(0);
  const watchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef(false);
  const albumCount = level === 5 ? 14 : level >= 3 ? 10 : 8;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    doneRef.current = false;
    opsRef.current = 0;

    const albums = makeAlbums(albumCount);
    // L4 (worst case): reverse order
    if (level === 4) {
      albums.sort((a, b) => b.year - a.year);
    }

    pendingRef.current = [...albums];
    sortedRef.current = [];

    // Reposition pending albums stacked on right
    pendingRef.current.forEach((a, i) => {
      a.x = W - ALBUM_W - 10 - i * 3;
      a.y = SHELF_Y - ALBUM_H - i * 2;
    });

    // Bring first album forward
    if (pendingRef.current.length) {
      const first = pendingRef.current[pendingRef.current.length - 1];
      first.x = W - ALBUM_W - 40;
      first.y = SHELF_Y - ALBUM_H - 20;
    }

    let currentActive: Album | null = pendingRef.current[pendingRef.current.length - 1] ?? null;

    function placeAlbum(album: Album) {
      const sorted = sortedRef.current;
      const correctGap = insertionCorrectGap(sorted.map((a) => a.year), album.year);
      // Find where user dropped (closest gap)
      const dropX = album.x + ALBUM_W / 2;
      let closestGap = 0;
      let closestDist = Infinity;
      for (let g = 0; g <= sorted.length; g++) {
        const slotX = albumSlotX(g) + ALBUM_W / 2;
        const dist = Math.abs(dropX - slotX);
        if (dist < closestDist) { closestDist = dist; closestGap = g; }
      }

      opsRef.current++;

      if (closestGap === correctGap) {
        correctSound();
        sorted.splice(correctGap, 0, album);
        sorted.forEach((a, i) => { a.x = albumSlotX(i); a.y = SHELF_Y - ALBUM_H; a.placed = true; });
        flashRef.current = { text: "✓ CORRECT SLOT", alpha: 1, correct: true };

        // Next album
        const idx = pendingRef.current.indexOf(album);
        if (idx !== -1) pendingRef.current.splice(idx, 1);

        if (!pendingRef.current.length && !doneRef.current) {
          doneRef.current = true;
          completionSound();
          setTimeout(() => onComplete(opsRef.current), 500);
          currentActive = null;
        } else {
          currentActive = pendingRef.current[pendingRef.current.length - 1] ?? null;
          if (currentActive) {
            currentActive.x = W - ALBUM_W - 40;
            currentActive.y = SHELF_Y - ALBUM_H - 20;
          }
        }
      } else {
        wrongSound();
        album.x = W - ALBUM_W - 40;
        album.y = SHELF_Y - ALBUM_H - 20;
        flashRef.current = { text: "✗ WRONG SLOT", alpha: 1, correct: false };
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      mouseRef.current = { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
      if (draggingRef.current) {
        draggingRef.current.album.x = mouseRef.current.x - draggingRef.current.offsetX;
        draggingRef.current.album.y = mouseRef.current.y - draggingRef.current.offsetY;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (watchMode || !currentActive) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      if (mx > currentActive.x && mx < currentActive.x + ALBUM_W &&
          my > currentActive.y && my < currentActive.y + ALBUM_H) {
        draggingRef.current = { album: currentActive, offsetX: mx - currentActive.x, offsetY: my - currentActive.y };
      }
    };

    const handleMouseUp = () => {
      if (!draggingRef.current) return;
      const album = draggingRef.current.album;
      draggingRef.current = null;
      // Check if dropped on shelf area
      if (album.y + ALBUM_H > SHELF_Y - 20 && album.y < SHELF_Y + 20 && album.x > SHELF_PAD - 20) {
        placeAlbum(album);
      } else {
        album.x = W - ALBUM_W - 40;
        album.y = SHELF_Y - ALBUM_H - 20;
      }
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);

    // Watch mode: auto-place
    if (watchMode) {
      const autoPlace = () => {
        const album = pendingRef.current[pendingRef.current.length - 1];
        if (!album || doneRef.current) return;
        const sorted = sortedRef.current;
        const gap = insertionCorrectGap(sorted.map((a) => a.year), album.year);
        album.x = albumSlotX(gap);
        album.y = SHELF_Y - ALBUM_H;
        setTimeout(() => {
          placeAlbum(album);
          if (!doneRef.current) watchTimerRef.current = setTimeout(autoPlace, 900);
        }, 300);
      };
      watchTimerRef.current = setTimeout(autoPlace, 1000);
    }

    function render() {
      animRef.current = requestAnimationFrame(render);
      ctx.clearRect(0, 0, W, H);

      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#1a100a");
      bg.addColorStop(1, "#0a0605");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Shelf plank
      const shelf = ctx.createLinearGradient(0, SHELF_Y, 0, SHELF_Y + 20);
      shelf.addColorStop(0, "#5c3a1e");
      shelf.addColorStop(1, "#3a2211");
      ctx.fillStyle = shelf;
      ctx.fillRect(SHELF_PAD - 10, SHELF_Y, W - SHELF_PAD - 40, 18);
      ctx.strokeStyle = "#7a4f2a";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(SHELF_PAD - 10, SHELF_Y); ctx.lineTo(W - SHELF_PAD - 40, SHELF_Y); ctx.stroke();

      // Sorted section amber glow
      const sorted = sortedRef.current;
      if (sorted.length > 0) {
        const grd = ctx.createLinearGradient(SHELF_PAD - 10, 0, albumSlotX(sorted.length) + ALBUM_W, 0);
        grd.addColorStop(0, "rgba(246,196,83,0.04)");
        grd.addColorStop(1, "rgba(246,196,83,0)");
        ctx.fillStyle = grd;
        ctx.fillRect(SHELF_PAD - 10, SHELF_Y - ALBUM_H - 20, albumSlotX(sorted.length) + ALBUM_W - SHELF_PAD + 10, ALBUM_H + 20);
      }

      // Draw sorted albums
      sorted.forEach((album, i) => {
        drawAlbum(ctx, album.x, album.y, ALBUM_W, ALBUM_H, album.year, album.color);
      });

      // Guided slot indicator (L2)
      if (level === 2 && currentActive && !draggingRef.current) {
        const gap = insertionCorrectGap(sorted.map((a) => a.year), currentActive.year);
        const slotX = albumSlotX(gap);
        ctx.strokeStyle = "rgba(0,229,255,0.5)";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(slotX, SHELF_Y - ALBUM_H, ALBUM_W, ALBUM_H);
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(0,229,255,0.08)";
        ctx.fillRect(slotX, SHELF_Y - ALBUM_H, ALBUM_W, ALBUM_H);
      }

      // Draw pending stack (behind active)
      pendingRef.current.slice(0, -1).forEach((a, i) => {
        ctx.globalAlpha = 0.5;
        drawAlbum(ctx, a.x + i * 2, a.y - i * 2, ALBUM_W, ALBUM_H, a.year, a.color);
        ctx.globalAlpha = 1;
      });

      // Draw active album (dragging or waiting)
      if (currentActive && !currentActive.placed) {
        const isDragging = draggingRef.current?.album === currentActive;
        if (isDragging) ctx.globalAlpha = 0.85;
        drawAlbum(ctx, currentActive.x, currentActive.y, ALBUM_W, ALBUM_H, currentActive.year, currentActive.color, true);
        ctx.globalAlpha = 1;
      }

      // Flash text
      if (flashRef.current) {
        flashRef.current.alpha -= 0.025;
        if (flashRef.current.alpha <= 0) flashRef.current = null;
        else {
          ctx.globalAlpha = flashRef.current.alpha;
          ctx.fillStyle = flashRef.current.correct ? "#6ee7b7" : "#fb7185";
          ctx.font = "bold 13px monospace";
          ctx.textAlign = "center";
          ctx.fillText(flashRef.current.text, W / 2, SHELF_Y - ALBUM_H - 30);
          ctx.globalAlpha = 1;
        }
      }

      // Stats
      ctx.fillStyle = "rgba(232,244,255,0.4)";
      ctx.font = "10px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`OPS: ${opsRef.current}  PLACED: ${sorted.length}/${albumCount}`, W - 12, 18);
      ctx.textAlign = "left";

      if (doneRef.current) {
        ctx.fillStyle = "rgba(6,8,20,0.75)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#6ee7b7";
        ctx.font = "bold 28px monospace";
        ctx.textAlign = "center";
        ctx.fillText("SHELF SORTED!", W / 2, H / 2);
        ctx.textAlign = "left";
      }
    }

    render();

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
      if (watchTimerRef.current) clearTimeout(watchTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, watchMode]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ width: "100%", maxWidth: W, display: "block", margin: "0 auto", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", cursor: "grab" }}
    />
  );
}

function drawAlbum(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, year: number, color: string, active = false) {
  // Spine background
  ctx.fillStyle = active ? color : `${color}aa`;
  ctx.roundRect(x, y, w, h, 4);
  ctx.fill();
  // Active border
  if (active) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.roundRect(x, y, w, h, 4);
    ctx.stroke();
  }
  // Year label
  ctx.fillStyle = "#000";
  ctx.font = `bold ${w * 0.28}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`'${year}`, x + w / 2, y + h / 2);
  ctx.textBaseline = "alphabetic";
}

export default function InsertionSortGame() {
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
    optimalOperations: 28,
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
        <div style={{ padding: "24px 24px 80px", maxWidth: 920, margin: "0 auto" }}>
          <div style={{ marginBottom: 14 }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.22em",
              color: "#f6c453", padding: "3px 10px",
              background: "rgba(246,196,83,0.08)", border: "1px solid rgba(246,196,83,0.25)", borderRadius: 4,
            }}>
              LEVEL {currentLevel} — {levelConfig.name.toUpperCase()}
            </span>
          </div>
          <InsertionCanvas
            key={currentLevel}
            level={currentLevel}
            onComplete={handleLevelComplete}
            watchMode={levelConfig.isWatchMode}
          />
          <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8 }}>
            <p style={{ fontFamily: "var(--font-tac)", fontSize: 13, color: "rgba(232,244,255,0.55)", margin: 0 }}>
              {levelConfig.description}
              {!levelConfig.isWatchMode && " Drag each incoming album to its correct position on the shelf."}
            </p>
          </div>
        </div>
      </VisualiserLayout>

      <AnimatePresence>
        {showStats && (
          <StatsModal
            stats={stats}
            baseXP={levelConfig.baseXP}
            onClose={() => router.push("/")}
            onNextModule={() => nextModule && router.push(`/learn/sorting/${nextModule.slug}`)}
            nextModule={nextModule}
          />
        )}
      </AnimatePresence>
    </>
  );
}
