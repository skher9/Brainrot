"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ── CursorAurora ────────────────────────────────────────── */
export function CursorAurora() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div
      ref={ref}
      className="cursor-aurora"
      aria-hidden
      style={{ left: "-999px", top: "-999px" }}
    />
  );
}

/* ── Constellation ───────────────────────────────────────── */
interface Star { x: number; y: number; r: number; op: number; }

export function Constellation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: 0.5, y: 0.5 });
  const starsRef = useRef<Star[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      starsRef.current = Array.from({ length: 80 }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.2 + 0.3,
        op: Math.random() * 0.5 + 0.1,
      }));
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: MouseEvent) => {
      mouse.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    const LINK_DIST = 0.12;
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const mx = mouse.current.x;
      const my = mouse.current.y;
      ctx.clearRect(0, 0, w, h);

      const stars = starsRef.current.map((s) => ({
        ...s,
        px: (s.x + (mx - 0.5) * 0.03) * w,
        py: (s.y + (my - 0.5) * 0.03) * h,
      }));

      // Draw lines
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const dx = stars[i].px - stars[j].px;
          const dy = stars[i].py - stars[j].py;
          const d = Math.sqrt(dx * dx + dy * dy) / w;
          if (d < LINK_DIST) {
            const alpha = (1 - d / LINK_DIST) * 0.08;
            ctx.beginPath();
            ctx.moveTo(stars[i].px, stars[i].py);
            ctx.lineTo(stars[j].px, stars[j].py);
            ctx.strokeStyle = `rgba(167,139,250,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      // Draw dots
      for (const s of stars) {
        ctx.beginPath();
        ctx.arc(s.px, s.py, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167,139,250,${s.op})`;
        ctx.fill();
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="constellation"
      aria-hidden
    />
  );
}

/* ── Toast system ────────────────────────────────────────── */
export type ToastType = "xp" | "achievement" | "streak" | "level";

interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  body?: string;
}

let toastId = 0;
let toastDispatch: ((t: ToastItem) => void) | null = null;

export function fireToast(type: ToastType, title: string, body?: string) {
  if (!toastDispatch) return;
  toastDispatch({ id: ++toastId, type, title, body });
}

const TOAST_STYLES: Record<ToastType, { border: string; icon: string; accent: string }> = {
  xp:          { border: "border-[var(--gold)]/40",    icon: "⚡", accent: "text-[var(--gold)]" },
  achievement: { border: "border-violet-500/40",        icon: "🏆", accent: "text-violet-400" },
  streak:      { border: "border-orange-500/40",        icon: "🔥", accent: "text-orange-400" },
  level:       { border: "border-cyan-500/40",          icon: "✦",  accent: "text-cyan-400" },
};

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    toastDispatch = (t) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((p) => p.filter((x) => x.id !== t.id)), 3200);
    };
    return () => { toastDispatch = null; };
  }, []);

  return (
    <div className="toast-host">
      <AnimatePresence>
        {toasts.map((t) => {
          const s = TOAST_STYLES[t.type];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`relative hud-panel border ${s.border} rounded-xl px-4 py-3 flex items-start gap-3 min-w-[200px] max-w-[260px] pointer-events-auto overflow-hidden`}
            >
              <Corners size={8} thickness={1} opacity={0.4} />
              <span className="text-lg leading-none mt-0.5">{s.icon}</span>
              <div>
                <p className={`font-black text-xs ${s.accent}`}>{t.title}</p>
                {t.body && <p className="text-white/40 text-[11px] mt-0.5">{t.body}</p>}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// Import Corners here to avoid circular dependency
function Corners({ size = 14, thickness = 1.5, opacity = 0.5 }: { size?: number; thickness?: number; opacity?: number }) {
  const s = size;
  const t = thickness;
  const color = "var(--gold)";
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden>
      <span style={{ position:"absolute", top:4, left:4, width:s, height:s, borderTop:`${t}px solid ${color}`, borderLeft:`${t}px solid ${color}`, opacity }} />
      <span style={{ position:"absolute", top:4, right:4, width:s, height:s, borderTop:`${t}px solid ${color}`, borderRight:`${t}px solid ${color}`, opacity }} />
      <span style={{ position:"absolute", bottom:4, left:4, width:s, height:s, borderBottom:`${t}px solid ${color}`, borderLeft:`${t}px solid ${color}`, opacity }} />
      <span style={{ position:"absolute", bottom:4, right:4, width:s, height:s, borderBottom:`${t}px solid ${color}`, borderRight:`${t}px solid ${color}`, opacity }} />
    </span>
  );
}

/* ── LevelUpFlash ────────────────────────────────────────── */
export function LevelUpFlash({ level, onDone }: { level: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="level-up-flash"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/80" />
      <motion.div
        className="relative text-center px-10"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 1.2, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <p className="text-[var(--gold)] font-black text-xs tracking-[0.3em] uppercase mb-2 opacity-70">Level Up</p>
        <p
          className="text-white text-5xl font-black mb-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {level}
        </p>
        <p className="text-white/30 text-sm">Keep rotting.</p>
      </motion.div>
    </motion.div>
  );
}

/* ── LiveFeed ────────────────────────────────────────────── */
const LIVE_ITEMS = [
  "devboi88 scored 100% on Boss Level",
  "sortqueen just hit Sorting Padawan",
  "xX_debugger_Xx found the bug in 2s",
  "rotmaster just completed Bubble Sort",
  "anon_coder earned 3-day streak",
  "algo_nerd passed Beat the Clock",
  "cs_grind got 30/30 on You Decide",
  "bytebreaker hit Code Ronin rank",
];

export function LiveFeed() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % LIVE_ITEMS.length), 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-2)] border border-[var(--border)] rounded-lg overflow-hidden">
      <span className="relative flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400">
        <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
      </span>
      <div className="overflow-hidden h-4 flex-1">
        <AnimatePresence mode="wait">
          <motion.p
            key={idx}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="text-[11px] text-white/35 font-mono whitespace-nowrap"
          >
            {LIVE_ITEMS[idx]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── TrendingRail ────────────────────────────────────────── */
const TRENDING = [
  { name: "Binary Search",    tag: "O(log n)",  color: "#67e8f9", heat: 94 },
  { name: "Quick Sort",       tag: "O(n log n)",color: "#a78bfa", heat: 87 },
  { name: "Graph BFS/DFS",    tag: "O(V+E)",    color: "#34d399", heat: 76 },
  { name: "Attention (AI)",   tag: "O(n²)",     color: "#f6c453", heat: 71 },
  { name: "Merge Sort",       tag: "O(n log n)",color: "#f43f5e", heat: 65 },
];

function MiniViz({ color, heat }: { color: string; heat: number }) {
  const bars = [heat * 0.6, heat * 0.8, heat * 0.5, heat * 0.95, heat * 0.7, heat * 0.85];
  return (
    <div className="flex items-end gap-0.5 h-5">
      {bars.map((h, i) => (
        <div
          key={i}
          style={{
            width: 4,
            height: `${(h / 100) * 20}px`,
            background: color,
            borderRadius: "1px 1px 0 0",
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  );
}

export function TrendingRail() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[var(--gold)] text-[10px] font-black tracking-[0.2em] uppercase opacity-60">
          Trending
        </span>
        <div className="flex-1 h-px bg-white/[0.04]" />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {TRENDING.map((t, i) => (
          <div
            key={t.name}
            className="relative flex-shrink-0 hud-panel border border-white/[0.06] rounded-xl p-3.5 w-44 cursor-default hover:border-white/[0.12] transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-[10px] text-white/25 font-black tabular-nums">#{i + 1}</span>
              <MiniViz color={t.color} heat={t.heat} />
            </div>
            <p className="text-white/80 font-bold text-xs leading-tight mb-1">{t.name}</p>
            <p className="font-mono text-[10px]" style={{ color: t.color, opacity: 0.7 }}>
              {t.tag}
            </p>
            <div className="mt-2 h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                style={{ width: `${t.heat}%`, background: t.color, opacity: 0.5 }}
                className="h-full rounded-full"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
