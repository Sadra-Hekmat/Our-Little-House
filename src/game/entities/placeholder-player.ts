import Phaser from 'phaser';

import { GRAYBOX_CONTRACT, type Facing } from '@map/graybox-contract';

const textureKey = (facing: Facing, frame: number): string => `graybox.player.${facing}.${frame}`;

const drawPlayerFrame = (
  graphics: Phaser.GameObjects.Graphics,
  facing: Facing,
  frame: number,
): void => {
  graphics.clear();
  graphics.fillStyle(0x21172c).fillRect(1, 1, 12, 18);
  graphics.fillStyle(0xe8ae79).fillRect(3, 2, 8, 7);
  graphics.fillStyle(0x663e68).fillRect(2, 9, 10, 7);

  const stride = frame % 2;
  graphics
    .fillStyle(0x24172e)
    .fillRect(3 - stride, 16, 3, 4)
    .fillRect(8 + stride, 16, 3, 4);
  graphics.fillStyle(0xffe0a3);
  if (facing === 'down') graphics.fillRect(4, 5, 2, 1).fillRect(8, 5, 2, 1);
  if (facing === 'up') graphics.fillStyle(0x3a233e).fillRect(3, 2, 8, 4);
  if (facing === 'left') graphics.fillRect(3, 5, 2, 1);
  if (facing === 'right') graphics.fillRect(9, 5, 2, 1);
};

export const ensurePlaceholderPlayerAnimations = (scene: Phaser.Scene): void => {
  const graphics = new Phaser.GameObjects.Graphics(scene);
  for (const facing of ['down', 'up', 'left', 'right'] as const) {
    for (let frame = 0; frame < 4; frame += 1) {
      const key = textureKey(facing, frame);
      if (!scene.textures.exists(key)) {
        drawPlayerFrame(graphics, facing, frame);
        graphics.generateTexture(key, 14, 20);
      }
    }

    const idleKey = GRAYBOX_CONTRACT.animationKeys.idle[facing];
    if (!scene.anims.exists(idleKey)) {
      scene.anims.create({
        key: idleKey,
        frames: [{ key: textureKey(facing, 0) }],
        frameRate: 1,
        repeat: -1,
      });
    }

    const walkKey = GRAYBOX_CONTRACT.animationKeys.walk[facing];
    if (!scene.anims.exists(walkKey)) {
      scene.anims.create({
        key: walkKey,
        frames: [0, 1, 2, 3].map((frame) => ({ key: textureKey(facing, frame) })),
        frameRate: 8,
        repeat: -1,
      });
    }
  }
  graphics.destroy();
};

export const createPlaceholderPlayer = (
  scene: Phaser.Scene,
  spawn: { x: number; y: number; facing: Facing },
): Phaser.Physics.Arcade.Sprite => {
  ensurePlaceholderPlayerAnimations(scene);
  const player = scene.physics.add.sprite(spawn.x, spawn.y, textureKey(spawn.facing, 0));
  player.setName('graybox-player');
  player.setOrigin(0.5, 0.75);
  player.body?.setSize(GRAYBOX_CONTRACT.player.bodyWidth, GRAYBOX_CONTRACT.player.bodyHeight, true);
  player.play(GRAYBOX_CONTRACT.animationKeys.idle[spawn.facing]);
  return player;
};
