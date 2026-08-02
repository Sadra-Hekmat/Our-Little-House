import Phaser from 'phaser';

import type { StateController } from '@game/state/state-controller';

export class PreloadScene extends Phaser.Scene {
  public constructor(private readonly stateController: StateController) {
    super({ key: 'Preload' });
  }

  public create(): void {
    this.stateController.transition('Title');
    this.scene.start('Title');
  }
}
