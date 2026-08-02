import Phaser from 'phaser';

import { ensurePlaceholderPlayerAnimations } from '@game/entities/placeholder-player';
import type { StateController } from '@game/state/state-controller';

export class PreloadScene extends Phaser.Scene {
  public constructor(private readonly stateController: StateController) {
    super({ key: 'Preload' });
  }

  public create(): void {
    ensurePlaceholderPlayerAnimations(this);
    this.stateController.transition('Title');
    this.scene.start('Title');
  }
}
