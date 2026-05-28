'use client';
import { COMPLEXITY_COLOR } from './missionConfigs';

interface Props {
  missionName: string;
  situation: string;
  objective: string;
  constraint: string;
  tools: string[];
  difficulty: string;
  lcRef: string;
  score: number;
}

const DIFF_COLOR: Record<string, string> = {
  Easy: '#22c55e', Medium: '#eab308', Hard: '#ef4444',
};

function scoreColor(s: number) {
  if (s >= 90) return '#22c55e';
  if (s >= 70) return '#3b82f6';
  if (s >= 50) return '#eab308';
  return '#ef4444';
}

function Row({ label, value, vc }: { label: string; value: string; vc: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', fontSize: 11 }}>
      <span style={{ color: '#444', letterSpacing: '0.06em', minWidth: 80, flexShrink: 0 }}>{label}</span>
      <span style={{ color: vc, lineHeight: 1.4 }}>{value}</span>
    </div>
  );
}

export default function MissionBrief({ missionName, situation, objective, constraint, tools, difficulty, lcRef, score }: Props) {
  return (
    <div style={{
      background: '#0a0a0a',
      borderBottom: '1px solid #2a2a2a',
      padding: '14px 24px',
      flexShrink: 0,
      fontFamily: 'var(--font-mono, monospace)',
    }}>
      <div style={{ display: 'flex', gap: 24 }}>
        {/* Left 60% */}
        <div style={{ flex: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 13, color: '#eab308', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 4 }}>
            MISSION: {missionName}
          </div>
          <div style={{ height: 1, background: '#1a1a1a', marginBottom: 4 }} />
          <Row label="SITUATION" value={situation} vc="#e2e8f0" />
          <Row label="OBJECTIVE" value={objective} vc="#22c55e" />
          <Row label="CONSTRAINT" value={constraint} vc="#f97316" />
        </div>

        {/* Right 40% */}
        <div style={{ flex: 4, paddingLeft: 20, borderLeft: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.12em' }}>AVAILABLE TOOLS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {tools.map(t => (
              <span
                key={t}
                style={{
                  background: '#111', border: '1px solid #2a2a2a',
                  color: '#a855f7', fontSize: 9, padding: '2px 8px', borderRadius: 3,
                  letterSpacing: '0.06em',
                }}
              >
                {t}
              </span>
            ))}
          </div>

          {/* Bottom strip */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                color: DIFF_COLOR[difficulty] ?? '#64748b',
              }}>
                {difficulty.toUpperCase()}
              </span>
              <span style={{ fontSize: 9, color: '#2a3a4a' }}>LC #{lcRef}</span>
            </div>
            <div style={{
              fontSize: 10,
              color: score === 0 ? '#222' : scoreColor(score),
              letterSpacing: '0.06em',
            }}>
              SCORE: {score === 0 ? '--' : `${score}/100`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
