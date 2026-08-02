import Phaser from 'phaser';

import type { StateController } from '@game/state/state-controller';

export class BootScene extends Phaser.Scene {
  public constructor(private readonly stateController: StateController) {
    super({ key: 'Boot' });
  }

  public create(): void {
    this.stateController.transition('Preload');
    this.scene.start('Preload');
  }
}
