import Phaser from 'phaser';

import type { GamePauseReason, RendererName } from '@contracts/game-events';
import { BootScene } from '@game/scenes/boot-scene';
import { HomeScene } from '@game/scenes/home-scene';
import { PreloadScene } from '@game/scenes/preload-scene';
import { TitleScene } from '@game/scenes/title-scene';
import { StateController } from '@game/state/state-controller';
import { loadMapFromManifest } from '@map/map-manifest';

type RendererRequest = 'auto' | 'webgl' | 'canvas';

const readRendererRequest = (): RendererRequest => {
  if (!import.meta.env.DEV) return 'auto';
  const value = new URLSearchParams(window.location.search).get('renderer');
  return value === 'webgl' || value === 'canvas' ? value : 'auto';
};

const shouldInjectFailure = (): boolean => {
  if (!import.meta.env.DEV) return false;
  return new URLSearchParams(window.location.search).get('failRenderer') === '1';
};

const shouldDebugCollisions = (): boolean => {
  if (!import.meta.env.DEV) return false;
  return new URLSearchParams(window.location.search).get('debugCollision') === '1';
};

const phaserRenderer = (request: RendererRequest): number => {
  if (request === 'webgl') return Phaser.WEBGL;
  if (request === 'canvas') return Phaser.CANVAS;
  return Phaser.AUTO;
};

export const createGame = (
  parent: HTMLDivElement,
  callbacks: {
    onFirstFrame: (renderer: RendererName) => void;
    onPauseChange: (paused: boolean, reason: GamePauseReason) => void;
  },
): Phaser.Game => {
  if (shouldInjectFailure()) {
    throw new Error('Injected renderer construction failure.');
  }

  const map = loadMapFromManifest('graybox-home');
  const stateController = new StateController();
  const game = new Phaser.Game({
    type: phaserRenderer(readRendererRequest()),
    parent,
    width: 640,
    height: 360,
    backgroundColor: '#201329',
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    antialiasGL: false,
    transparent: false,
    audio: {
      noAudio: true,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: shouldDebugCollisions(),
      },
    },
    render: {
      antialias: false,
      antialiasGL: false,
      pixelArt: true,
      roundPixels: true,
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 640,
      height: 360,
    },
    scene: [
      new BootScene(stateController),
      new PreloadScene(stateController),
      new TitleScene(stateController),
      new HomeScene(stateController, map, callbacks, shouldDebugCollisions()),
    ],
    callbacks: {
      postBoot: (bootedGame) => {
        bootedGame.canvas.setAttribute('role', 'img');
        bootedGame.canvas.setAttribute(
          'aria-label',
          'A temporary pixel-art room for Our Little House',
        );
        bootedGame.canvas.tabIndex = -1;
      },
    },
  });

  return game;
};
