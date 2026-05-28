'use client';
import { COMPLEXITY_COLOR, dominantComplexity } from './missionConfigs';
import type { ToolDef } from './missionConfigs';

interface ToolUsed {
  name: string;
  complexity: string;
}

interface Props {
  tools: ToolDef[];
  activeTool: string;
  usedTools: ToolUsed[];
  onSelectTool: (name: string) => void;
}

export default function Toolbox({ tools, activeTool, usedTools, onSelectTool }: Props) {
  const dominant = dominantComplexity(usedTools.map(t => t.complexity));
  const hasUsed = usedTools.length > 0;

  return (
    <div style={{
      background: '#060606',
      borderBottom: '1px solid #1a1a1a',
      padding: '7px 24px',
      flexShrink: 0,
      fontFamily: 'var(--font-mono, monospace)',
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      minHeight: 48,
    }}>
      {/* Tool buttons */}
      <div style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 8, color: '#222', letterSpacing: '0.12em', marginRight: 8 }}>TOOLBOX</span>
        {tools.map(t => {
          const isActive = activeTool === t.name;
          const wasUsed = usedTools.some(u => u.name === t.name);
          return (
            <button
              key={t.name}
              onClick={() => onSelectTool(t.name)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: isActive ? 'rgba(168,85,247,0.1)' : '#0d0d0d',
                border: `1px solid ${isActive ? '#a855f7' : '#222'}`,
                borderRadius: 4,
                padding: '4px 10px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'border-color 0.1s, background 0.1s',
              }}
            >
              <span style={{ fontSize: 11, color: isActive ? '#e2e8f0' : '#555' }}>
                {t.icon} {t.name}
              </span>
              <span style={{
                fontSize: 8, padding: '1px 5px', borderRadius: 2,
                background: '#0a0a0a', border: `1px solid ${COMPLEXITY_COLOR[t.complexity] ?? '#333'}`,
                color: COMPLEXITY_COLOR[t.complexity] ?? '#555',
                letterSpacing: '0.04em',
              }}>
                {t.complexity}
              </span>
              {wasUsed && (
                <span style={{ fontSize: 9, color: '#22c55e' }}>✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Complexity tracker — shows after any tool is used */}
      {hasUsed && (
        <div style={{
          borderLeft: '1px solid #1a1a1a',
          paddingLeft: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          minWidth: 200,
        }}>
          {usedTools.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 9 }}>
              <span style={{ color: '#2a4060', width: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.name}
              </span>
              <span style={{ color: COMPLEXITY_COLOR[t.complexity] ?? '#eab308' }}>{t.complexity}</span>
            </div>
          ))}
          <div style={{
            borderTop: '1px solid #1a1a1a', marginTop: 1, paddingTop: 2,
            display: 'flex', gap: 8, alignItems: 'center', fontSize: 9,
          }}>
            <span style={{ color: '#333', width: 140 }}>───── total</span>
            <span style={{
              color: COMPLEXITY_COLOR[dominant] ?? '#eab308',
              fontWeight: 700,
            }}>
              {dominant}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
