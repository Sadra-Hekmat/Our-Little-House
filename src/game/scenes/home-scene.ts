import Phaser from 'phaser';

import type { RendererName } from '@contracts/game-events';
import type { StateController } from '@game/state/state-controller';

const rendererName = (game: Phaser.Game): RendererName =>
  game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas';

export class HomeScene extends Phaser.Scene {
  public constructor(
    private readonly stateController: StateController,
    private readonly onFirstFrame: (renderer: RendererName) => void,
  ) {
    super({ key: 'Home' });
  }

  public create(): void {
    if (!this.stateController.acceptsMovement) {
      this.stateController.transition('Playing');
    }

    this.cameras.main.setBackgroundColor('#201329');
    this.drawPlaceholderRoom();

    this.time.delayedCall(34, () => this.onFirstFrame(rendererName(this.game)));
  }

  private drawPlaceholderRoom(): void {
    const room = this.add.graphics();
    room.fillStyle(0x3d2445).fillRect(48, 28, 544, 304);
    room.fillStyle(0xd19a62).fillRect(64, 64, 512, 240);

    for (let y = 64; y < 304; y += 16) {
      for (let x = 64; x < 576; x += 16) {
        const color = (x / 16 + y / 16) % 2 === 0 ? 0xc98956 : 0xd69f68;
        room.fillStyle(color).fillRect(x, y, 16, 16);
      }
    }

    room.fillStyle(0x315f67).fillRect(224, 112, 192, 128);
    room.fillStyle(0x24454c).fillRect(240, 128, 160, 96);
    room.lineStyle(4, 0x173038).strokeRect(224, 112, 192, 128);

    room.fillStyle(0x6e4058).fillRect(80, 80, 112, 64);
    room.fillStyle(0x9d6170).fillRect(88, 88, 96, 32);
    room.fillStyle(0x4a2a43).fillRect(80, 136, 112, 16);

    room.fillStyle(0x744731).fillRect(456, 88, 88, 56);
    room.fillStyle(0x322435).fillRect(472, 72, 56, 40);
    room.fillStyle(0x6ac1b1).fillRect(480, 80, 40, 24);

    room.fillStyle(0x774735).fillRect(448, 232, 104, 48);
    room.fillStyle(0xe8bd69).fillRect(464, 216, 16, 16);
    room.fillStyle(0xbd765b).fillRect(512, 216, 16, 16);

    const player = this.add.graphics();
    player.fillStyle(0x2d2138).fillRect(304, 168, 32, 40);
    player.fillStyle(0xf0b77d).fillRect(308, 152, 24, 24);
    player.fillStyle(0x5e3859).fillRect(304, 176, 32, 24);
    player.fillStyle(0x201329).fillRect(308, 200, 8, 16).fillRect(324, 200, 8, 16);
  }
}
