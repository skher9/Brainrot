"use client";
// LC #704 — Classic Binary Search. Vault blocks, 90s timer, security drones at 30s/10s.
import { useEffect, useRef } from "react";
import type { GameProps } from "../types";
import { playSound } from "../SoundEngine";
import { emitReaction } from "../FloatingReactions";

const VALUES = [3, 7, 12, 18, 24, 31, 39, 45, 52, 61, 70, 78, 85, 91, 97, 104];
const N = VALUES.length; // 16

export default function VaultHeist({ onSolve, onAttempt }: GameProps) {
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

      const TARGET_IDX = Math.floor(Math.random() * N);
      const TARGET_VAL = VALUES[TARGET_IDX];

      class VaultScene extends Phaser.Scene {
        private blocks: Phaser.GameObjects.Container[] = [];
        private left = 0;
        private right = N - 1;
        private eliminated: Set<number> = new Set();
        private busy = false;
        private timeLeft = 90;
        private timerText!: Phaser.GameObjects.Text;
        private statusText!: Phaser.GameObjects.Text;
        private targetText!: Phaser.GameObjects.Text;
        private droneWarned30 = false;
        private droneWarned10 = false;
        private timerEvent?: Phaser.Time.TimerEvent;
        private scanLine!: Phaser.GameObjects.Graphics;
        private scanX = 0;
        private pointersText!: Phaser.GameObjects.Text;

        constructor() { super({ key: 'VaultScene' }); }

        create() {
          this.cameras.main.setBackgroundColor('#040810');
          this.drawGrid();
          this.buildBlocks();
          this.buildHUD();
          this.input.on('pointerdown', this.onClick, this);

          this.timerEvent = this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: this.tick,
            callbackScope: this,
          });

          // ambient scan line
          this.scanLine = this.add.graphics();
          this.tweens.add({
            targets: this,
            scanX: W,
            duration: 3000,
            repeat: -1,
            onUpdate: () => {
              this.scanLine.clear();
              this.scanLine.lineStyle(1, 0x00ff88, 0.08);
              this.scanLine.lineBetween(this.scanX, 0, this.scanX, H);
            },
          });
        }

        drawGrid() {
          const g = this.add.graphics();
          g.lineStyle(1, 0x0a1a2a, 1);
          for (let x = 0; x < W; x += 40) g.lineBetween(x, 0, x, H);
          for (let y = 0; y < H; y += 40) g.lineBetween(0, y, W, y);
        }

        buildBlocks() {
          const pad = 24;
          const cols = 8;
          const rows = 2;
          const bw = Math.floor((W - pad * 2) / cols);
          const bh = Math.min(Math.floor((H * 0.55) / rows), 70);
          const startX = pad + bw / 2;
          const startY = H * 0.3;

          for (let i = 0; i < N; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * bw;
            const y = startY + row * (bh + 10);

            const container = this.add.container(x, y);
            const bg = this.add.graphics();
            bg.fillStyle(0x0d1a2a, 1);
            bg.fillRoundedRect(-bw / 2 + 2, -bh / 2, bw - 4, bh, 4);
            bg.lineStyle(1, 0x1a3a5a, 1);
            bg.strokeRoundedRect(-bw / 2 + 2, -bh / 2, bw - 4, bh, 4);

            const val = this.add.text(0, -4, VALUES[i].toString(), {
              fontFamily: 'monospace', fontSize: '13px', color: '#3a6a8a',
            }).setOrigin(0.5);

            const idx = this.add.text(0, bh / 2 - 10, `[${i}]`, {
              fontFamily: 'monospace', fontSize: '8px', color: '#1a2a3a',
            }).setOrigin(0.5);

            container.add([bg, val, idx]);
            container.setSize(bw - 4, bh);
            container.setInteractive({ cursor: 'pointer' });
            container.setData('index', i);
            this.blocks.push(container);

            container.on('pointerover', () => {
              if (this.eliminated.has(i) || this.busy) return;
              const b = container.list[0] as Phaser.GameObjects.Graphics;
              b.clear();
              b.fillStyle(0x0f2540, 1);
              b.fillRoundedRect(-bw / 2 + 2, -bh / 2, bw - 4, bh, 4);
              b.lineStyle(1, 0x2a5a8a, 1);
              b.strokeRoundedRect(-bw / 2 + 2, -bh / 2, bw - 4, bh, 4);
            });
            container.on('pointerout', () => {
              if (this.eliminated.has(i) || this.busy) return;
              const b = container.list[0] as Phaser.GameObjects.Graphics;
              b.clear();
              b.fillStyle(0x0d1a2a, 1);
              b.fillRoundedRect(-bw / 2 + 2, -bh / 2, bw - 4, bh, 4);
              b.lineStyle(1, 0x1a3a5a, 1);
              b.strokeRoundedRect(-bw / 2 + 2, -bh / 2, bw - 4, bh, 4);
            });
          }
        }

        buildHUD() {
          // top strip
          const bar = this.add.graphics();
          bar.fillStyle(0x020508, 1);
          bar.fillRect(0, 0, W, 48);
          bar.lineStyle(1, 0x0a2040, 1);
          bar.lineBetween(0, 48, W, 48);

          this.add.text(16, 14, '// VAULT HEIST', {
            fontFamily: 'monospace', fontSize: '10px', color: '#1a4060', letterSpacing: 2,
          });

          this.targetText = this.add.text(W / 2, 14, `TARGET: ${TARGET_VAL}`, {
            fontFamily: 'monospace', fontSize: '12px', color: '#3b82f6',
          }).setOrigin(0.5, 0);

          this.timerText = this.add.text(W - 16, 14, '90s', {
            fontFamily: 'monospace', fontSize: '11px', color: '#22c55e',
          }).setOrigin(1, 0);

          this.statusText = this.add.text(W / 2, H - 24, 'CLICK ANY BLOCK TO TEST', {
            fontFamily: 'monospace', fontSize: '10px', color: '#1a3a5a',
          }).setOrigin(0.5);

          this.pointersText = this.add.text(16, H - 24, `L[0] ···· R[${N - 1}]`, {
            fontFamily: 'monospace', fontSize: '9px', color: '#0a2030',
          });
        }

        tick() {
          if (solvedRef.current) return;
          this.timeLeft--;
          const col = this.timeLeft <= 10 ? '#ef4444' : this.timeLeft <= 30 ? '#eab308' : '#22c55e';
          this.timerText.setText(`${this.timeLeft}s`).setStyle({ color: col });

          if (this.timeLeft === 30 && !this.droneWarned30) {
            this.droneWarned30 = true;
            this.spawnDrone();
            playSound('alarm');
            emitReaction('DANGER', '⚠ DRONE PATROL', W / 2, H / 2);
          }
          if (this.timeLeft === 10 && !this.droneWarned10) {
            this.droneWarned10 = true;
            this.spawnDrone();
            playSound('alarm');
            emitReaction('DANGER', '⚠ CRITICAL ALERT', W / 2, H / 2);
          }
          if (this.timeLeft <= 0) {
            this.timerEvent?.remove();
            this.statusText.setText('TIME EXPIRED — RETRY').setStyle({ color: '#ef4444' });
            this.showRetry();
          }
        }

        spawnDrone() {
          const drone = this.add.graphics();
          drone.fillStyle(0xcc0000, 0.9);
          drone.fillTriangle(0, -8, -10, 8, 10, 8);
          drone.lineStyle(1, 0xff2222, 1);
          drone.strokeTriangle(0, -8, -10, 8, 10, 8);
          drone.setPosition(-30, 60);
          this.tweens.add({
            targets: drone,
            x: W + 30,
            duration: 2500,
            ease: 'Linear',
            onComplete: () => drone.destroy(),
          });
          // laser
          const laser = this.add.graphics();
          laser.lineStyle(1, 0xff0000, 0.3);
          laser.lineBetween(0, 60, W, 60);
          this.time.delayedCall(2500, () => laser.destroy());
        }

        onClick(pointer: Phaser.Input.Pointer) {
          if (this.busy || solvedRef.current) return;

          // find which block was clicked
          const pad = 24;
          const cols = 8;
          const bw = Math.floor((W - pad * 2) / cols);
          const bh = Math.min(Math.floor((H * 0.55) / 2), 70);
          const startX = pad + bw / 2;
          const startY = H * 0.3;

          let clicked = -1;
          for (let i = 0; i < N; i++) {
            if (this.eliminated.has(i)) continue;
            const col = i % cols;
            const row = Math.floor(i / cols);
            const bx = startX + col * bw;
            const by = startY + row * (bh + 10);
            if (Math.abs(pointer.x - bx) < bw / 2 - 2 && Math.abs(pointer.y - by) < bh / 2) {
              clicked = i;
              break;
            }
          }
          if (clicked < 0) return;

          this.busy = true;
          onAttempt();
          playSound('click');

          const block = this.blocks[clicked];
          this.flashBlock(block, () => {
            if (VALUES[clicked] === TARGET_VAL) {
              this.onFound(clicked, block);
            } else {
              const goRight = TARGET_VAL > VALUES[clicked];
              const toElim: number[] = [];
              if (goRight) {
                for (let k = this.left; k <= clicked; k++) toElim.push(k);
                this.left = clicked + 1;
              } else {
                for (let k = clicked; k <= this.right; k++) toElim.push(k);
                this.right = clicked - 1;
              }
              for (const k of toElim) this.eliminated.add(k);

              const hint = goRight ? `${VALUES[clicked]} < ${TARGET_VAL} — SEARCH RIGHT` : `${VALUES[clicked]} > ${TARGET_VAL} — SEARCH LEFT`;
              this.statusText.setText(hint).setStyle({ color: '#4a7a9a' });

              this.pointersText.setText(`L[${this.left}] ···· R[${this.right}]`);

              emitReaction(goRight ? 'SLIDE_RIGHT' : 'SLIDE_LEFT', goRight ? '→ TOO LOW' : '← TOO HIGH', pointer.x, pointer.y);
              playSound('wrong');

              this.dimBlocks(toElim, () => { this.busy = false; });
            }
          });
        }

        flashBlock(block: Phaser.GameObjects.Container, done: () => void) {
          this.tweens.add({
            targets: block,
            scaleX: 1.05, scaleY: 1.05,
            duration: 100,
            yoyo: true,
            onComplete: () => done(),
          });
        }

        onFound(i: number, block: Phaser.GameObjects.Container) {
          solvedRef.current = true;
          this.timerEvent?.remove();
          playSound('solve');

          const bw = Math.floor((W - 48) / 8);
          const bh = Math.min(Math.floor((H * 0.55) / 2), 70);
          const bg = block.list[0] as Phaser.GameObjects.Graphics;
          bg.clear();
          bg.fillStyle(0x002200, 1);
          bg.fillRoundedRect(-bw / 2 + 2, -bh / 2, bw - 4, bh, 4);
          bg.lineStyle(2, 0x22c55e, 1);
          bg.strokeRoundedRect(-bw / 2 + 2, -bh / 2, bw - 4, bh, 4);
          (block.list[1] as Phaser.GameObjects.Text).setStyle({ color: '#22c55e', fontSize: '15px' });

          this.statusText.setText(`VAULT ${TARGET_VAL} FOUND — BLOCK [${i}]`).setStyle({ color: '#22c55e' });
          emitReaction('BURST', '🎯 CRACKED', block.x, block.y);

          this.tweens.add({
            targets: block,
            scaleX: 1.15, scaleY: 1.15,
            duration: 200,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
              this.time.delayedCall(500, () => onSolve());
            },
          });
        }

        dimBlocks(indices: number[], done: () => void) {
          let pending = indices.length;
          if (pending === 0) { done(); return; }
          for (const i of indices) {
            const block = this.blocks[i];
            this.tweens.add({
              targets: block,
              alpha: 0.08,
              duration: 200,
              onComplete: () => { pending--; if (pending === 0) done(); },
            });
          }
        }

        showRetry() {
          const overlay = this.add.graphics();
          overlay.fillStyle(0x000000, 0.7);
          overlay.fillRect(0, 0, W, H);

          const btn = this.add.text(W / 2, H / 2, '[ RETRY ]', {
            fontFamily: 'monospace', fontSize: '14px', color: '#3b82f6',
            backgroundColor: '#050810', padding: { x: 20, y: 10 },
          }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });

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
        backgroundColor: '#040810',
        scene: VaultScene,
        render: { antialias: true },
      });
      gameRef.current = { destroy: () => { g.destroy(true); } };
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
