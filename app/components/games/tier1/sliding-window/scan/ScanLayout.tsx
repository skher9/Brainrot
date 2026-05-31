"use client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { SCAN, type StarCount } from "./types";

/* ── Surveillance room SVG background ───────────────────── */
export function SurveillanceRoom({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 1440 320"
      fill="none"
      preserveAspectRatio="xMidYMax slice"
      style={{ position: "absolute", bottom: 0, left: 0, right: 0, width: "100%", ...style }}
    >
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#060a08" />
          <stop offset="100%" stopColor="#040c08" />
        </linearGradient>
        <radialGradient id="screenGlow" cx="50%" cy="30%" r="40%">
          <stop offset="0%" stopColor="rgba(0,220,120,0.06)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      <rect width="1440" height="320" fill="url(#bgGrad)" />
      <rect width="1440" height="320" fill="url(#screenGlow)" />

      {/* Stars (dim) */}
      {[[80,18],[250,30],[420,12],[680,44],[900,20],[1100,35],[1360,15],[160,55],[540,48],[1250,58]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="0.8" fill="rgba(0,220,120,0.3)" />
      ))}

      {/* Back wall — server rack silhouettes */}
      <rect x="0"    y="180" width="1440" height="140" fill="#050c08" />
      {/* Rack units */}
      {[80,180,280,400,520,640,760,880,1000,1120,1240,1360].map((x, i) => (
        <g key={i}>
          <rect x={x} y="185" width="60" height="110" fill="#060e0a" stroke="rgba(0,220,120,0.08)" strokeWidth="1" />
          {/* Rack unit LEDs */}
          {[0,1,2,3,4].map(row => (
            <rect key={row} x={x + 6} y={190 + row * 18} width="48" height="10" rx="1"
              fill={`rgba(0,220,120,${row === 2 ? "0.14" : "0.05"})`} />
          ))}
          {/* Status LED */}
          <circle cx={x + 52} cy={195} r="2" fill={i % 3 === 0 ? "rgba(0,220,120,0.8)" : "rgba(220,180,0,0.6)"} />
        </g>
      ))}

      {/* Monitor bank — center */}
      <rect x="580" y="130" width="280" height="160" rx="4" fill="#040c08" stroke="rgba(0,220,120,0.2)" strokeWidth="1.5" />
      {/* Monitor grid lines */}
      {[145,160,175,190,205,220,235,250,265,280].map((y, i) => (
        <line key={i} x1="585" y1={y} x2="855" y2={y} stroke="rgba(0,220,120,0.06)" strokeWidth="1" />
      ))}
      {/* Scan line */}
      <motion.rect
        x="581" width="278" height="3" rx="1" fill="rgba(0,220,120,0.25)"
        initial={{ y: 131 }}
        animate={{ y: [131, 287, 131] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
      {/* Monitor text lines */}
      {[140,155,170,185,200,215].map((y, i) => (
        <rect key={i} x={590 + (i % 3) * 12} y={y} width={40 + (i * 7) % 50} height="5" rx="1"
          fill={`rgba(0,220,120,${0.06 + (i % 4) * 0.03})`} />
      ))}

      {/* Side monitors */}
      <rect x="320" y="155" width="180" height="115" rx="3" fill="#040c08" stroke="rgba(0,220,120,0.12)" strokeWidth="1" />
      <rect x="940" y="155" width="180" height="115" rx="3" fill="#040c08" stroke="rgba(0,220,120,0.12)" strokeWidth="1" />

      {/* Console desk */}
      <rect x="0" y="265" width="1440" height="20" fill="#060e0a" />
      <rect x="0" y="265" width="1440" height="2" fill="rgba(0,220,120,0.12)" />

      {/* Keyboard / equipment silhouettes */}
      <rect x="560" y="268" width="200" height="8" rx="2" fill="#040c08" stroke="rgba(0,220,120,0.08)" strokeWidth="1" />
      <rect x="780" y="270" width="80" height="6" rx="2" fill="#040c08" stroke="rgba(0,220,120,0.06)" strokeWidth="1" />

      {/* Floor */}
      <rect x="0" y="285" width="1440" height="35" fill="url(#bgGrad)" />
    </svg>
  );
}

/* ── Star bar ────────────────────────────────────────────── */
export function ScanStarBar({ stars, size = 18 }: { stars: StarCount; size?: number }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={i < stars ? SCAN.green : "none"}
            stroke={i < stars ? SCAN.green : SCAN.textFaint} strokeWidth="1.5" />
        </svg>
      ))}
    </div>
  );
}

/* ── Aha moment panel ────────────────────────────────────── */
export function ScanAhaMoment({ title, body, complexity, onContinue }: {
  title: string; body: string; complexity: string; onContinue: () => void;
}) {
  return (
    <motion.div
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 35 }}
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 300,
        background: SCAN.bgPanel,
        borderTop: `1px solid ${SCAN.borderGreen}`,
        borderTopLeftRadius: 16, borderTopRightRadius: 16,
        padding: "24px 28px 32px",
        boxShadow: `0 -20px 60px rgba(0,0,0,0.8)`,
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", color: SCAN.green, marginBottom: 8 }}>
          ◆ PATTERN IDENTIFIED
        </div>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: SCAN.text, marginBottom: 10 }}>{title}</h3>
        <p style={{ fontSize: 14, color: SCAN.textDim, lineHeight: 1.7, marginBottom: 16 }}>{body}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: SCAN.textFaint, letterSpacing: "0.14em" }}>COMPLEXITY</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 800, color: SCAN.green }}>{complexity}</span>
          </div>
          <button
            onClick={onContinue}
            style={{
              padding: "10px 24px", borderRadius: 8, cursor: "pointer",
              background: "rgba(0,220,120,0.08)", border: `1px solid ${SCAN.borderGreen}`,
              color: SCAN.green, fontFamily: "var(--font-tac)", fontWeight: 700, fontSize: 14,
              letterSpacing: "0.08em",
            }}
          >
            CONTINUE →
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Scan game layout wrapper ────────────────────────────── */
interface ScanLayoutProps {
  gameName: string;
  levelNum: number;
  totalLevels?: number;
  xpReward: number;
  stars: StarCount;
  onBack?: () => void;
  children: React.ReactNode;
}

export default function ScanLayout({ gameName, levelNum, totalLevels = 8, xpReward, stars, onBack, children }: ScanLayoutProps) {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.push("/learn/tier1/sliding-window"));

  return (
    <div style={{ minHeight: "100vh", background: SCAN.bg, color: SCAN.text, fontFamily: "var(--font-tac)", position: "relative", overflow: "hidden" }}>
      {/* Scan-line overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `repeating-linear-gradient(0deg, ${SCAN.scanLine} 0px, ${SCAN.scanLine} 1px, transparent 1px, transparent 3px)`,
      }} />

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 320, zIndex: 0, pointerEvents: "none" }}>
        <SurveillanceRoom />
      </div>

      {/* Top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        height: 52, display: "flex", alignItems: "center", padding: "0 20px",
        background: "rgba(4,12,8,0.94)", backdropFilter: "blur(14px)",
        borderBottom: `1px solid ${SCAN.border}`,
      }}>
        <button
          onClick={handleBack}
          style={{ background: "none", border: "none", cursor: "pointer", color: SCAN.textDim, display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "var(--font-tac)" }}
        >
          ← Scanner District
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.16em", color: SCAN.textFaint }}>
            {gameName} · SIGNAL {levelNum}/{totalLevels}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ScanStarBar stars={stars} size={15} />
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: SCAN.amber }}>+{xpReward} XP</div>
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, paddingBottom: 120 }}>
        {children}
      </div>
    </div>
  );
}

/* ── Case card (for hub case select) ─────────────────────── */
export interface CaseCardProps {
  caseNum: string;
  title: string;
  description: string;
  levelsComplete: number;
  totalLevels: number;
  status: "available" | "active" | "completed" | "locked";
  lockTooltip?: string;
  onClick?: () => void;
}

export function CaseCard({ caseNum, title, description, levelsComplete, totalLevels, status, lockTooltip, onClick }: CaseCardProps) {
  const isLocked    = status === "locked";
  const isCompleted = status === "completed";
  const isActive    = status === "active";

  return (
    <motion.button
      onClick={!isLocked ? onClick : undefined}
      whileHover={!isLocked ? { y: -3, boxShadow: `0 8px 28px rgba(0,0,0,0.6)` } : {}}
      whileTap={!isLocked ? { scale: 0.98 } : {}}
      title={isLocked ? lockTooltip : undefined}
      style={{
        width: "100%", textAlign: "left",
        background: isLocked
          ? "rgba(6,14,10,0.6)"
          : isCompleted ? "rgba(0,80,40,0.1)" : isActive ? "rgba(0,60,40,0.08)" : "rgba(10,20,16,0.9)",
        border: `1px solid ${isCompleted ? "rgba(0,220,120,0.4)" : isActive ? SCAN.borderGreen : SCAN.border}`,
        boxShadow: isActive ? `0 0 18px rgba(0,220,120,0.08)` : "none",
        borderRadius: 10, padding: "18px 20px 15px",
        cursor: isLocked ? "not-allowed" : "pointer",
        opacity: isLocked ? 0.4 : 1,
        position: "relative", overflow: "hidden",
      }}
    >
      {/* Corner fold */}
      <div style={{
        position: "absolute", top: 0, right: 0, width: 0, height: 0,
        borderStyle: "solid", borderWidth: "0 26px 26px 0",
        borderColor: `transparent ${isCompleted ? "rgba(0,220,120,0.2)" : "rgba(0,220,120,0.08)"} transparent transparent`,
      }} />

      {/* SCAN COMPLETE stamp */}
      {isCompleted && (
        <div style={{
          position: "absolute", top: 10, right: 10,
          fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 800, letterSpacing: "0.18em",
          color: SCAN.green, border: `2px solid ${SCAN.green}`,
          padding: "2px 5px", borderRadius: 3, transform: "rotate(-6deg)", opacity: 0.9,
        }}>
          SCAN COMPLETE
        </div>
      )}

      {/* ACTIVE badge */}
      {isActive && (
        <motion.div
          animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.8, repeat: Infinity }}
          style={{
            position: "absolute", top: 10, right: 10,
            fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 800, letterSpacing: "0.14em",
            color: SCAN.green, border: `1.5px solid ${SCAN.green}`,
            padding: "2px 5px", borderRadius: 3,
          }}
        >
          SCANNING
        </motion.div>
      )}

      {/* Lock overlay */}
      {isLocked && (
        <>
          <div style={{
            position: "absolute", inset: 0,
            background: "repeating-linear-gradient(135deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 4px, transparent 4px, transparent 8px)",
            borderRadius: 10,
          }} />
          <div style={{
            position: "absolute", top: 8, right: 12,
            fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 800, letterSpacing: "0.16em",
            color: SCAN.textFaint, border: `1.5px solid ${SCAN.textFaint}`,
            padding: "2px 5px", borderRadius: 3, transform: "rotate(-4deg)",
          }}>
            CLASSIFIED
          </div>
        </>
      )}

      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em", color: SCAN.textFaint, marginBottom: 6 }}>
        CASE FILE #{caseNum}
      </div>
      <div style={{
        fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800,
        color: isLocked ? SCAN.textFaint : SCAN.text, marginBottom: 6,
        filter: isLocked ? "blur(2px)" : "none", letterSpacing: "-0.01em",
      }}>
        {isLocked ? "████████ ████" : title}
      </div>
      {!isLocked && (
        <div style={{ fontFamily: "var(--font-tac)", fontSize: 12, color: SCAN.textDim, marginBottom: 12, lineHeight: 1.5 }}>
          {description}
        </div>
      )}

      {/* Level dots */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {Array.from({ length: totalLevels }).map((_, i) => {
            const filled = i < levelsComplete;
            return (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: "50%",
                background: filled ? (isCompleted ? SCAN.green : SCAN.green) : "rgba(255,255,255,0.06)",
                border: `1px solid ${filled ? SCAN.green : "rgba(255,255,255,0.08)"}`,
                boxShadow: filled ? `0 0 4px ${SCAN.green}` : "none",
              }} />
            );
          })}
        </div>
        {!isLocked && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: SCAN.textFaint, marginLeft: 2 }}>
            {levelsComplete}/{totalLevels}
          </span>
        )}
      </div>
    </motion.button>
  );
}
