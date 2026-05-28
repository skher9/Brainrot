"use client";
// LC #162 — Find Peak Element. 14 mountains, 5 signal probes to locate peak.
import { useEffect, useRef } from "react";
import type { GameProps } from "../types";
import { playSound } from "../SoundEngine";
import { emitReaction } from "../FloatingReactions";

const N = 14;
const MAX_PROBES = 5;

function makePeakHeights(): number[] {
  const h: number[] = new Array(N).fill(0);
  // guarantee at least one peak by using a "mountain" shape with randomness
  const peakIdx = 2 + Math.floor(Math.random() * (N - 4));
  for (let i = 0; i <= peakIdx; i++) {
    h[i] = Math.floor((i / peakIdx) * 80) + 20 + Math.floor(Math.random() * 15);
  }
  for (let i = peakIdx + 1; i < N; i++) {
    const descent = (i - peakIdx) / (N - peakIdx);
    h[i] = Math.floor(h[peakIdx] * (1 - descent)) + 10 + Math.floor(Math.random() * 12);
  }
  // ensure h[peakIdx] > both neighbors and all values are unique-ish
  h[peakIdx] = Math.max(h[peakIdx], 95 + Math.floor(Math.random() * 10));
  return h;
}

function isPeak(h: number[], i: number): boolean {
  const leftOk = i === 0 || h[i] > h[i - 1];
  const rightOk = i === N - 1 || h[i] > h[i + 1];
  return leftOk && rightOk;
}

export default function DeadSignal({ onSolve, onAttempt }: GameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<{ destroy: () => void } | null>(null);
  const solvedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    async function init() {
      const Phaser = (await import("phaser")).default;
      if (cancelled || !containerRef.current) return;

      const W = containerRef.current.clientWidth || 800;
      const H = containerRef.current.clientHeight || 500;

      const HEIGHTS = makePeakHeights();

      class DeadSignalScene extends Phaser.Scene {
        private mountains: Phaser.GameObjects.Container[] = [];
        private probesLeft = MAX_PROBES;
        private probeText!: Phaser.GameObjects.Text;
        private statusText!: Phaser.GameObjects.Text;
        private rangeText!: Phaser.GameObjects.Text;
        private busy = false;
        private left = 0;
        private right = N - 1;
        // which mountains have been probed (show signal indicator)
        private probed: Set<number> = new Set();

        constructor() { super({ key: 'DeadSignalScene' }); }

        create() {
          this.cameras.main.setBackgroundColor('#030608');
          this.drawSky();
          this.buildMountains();
          this.buildHUD();
          this.input.on('pointerdown', this.onClick, this);
        }

        drawSky() {
          const g = this.add.graphics();
          // gradient sky using multiple rect layers
          for (let i = 0; i < 10; i++) {
            const alpha = 0.03 + i * 0.02;
            g.fillStyle(0x001122, alpha);
            g.fillRect(0, 0, W, H * 0.6);
          }
          // horizon line
          g.lineStyle(1, 0x0a2040, 0.5);
          g.lineBetween(0, H * 0.62, W, H * 0.62);
          // stars
          for (let s = 0; s < 60; s++) {
            const sx = Math.random() * W;
            const sy = Math.random() * H * 0.55;
            const sa = 0.3 + Math.random() * 0.6;
            g.fillStyle(0xaaaacc, sa);
            g.fillCircle(sx, sy, 0.7);
          }
        }

        buildMountains() {
          const pad = 20;
          const mw = Math.floor((W - pad * 2) / N);
          const groundY = H * 0.72;
          const maxMH = H * 0.45;

          for (let i = 0; i < N; i++) {
            const cx = pad + i * mw + mw / 2;
            const mh = (HEIGHTS[i] / 110) * maxMH;
            const container = this.add.container(cx, groundY);

            // mountain body (triangle)
            const body = this.add.graphics();
            const hw = Math.max(mw * 0.38, 10);
            body.fillStyle(0x0a1828, 1);
            body.fillTriangle(-hw, 0, hw, 0, 0, -mh);
            body.lineStyle(1, 0x1a3050, 1);
            body.strokeTriangle(-hw, 0, hw, 0, 0, -mh);

            // height label
            const heightLabel = this.add.text(0, -mh - 12, '', {
              fontFamily: 'monospace', fontSize: '8px', color: '#0a2040',
            }).setOrigin(0.5).setName('hlabel');

            // signal ring (shown after probe)
            const ring = this.add.graphics().setName('ring').setVisible(false);

            // index label at base
            const idxLabel = this.add.text(0, 8, String(i), {
              fontFamily: 'monospace', fontSize: '7px', color: '#0a1828',
            }).setOrigin(0.5);

            container.add([body, ring, heightLabel, idxLabel]);
            container.setSize(mw - 2, mh + 20);
            container.setInteractive({ cursor: 'pointer' });
            container.setData('index', i);
            this.mountains.push(container);

            container.on('pointerover', () => {
              if (this.busy || this.probed.has(i)) return;
              const b = container.list[0] as Phaser.GameObjects.Graphics;
              b.clear();
              b.fillStyle(0x0e2038, 1);
              b.fillTriangle(-hw, 0, hw, 0, 0, -mh);
              b.lineStyle(1, 0x2a5080, 1);
              b.strokeTriangle(-hw, 0, hw, 0, 0, -mh);
            });
            container.on('pointerout', () => {
              if (this.busy || this.probed.has(i)) return;
              const b = container.list[0] as Phaser.GameObjects.Graphics;
              b.clear();
              b.fillStyle(0x0a1828, 1);
              b.fillTriangle(-hw, 0, hw, 0, 0, -mh);
              b.lineStyle(1, 0x1a3050, 1);
              b.strokeTriangle(-hw, 0, hw, 0, 0, -mh);
            });
          }

          // ground
          const gnd = this.add.graphics();
          gnd.fillStyle(0x050e18, 1);
          gnd.fillRect(0, groundY, W, H - groundY);
          gnd.lineStyle(1, 0x0a2030, 1);
          gnd.lineBetween(0, groundY, W, groundY);
        }

        buildHUD() {
          const bar = this.add.graphics();
          bar.fillStyle(0x020406, 1);
          bar.fillRect(0, 0, W, 44);
          bar.lineStyle(1, 0x0a2040, 1);
          bar.lineBetween(0, 44, W, 44);

          this.add.text(16, 12, '// DEAD SIGNAL', {
            fontFamily: 'monospace', fontSize: '10px', color: '#0a2040', letterSpacing: 2,
          });

          this.add.text(W / 2, 10, 'FIND THE PEAK SIGNAL', {
            fontFamily: 'monospace', fontSize: '10px', color: '#1a4060',
          }).setOrigin(0.5, 0);

          this.probeText = this.add.text(W - 16, 12, `PROBES: ${MAX_PROBES}`, {
            fontFamily: 'monospace', fontSize: '10px', color: '#22c55e',
          }).setOrigin(1, 0);

          this.statusText = this.add.text(W / 2, H - 36, 'CLICK A MOUNTAIN TO PROBE', {
            fontFamily: 'monospace', fontSize: '10px', color: '#0a2040',
          }).setOrigin(0.5);

          this.rangeText = this.add.text(W / 2, H - 20, `SEARCH: [${this.left}..${this.right}]`, {
            fontFamily: 'monospace', fontSize: '9px', color: '#061828',
          }).setOrigin(0.5);
        }

        onClick(pointer: Phaser.Input.Pointer) {
          if (this.busy || solvedRef.current) return;

          const pad = 20;
          const mw = Math.floor((W - pad * 2) / N);
          const groundY = H * 0.72;
          const maxMH = H * 0.45;

          for (let i = 0; i < N; i++) {
            const cx = pad + i * mw + mw / 2;
            const mh = (HEIGHTS[i] / 110) * maxMH;
            // clickable triangle hit-test (rough: use bounding rect)
            if (Math.abs(pointer.x - cx) < mw / 2 && pointer.y > groundY - mh - 15 && pointer.y < groundY + 10) {
              this.probe(i, pointer.x, pointer.y);
              return;
            }
          }
        }

        probe(i: number, px: number, py: number) {
          if (this.probed.has(i)) return; // already probed
          this.busy = true;
          onAttempt();
          this.probeText.setText(`PROBES: ${this.probesLeft - 1}`);
          playSound('beep');

          this.probesLeft--;
          this.probed.add(i);
          const peak = isPeak(HEIGHTS, i);

          // reveal height
          const container = this.mountains[i];
          const pad = 20;
          const mw = Math.floor((W - pad * 2) / N);
          const maxMH = H * 0.45;
          const mh = (HEIGHTS[i] / 110) * maxMH;
          const hw = Math.max(mw * 0.38, 10);

          // update body color
          const body = container.list[0] as Phaser.GameObjects.Graphics;
          body.clear();
          const bodyCol = peak ? 0x001a10 : 0x0a1828;
          body.fillStyle(bodyCol, 1);
          body.fillTriangle(-hw, 0, hw, 0, 0, -mh);
          body.lineStyle(peak ? 2 : 1, peak ? 0x22c55e : 0x3a5080, 1);
          body.strokeTriangle(-hw, 0, hw, 0, 0, -mh);

          // signal ring
          const ring = container.getByName('ring') as Phaser.GameObjects.Graphics;
          ring.setVisible(true);
          ring.lineStyle(1, peak ? 0x22c55e : 0x3a6090, 0.6);
          ring.strokeCircle(0, -mh, 12);

          // height label
          const hlabel = container.getByName('hlabel') as Phaser.GameObjects.Text;
          hlabel.setText(String(HEIGHTS[i])).setStyle({ color: peak ? '#22c55e' : '#4a8aaa', fontSize: '9px' });

          // signal direction arrows
          const leftStr = i > 0 ? (HEIGHTS[i] > HEIGHTS[i - 1] ? '↑' : '↓') : '⊣';
          const rightStr = i < N - 1 ? (HEIGHTS[i] > HEIGHTS[i + 1] ? '↑' : '↓') : '⊢';

          if (peak) {
            this.onPeakFound(i, px, py);
          } else {
            // update binary search range
            if (i < N - 1 && HEIGHTS[i + 1] > HEIGHTS[i]) {
              this.left = i + 1; // peak is to the right
            } else {
              this.right = i; // peak is to the left (or here, but we need to check neighbors)
            }

            const statusMsg = `[${i}]:${HEIGHTS[i]}  ${leftStr}L  ${rightStr}R  — go ${i < N - 1 && HEIGHTS[i + 1] > HEIGHTS[i] ? 'RIGHT' : 'LEFT'}`;
            this.statusText.setText(statusMsg).setStyle({ color: '#4a8aaa' });
            this.rangeText.setText(`SEARCH: [${this.left}..${this.right}]`);
            emitReaction(i < N - 1 && HEIGHTS[i + 1] > HEIGHTS[i] ? 'SLIDE_RIGHT' : 'SLIDE_LEFT',
              i < N - 1 && HEIGHTS[i + 1] > HEIGHTS[i] ? '→ STRONGER' : '← STRONGER', px, py);
            playSound('correct');

            if (this.probesLeft <= 0) {
              this.time.delayedCall(400, () => this.showRetry());
            } else {
              this.probeText.setText(`PROBES: ${this.probesLeft}`).setStyle({
                color: this.probesLeft <= 1 ? '#ef4444' : this.probesLeft <= 2 ? '#eab308' : '#22c55e',
              });
              this.busy = false;
            }
          }
        }

        onPeakFound(i: number, px: number, py: number) {
          solvedRef.current = true;
          playSound('solve');
          const container = this.mountains[i];
          this.statusText.setText(`PEAK SIGNAL AT [${i}] — STRENGTH ${HEIGHTS[i]}`).setStyle({ color: '#22c55e' });
          emitReaction('BURST', '📡 PEAK FOUND', px, py);

          this.tweens.add({
            targets: container,
            scaleX: 1.15, scaleY: 1.15,
            duration: 250,
            yoyo: true,
            repeat: 1,
            onComplete: () => this.time.delayedCall(600, () => onSolve()),
          });
        }

        showRetry() {
          const ov = this.add.graphics().setDepth(20);
          ov.fillStyle(0x000000, 0.75);
          ov.fillRect(0, 0, W, H);

          this.add.text(W / 2, H / 2 - 20, 'PROBES EXHAUSTED', {
            fontFamily: 'monospace', fontSize: '13px', color: '#4a8aaa',
          }).setOrigin(0.5).setDepth(21);

          const btn = this.add.text(W / 2, H / 2 + 20, '[ RETRY ]', {
            fontFamily: 'monospace', fontSize: '13px', color: '#3b82f6',
            backgroundColor: '#030608', padding: { x: 18, y: 8 },
          }).setOrigin(0.5).setDepth(21).setInteractive({ cursor: 'pointer' });

          btn.on('pointerdown', () => {
            solvedRef.current = false;
            this.scene.restart();
          });
        }
      }

      if (gameRef.current) { gameRef.current.destroy(); gameRef.current = null; }
      const g = new Phaser.Game({
        type: Phaser.AUTO,
        width: W,
        height: H,
        parent: containerRef.current!,
        backgroundColor: '#030608',
        scene: DeadSignalScene,
        render: { antialias: true },
      });
      gameRef.current = { destroy: () => g.destroy(true) };
    }

    init();
    return () => {
      cancelled = true;
      gameRef.current?.destroy();
      gameRef.current = null;
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', cursor: 'crosshair' }} />;
}
