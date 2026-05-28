"use client";
// LC #35 — Search Insert Position. Find the slot for the challenger fighter.
import { useEffect, useRef } from "react";
import type { GameProps } from "../types";
import { playSound } from "../SoundEngine";
import { emitReaction } from "../FloatingReactions";

const N_FIGHTERS = 12;

function makeFighters() {
  const powers: number[] = [];
  let cur = 2 + Math.floor(Math.random() * 8);
  for (let i = 0; i < N_FIGHTERS; i++) {
    cur += 3 + Math.floor(Math.random() * 12);
    powers.push(cur);
  }
  return powers; // sorted ascending
}

export default function Tournament({ onSolve, onAttempt }: GameProps) {
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

      const FIGHTERS = makeFighters();
      // challenger power: somewhere in the middle, not equal to any existing fighter
      let CHALLENGER: number;
      do {
        CHALLENGER = FIGHTERS[0] + Math.floor(Math.random() * (FIGHTERS[N_FIGHTERS - 1] - FIGHTERS[0]));
      } while (FIGHTERS.includes(CHALLENGER));
      // correct answer: first index where FIGHTERS[i] >= CHALLENGER, or N_FIGHTERS if all less
      const CORRECT_SLOT = FIGHTERS.findIndex(f => f >= CHALLENGER);
      const ANSWER = CORRECT_SLOT === -1 ? N_FIGHTERS : CORRECT_SLOT;

      class TournamentScene extends Phaser.Scene {
        private slots: Phaser.GameObjects.Container[] = []; // N_FIGHTERS + 1 gap zones
        private comparisons: Map<number, 'lt' | 'gte'> = new Map(); // fighter idx → comparison
        private left = 0;
        private right = N_FIGHTERS; // insert position range: [0, N_FIGHTERS]
        private busy = false;
        private noiseLevel = 0; // 0-3 wrong insertions
        private noiseMeter!: Phaser.GameObjects.Graphics;
        private statusText!: Phaser.GameObjects.Text;
        private rangeText!: Phaser.GameObjects.Text;
        private confirming = false; // player in slot-selection mode

        constructor() { super({ key: 'TournamentScene' }); }

        create() {
          this.cameras.main.setBackgroundColor('#040206');
          this.drawArena();
          this.buildFighters();
          this.buildHUD();
          this.input.on('pointerdown', this.onClick, this);
        }

        drawArena() {
          // floor
          const g = this.add.graphics();
          g.fillStyle(0x080210, 1);
          g.fillRect(0, H * 0.7, W, H);
          g.lineStyle(1, 0x1a0840, 1);
          g.lineBetween(0, H * 0.7, W, H * 0.7);
          // crowd silhouettes
          for (let cx = 10; cx < W; cx += 22) {
            const cy = H * 0.7 - 2;
            const ch = 14 + Math.sin(cx) * 6;
            g.fillStyle(0x0c0420, 1);
            g.fillRect(cx, cy - ch, 12, ch);
          }
        }

        buildFighters() {
          const pad = 16;
          const totalW = W - pad * 2;
          const slotW = totalW / N_FIGHTERS;
          const startX = pad;
          const baseY = H * 0.58;
          const fw = Math.max(slotW - 8, 20);
          const fh = 50;

          for (let i = 0; i < N_FIGHTERS; i++) {
            const cx = startX + i * slotW + slotW / 2;
            const container = this.add.container(cx, baseY);

            const body = this.add.graphics();
            body.fillStyle(0x180830, 1);
            body.fillRoundedRect(-fw / 2, -fh / 2, fw, fh, 4);
            body.lineStyle(1, 0x3a1060, 1);
            body.strokeRoundedRect(-fw / 2, -fh / 2, fw, fh, 4);

            // fighter icon
            const icon = this.add.text(0, -6, '◈', {
              fontFamily: 'monospace', fontSize: '14px', color: '#6a30a0',
            }).setOrigin(0.5);

            const power = this.add.text(0, 14, String(FIGHTERS[i]), {
              fontFamily: 'monospace', fontSize: '9px', color: '#3a1060',
            }).setOrigin(0.5);

            container.add([body, icon, power]);
            container.setData('fighterIdx', i);
            this.slots.push(container);
          }
        }

        buildHUD() {
          const bar = this.add.graphics();
          bar.fillStyle(0x020104, 1);
          bar.fillRect(0, 0, W, 44);
          bar.lineStyle(1, 0x1a0840, 1);
          bar.lineBetween(0, 44, W, 44);

          this.add.text(16, 12, '// THE TOURNAMENT', {
            fontFamily: 'monospace', fontSize: '10px', color: '#1a0840', letterSpacing: 2,
          });

          this.add.text(W / 2, 10, `CHALLENGER  ◈ ${CHALLENGER}  POWER`, {
            fontFamily: 'monospace', fontSize: '11px', color: '#a855f7',
          }).setOrigin(0.5, 0);

          // noise meter
          const noiseLabel = this.add.text(W - 16, 12, 'NOISE:', {
            fontFamily: 'monospace', fontSize: '9px', color: '#1a0840',
          }).setOrigin(1, 0);

          this.noiseMeter = this.add.graphics();
          this.drawNoise();

          this.statusText = this.add.text(W / 2, H - 36, 'CLICK A FIGHTER TO COMPARE POWER', {
            fontFamily: 'monospace', fontSize: '10px', color: '#2a1050',
          }).setOrigin(0.5);

          this.rangeText = this.add.text(W / 2, H - 20, `INSERT RANGE: [${this.left}, ${this.right}]`, {
            fontFamily: 'monospace', fontSize: '9px', color: '#1a0840',
          }).setOrigin(0.5);
        }

        drawNoise() {
          this.noiseMeter.clear();
          for (let n = 0; n < 3; n++) {
            const col = n < this.noiseLevel ? 0xcc2266 : 0x1a0840;
            this.noiseMeter.fillStyle(col, 1);
            this.noiseMeter.fillRect(W - 60 + n * 14, 16, 10, 10);
          }
        }

        onClick(pointer: Phaser.Input.Pointer) {
          if (this.busy || solvedRef.current) return;

          // check if player clicked on a fighter (compare mode)
          const pad = 16;
          const totalW = W - pad * 2;
          const slotW = totalW / N_FIGHTERS;
          const baseY = H * 0.58;
          const fh = 50;

          for (let i = 0; i < N_FIGHTERS; i++) {
            const cx = pad + i * slotW + slotW / 2;
            if (Math.abs(pointer.x - cx) < slotW / 2 && Math.abs(pointer.y - baseY) < fh / 2 + 5) {
              this.compareWith(i, pointer.x, pointer.y);
              return;
            }
          }

          // check if player clicked a gap zone (insertion slots between fighters)
          // gaps at: before [0], between [i] and [i+1], after [N_FIGHTERS-1]
          // total N_FIGHTERS+1 gap slots
          for (let g = 0; g <= N_FIGHTERS; g++) {
            const gx = g === 0
              ? pad
              : g === N_FIGHTERS
                ? W - pad
                : pad + g * slotW;
            if (Math.abs(pointer.x - gx) < slotW * 0.35 && pointer.y > H * 0.5 && pointer.y < H * 0.7) {
              this.tryInsert(g, pointer.x, pointer.y);
              return;
            }
          }
        }

        compareWith(i: number, px: number, py: number) {
          this.busy = true;
          onAttempt();
          playSound('click');

          const isGte = FIGHTERS[i] >= CHALLENGER;
          this.comparisons.set(i, isGte ? 'gte' : 'lt');

          if (isGte) {
            this.right = i; // insert before or at i
          } else {
            this.left = i + 1; // insert after i
          }

          this.rangeText.setText(`INSERT RANGE: [${this.left}, ${this.right}]`);
          this.updateFighterColor(i, isGte);

          const hint = isGte
            ? `${FIGHTERS[i]} ≥ ${CHALLENGER} — CHALLENGER GOES LEFT`
            : `${FIGHTERS[i]} < ${CHALLENGER} — CHALLENGER GOES RIGHT`;
          this.statusText.setText(hint).setStyle({ color: isGte ? '#6a30a0' : '#ff9900' });
          emitReaction(isGte ? 'SLIDE_LEFT' : 'SLIDE_RIGHT', isGte ? '← BEFORE' : 'AFTER →', px, py);
          playSound(isGte ? 'beep' : 'beep');

          if (this.left === this.right) {
            // solution determined!
            this.highlightSlot(this.left);
            this.statusText.setText(`INSERT AT SLOT ${this.left} — CLICK THE GAP!`).setStyle({ color: '#a855f7' });
          }

          this.busy = false;
        }

        updateFighterColor(i: number, isGte: boolean) {
          const pad = 16;
          const totalW = W - pad * 2;
          const slotW = totalW / N_FIGHTERS;
          const fw = Math.max(slotW - 8, 20);
          const fh = 50;
          const container = this.slots[i];
          const body = container.list[0] as Phaser.GameObjects.Graphics;
          body.clear();
          const col = isGte ? 0x1a0830 : 0x2a1400;
          body.fillStyle(col, 1);
          body.fillRoundedRect(-fw / 2, -fh / 2, fw, fh, 4);
          body.lineStyle(1, isGte ? 0x9030c0 : 0xc06000, 1);
          body.strokeRoundedRect(-fw / 2, -fh / 2, fw, fh, 4);
          (container.list[2] as Phaser.GameObjects.Text).setStyle({ color: isGte ? '#9030c0' : '#c06000' });
        }

        highlightSlot(slotIdx: number) {
          const pad = 16;
          const totalW = W - pad * 2;
          const slotW = totalW / N_FIGHTERS;
          const gx = slotIdx === 0 ? pad : slotIdx === N_FIGHTERS ? W - pad : pad + slotIdx * slotW;
          const g = this.add.graphics().setDepth(4);
          g.lineStyle(2, 0xa855f7, 0.8);
          g.lineBetween(gx, H * 0.42, gx, H * 0.7);

          // pulsing arrow
          const arrow = this.add.text(gx, H * 0.44, '▼', {
            fontFamily: 'monospace', fontSize: '14px', color: '#a855f7',
          }).setOrigin(0.5, 1).setDepth(4);

          this.tweens.add({
            targets: arrow,
            alpha: 0.3,
            duration: 400,
            yoyo: true,
            repeat: -1,
          });
        }

        tryInsert(slot: number, px: number, py: number) {
          if (!solvedRef.current) onAttempt();

          if (slot === ANSWER) {
            solvedRef.current = true;
            playSound('solve');
            this.statusText.setText(`CHALLENGER INSERTED AT [${slot}] — TOURNAMENT BEGINS`).setStyle({ color: '#a855f7' });
            emitReaction('BURST', '⚔ PERFECT SLOT', px, py);
            this.time.delayedCall(700, () => onSolve());
          } else {
            this.noiseLevel = Math.min(3, this.noiseLevel + 1);
            this.drawNoise();
            playSound('wrong');
            emitReaction('DANGER', '✗ WRONG SLOT', px, py);
            this.statusText.setText(`WRONG SLOT — CROWD RIOTS  [${this.left}..${this.right}]`).setStyle({ color: '#cc2244' });
            if (this.noiseLevel >= 3) {
              playSound('alarm');
              this.time.delayedCall(600, () => this.showRetry());
            }
          }
        }

        showRetry() {
          const ov = this.add.graphics().setDepth(20);
          ov.fillStyle(0x000000, 0.75);
          ov.fillRect(0, 0, W, H);

          this.add.text(W / 2, H / 2 - 20, 'CROWD RIOT — TOURNAMENT CANCELLED', {
            fontFamily: 'monospace', fontSize: '11px', color: '#cc2244',
          }).setOrigin(0.5).setDepth(21);

          const btn = this.add.text(W / 2, H / 2 + 20, '[ RETRY ]', {
            fontFamily: 'monospace', fontSize: '13px', color: '#a855f7',
            backgroundColor: '#040206', padding: { x: 18, y: 8 },
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
        backgroundColor: '#040206',
        scene: TournamentScene,
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
