import { EventBus } from './EventBus';

export interface GameHandle {
  destroy: () => void;
}

let handle: GameHandle | null = null;

export async function initGame(container: HTMLElement): Promise<GameHandle> {
  if (handle) { handle.destroy(); handle = null; }

  const Phaser = (await import('phaser')).default;
  const { WorldMapScene }  = await import('../scenes/WorldMapScene');
  const { CutsceneScene }  = await import('../scenes/CutsceneScene');
  const { Mission1Scene }  = await import('../scenes/Mission1Scene');
  const { Mission2Scene }  = await import('../scenes/Mission2Scene');
  const { Mission3Scene }  = await import('../scenes/Mission3Scene');
  const { Mission4Scene }  = await import('../scenes/Mission4Scene');

  const W = container.clientWidth  || window.innerWidth;
  const H = container.clientHeight || window.innerHeight;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: W,
    height: H,
    backgroundColor: '#050810',
    scene: [WorldMapScene, CutsceneScene, Mission1Scene, Mission2Scene, Mission3Scene, Mission4Scene],
    physics: {
      default: 'matter',
      matter: { gravity: { x: 0, y: 0.4 }, debug: false },
    },
    render: { antialias: true, pixelArt: false },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    dom: { createContainer: false },
  });

  // Wire game:startmission → start Cutscene → mission
  const unsubStart = EventBus.on('game:startmission', ({ mission }) => {
    const scene = game.scene;
    scene.start('CutsceneScene', { index: 0, nextScene: `Mission${mission}Scene` });
  });

  // Wire scene:worldmap (continue/retry) → return to WorldMapScene
  const unsubWorld = EventBus.on('scene:worldmap', () => {
    game.scene.start('WorldMapScene');
  });

  handle = {
    destroy: () => {
      unsubStart();
      unsubWorld();
      game.destroy(true);
      handle = null;
    },
  };
  return handle;
}
