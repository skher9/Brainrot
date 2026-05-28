"use client";
// LC #278 — First Bad Version. Binary search for first infected chamber.
import { useEffect, useRef } from "react";
import type { GameProps } from "../types";
import { playSound } from "../SoundEngine";
import { emitReaction } from "../FloatingReactions";

const N = 20;

function randFirstInfected() {
  return 3 + Math.floor(Math.random() * 14); // 3..16
}

export default function Outbreak({ onSolve, onAttempt }: GameProps) {
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
      const FIRST_INFECTED = randFirstInfected();

      class OutbreakScene extends Phaser.Scene {
        private chambers: Phaser.GameObjects.Container[] = [];
        private revealed: Map<number, boolean> = new Map(); // index → isInfected
        private left = 0;
        private right = N - 1;
        private busy = false;
        private statusText!: Phaser.GameObjects.Text;
        private rangeText!: Phaser.GameObjects.Text;
        private oozeGraphic!: Phaser.GameObjects.Graphics;
        private oozeX = W; // ooze starts off-screen right
        private oozeTimer?: Phaser.Time.TimerEvent;
        private checkCount = 0;

        constructor() { super({ key: 'OutbreakScene' }); }

        create() {
          this.cameras.main.setBackgroundColor('#050409');
          this.drawBackground();
          this.buildChambers();
          this.buildHUD();
          this.startOoze();
          this.input.on('pointerdown', this.onClick, this);
        }

        drawBackground() {
          // dark lab grid
          const g = this.add.graphics();
          g.lineStyle(1, 0x0a0514, 1);
          for (let x = 0; x < W; x += 50) g.lineBetween(x, 0, x, H);
          for (let y = 0; y < H; y += 50) g.lineBetween(0, y, W, y);
        }

        buildChambers() {
          const pad = 20;
          const bw = Math.floor((W - pad * 2) / N);
          const bh = Math.min(bw * 1.8, 80);
          const startX = pad + bw / 2;
          const baseY = H * 0.48;

          for (let i = 0; i < N; i++) {
            const x = startX + i * bw;
            const container = this.add.container(x, baseY);

            const bg = this.add.graphics();
            bg.fillStyle(0x0c0c18, 1);
            bg.fillRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);
            bg.lineStyle(1, 0x1a1a40, 1);
            bg.strokeRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);

            const label = this.add.text(0, 0, String(i), {
              fontFamily: 'monospace', fontSize: '9px', color: '#2a2a4a',
            }).setOrigin(0.5);

            // question mark (hidden state)
            const qmark = this.add.text(0, -bh / 4, '?', {
              fontFamily: 'monospace', fontSize: '14px', color: '#1a1a3a',
            }).setOrigin(0.5).setName('qmark');

            container.add([bg, label, qmark]);
            container.setSize(bw - 2, bh);
            container.setInteractive({ cursor: 'pointer' });
            container.setData('index', i);
            this.chambers.push(container);

            container.on('pointerover', () => {
              if (this.revealed.has(i) || this.busy) return;
              const b = container.list[0] as Phaser.GameObjects.Graphics;
              b.clear();
              b.fillStyle(0x14142a, 1);
              b.fillRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);
              b.lineStyle(1, 0x3a3a6a, 1);
              b.strokeRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);
            });
            container.on('pointerout', () => {
              if (this.revealed.has(i) || this.busy) return;
              const b = container.list[0] as Phaser.GameObjects.Graphics;
              b.clear();
              b.fillStyle(0x0c0c18, 1);
              b.fillRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);
              b.lineStyle(1, 0x1a1a40, 1);
              b.strokeRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);
            });
          }
        }

        buildHUD() {
          const bar = this.add.graphics();
          bar.fillStyle(0x020204, 1);
          bar.fillRect(0, 0, W, 44);
          bar.lineStyle(1, 0x140a28, 1);
          bar.lineBetween(0, 44, W, 44);

          this.add.text(16, 12, '// OUTBREAK', {
            fontFamily: 'monospace', fontSize: '10px', color: '#2a1040', letterSpacing: 2,
          });

          this.add.text(W / 2, 12, 'FIND FIRST INFECTED CHAMBER', {
            fontFamily: 'monospace', fontSize: '10px', color: '#3a1060',
          }).setOrigin(0.5, 0);

          this.add.text(W - 16, 12, `N = ${N}`, {
            fontFamily: 'monospace', fontSize: '9px', color: '#1a0830',
          }).setOrigin(1, 0);

          this.statusText = this.add.text(W / 2, H - 36, 'TAP CHAMBER TO TEST IT', {
            fontFamily: 'monospace', fontSize: '10px', color: '#2a1050',
          }).setOrigin(0.5);

          this.rangeText = this.add.text(W / 2, H - 20, `[0, ${N - 1}]`, {
            fontFamily: 'monospace', fontSize: '9px', color: '#1a0830',
          }).setOrigin(0.5);

          // ooze layer
          this.oozeGraphic = this.add.graphics().setDepth(5);
        }

        startOoze() {
          // ooze starts at right, advances towards left over 90 seconds
          this.oozeX = W + 10;
          this.oozeTimer = this.time.addEvent({
            delay: 900,
            loop: true,
            callback: () => {
              if (solvedRef.current) return;
              this.oozeX -= (W / 100); // ~1% per tick = 90s to reach 0
              this.drawOoze();
              if (this.oozeX <= 0) {
                this.oozeTimer?.remove();
                this.statusText.setText('OOZE REACHED YOU — RETRY').setStyle({ color: '#cc0066' });
                playSound('alarm');
                this.showRetry();
              }
            },
          });
        }

        drawOoze() {
          this.oozeGraphic.clear();
          // gradient-ish ooze from right
          for (let i = 0; i < 8; i++) {
            const alpha = 0.06 + i * 0.04;
            this.oozeGraphic.fillStyle(0x660033, alpha);
            this.oozeGraphic.fillRect(this.oozeX + i * 6, 44, W - this.oozeX - i * 6, H - 44);
          }
          // drip particles
          for (let d = 0; d < 5; d++) {
            const dx = this.oozeX + d * 4;
            const dy = 44 + (d * 30) % (H - 90);
            this.oozeGraphic.fillStyle(0x990044, 0.5);
            this.oozeGraphic.fillCircle(dx, dy, 3);
          }
        }

        onClick(pointer: Phaser.Input.Pointer) {
          if (this.busy || solvedRef.current) return;

          const pad = 20;
          const bw = Math.floor((W - pad * 2) / N);
          const bh = Math.min(bw * 1.8, 80);
          const startX = pad + bw / 2;
          const baseY = H * 0.48;

          let clicked = -1;
          for (let i = 0; i < N; i++) {
            if (this.revealed.has(i)) continue;
            const cx = startX + i * bw;
            if (Math.abs(pointer.x - cx) < bw / 2 && Math.abs(pointer.y - baseY) < bh / 2 + 5) {
              clicked = i;
              break;
            }
          }
          if (clicked < 0) return;

          this.busy = true;
          onAttempt();
          this.checkCount++;
          playSound('click');

          const isInfected = clicked >= FIRST_INFECTED;
          this.revealed.set(clicked, isInfected);
          this.revealChamber(clicked, isInfected, () => {
            if (isInfected) {
              this.right = clicked; // first infected could be here or earlier
            } else {
              this.left = clicked + 1; // clean, first infected is to the right
            }

            this.rangeText.setText(`[${this.left}, ${this.right}]`);

            if (this.left === this.right) {
              // found!
              this.onFound(this.left);
            } else {
              const hint = isInfected ? `INFECTED — narrow left [${this.left}..${this.right}]` : `CLEAN — narrow right [${this.left}..${this.right}]`;
              this.statusText.setText(hint).setStyle({ color: isInfected ? '#660033' : '#1a5030' });
              emitReaction(isInfected ? 'DANGER' : 'SLIDE_RIGHT', isInfected ? '⚠ INFECTED' : '✓ CLEAN', pointer.x, pointer.y);
              playSound(isInfected ? 'danger' : 'correct');
              this.busy = false;
            }
          });
        }

        revealChamber(i: number, infected: boolean, done: () => void) {
          const pad = 20;
          const bw = Math.floor((W - pad * 2) / N);
          const bh = Math.min(bw * 1.8, 80);
          const container = this.chambers[i];

          const bg = container.list[0] as Phaser.GameObjects.Graphics;
          bg.clear();

          if (infected) {
            bg.fillStyle(0x330011, 1);
            bg.fillRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);
            bg.lineStyle(1, 0xcc0033, 1);
            bg.strokeRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);
            (container.list[2] as Phaser.GameObjects.Text).setText('☣').setStyle({ color: '#cc0033', fontSize: '14px' });
          } else {
            bg.fillStyle(0x001a0a, 1);
            bg.fillRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);
            bg.lineStyle(1, 0x22c55e, 0.6);
            bg.strokeRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);
            (container.list[2] as Phaser.GameObjects.Text).setText('✓').setStyle({ color: '#22c55e', fontSize: '12px' });
          }

          this.tweens.add({
            targets: container,
            scaleX: 1.1, scaleY: 1.1,
            duration: 100,
            yoyo: true,
            onComplete: () => {
              this.time.delayedCall(200, done);
            },
          });
        }

        onFound(idx: number) {
          solvedRef.current = true;
          this.oozeTimer?.remove();
          playSound('solve');

          // highlight the first infected chamber
          const pad = 20;
          const bw = Math.floor((W - pad * 2) / N);
          const bh = Math.min(bw * 1.8, 80);
          const container = this.chambers[idx];

          const bg = container.list[0] as Phaser.GameObjects.Graphics;
          bg.clear();
          bg.fillStyle(0x440011, 1);
          bg.fillRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);
          bg.lineStyle(2, 0xff0044, 1);
          bg.strokeRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);
          (container.list[2] as Phaser.GameObjects.Text).setText('☣').setStyle({ color: '#ff0044', fontSize: '16px' });

          this.statusText.setText(`PATIENT ZERO: CHAMBER [${idx}] — ${this.checkCount} CHECKS`).setStyle({ color: '#ff4488' });
          emitReaction('BURST', '☣ ISOLATED', container.x, container.y);

          this.tweens.add({
            targets: container,
            scaleX: 1.2, scaleY: 1.2,
            duration: 300,
            yoyo: true,
            onComplete: () => this.time.delayedCall(600, () => onSolve()),
          });
        }

        showRetry() {
          const ov = this.add.graphics().setDepth(20);
          ov.fillStyle(0x000000, 0.75);
          ov.fillRect(0, 0, W, H);

          this.add.text(W / 2, H / 2 - 20, 'CONTAINMENT FAILED', {
            fontFamily: 'monospace', fontSize: '13px', color: '#cc0033',
          }).setOrigin(0.5).setDepth(21);

          const btn = this.add.text(W / 2, H / 2 + 20, '[ RETRY ]', {
            fontFamily: 'monospace', fontSize: '13px', color: '#3b82f6',
            backgroundColor: '#050409', padding: { x: 18, y: 8 },
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
        backgroundColor: '#050409',
        scene: OutbreakScene,
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
