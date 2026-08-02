import Phaser from 'phaser';

import type { StateController } from '@game/state/state-controller';

export class TitleScene extends Phaser.Scene {
  public constructor(private readonly stateController: StateController) {
    super({ key: 'Title' });
  }

  public create(): void {
    this.stateController.transition('Playing');
    this.scene.start('Home');
  }
}
