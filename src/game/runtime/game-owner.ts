import type Phaser from 'phaser';

import type { RendererName } from '@contracts/game-events';
import { createGame } from '@game/runtime/create-game';

export interface GameFailure {
  category: 'renderer-construction';
  userMessage: string;
}

interface DevelopmentLifecycleStats {
  activeGames: number;
  inputSubscriptions: number;
  resizeListeners: number;
}

declare global {
  interface Window {
    __OLH_DEV__?: DevelopmentLifecycleStats;
  }
}

export class GameOwner {
  private game: Phaser.Game | null = null;
  private container: HTMLDivElement | null = null;
  private generation = 0;
  private inputInstalled = false;
  private resizeInstalled = false;

  private readonly onResize = (): void => {
    this.game?.scale.refresh();
  };
  private readonly onPointerDown = (): void => this.game?.canvas.focus({ preventScroll: true });

  public mount(
    container: HTMLDivElement,
    onReady: (renderer: RendererName) => void,
    onFailure: (failure: GameFailure) => void,
  ): void {
    this.destroy();
    this.container = container;
    const mountedGeneration = ++this.generation;

    window.addEventListener('resize', this.onResize);
    container.addEventListener('pointerdown', this.onPointerDown);
    this.resizeInstalled = true;
    this.inputInstalled = true;

    try {
      this.game = createGame(container, (renderer) => {
        if (this.generation === mountedGeneration && this.game) onReady(renderer);
      });
      this.syncDevelopmentStats();
    } catch {
      this.removeOwnedListeners();
      this.game = null;
      this.syncDevelopmentStats();
      onFailure({
        category: 'renderer-construction',
        userMessage:
          'Your browser could not create the game canvas. Retry, or return to the start.',
      });
    }
  }

  public destroy(): void {
    this.generation += 1;
    this.removeOwnedListeners();
    if (this.game) {
      this.game.destroy(true);
      this.game = null;
    }
    this.container = null;
    this.syncDevelopmentStats();
  }

  private removeOwnedListeners(): void {
    if (this.resizeInstalled) window.removeEventListener('resize', this.onResize);
    if (this.inputInstalled && this.container) {
      this.container.removeEventListener('pointerdown', this.onPointerDown);
    }
    this.resizeInstalled = false;
    this.inputInstalled = false;
  }

  private syncDevelopmentStats(): void {
    if (!import.meta.env.DEV) return;
    window.__OLH_DEV__ = {
      activeGames: this.game ? 1 : 0,
      inputSubscriptions: this.inputInstalled ? 1 : 0,
      resizeListeners: this.resizeInstalled ? 1 : 0,
    };
  }
}
