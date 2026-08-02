import { describe, expect, it } from 'vitest';

import { resolveMovement } from '@game/systems/movement';
import {
  bodyBoundsForPosition,
  PHASE1_ACCEPTANCE_TRACE,
  runMovementTrace,
} from '@game/systems/movement-trace';
import { depthForAnchor, depthForBand, depthForEntity, isEntityBehindAnchor } from '@map/depth';
import { GRAYBOX_CONTRACT } from '@map/graybox-contract';
import { validateGrayboxMap } from '@map/tiled-map-adapter';

import grayboxHome from '../fixtures/graybox-home.json';

const still = { up: false, down: false, left: false, right: false };

describe('movement vectors and animation contract', () => {
  it('keeps the Phaser body centered on the contract position', () => {
    const player = GRAYBOX_CONTRACT.player;
    expect(player.frameWidth * player.originX - player.bodyOffsetX).toBe(player.bodyWidth / 2);
    expect(player.frameHeight * player.originY - player.bodyOffsetY).toBe(player.bodyHeight / 2);
    expect(player.frameHeight * (1 - player.originY)).toBe(player.feetOffsetY);
    expect(bodyBoundsForPosition(320, 184)).toEqual({
      left: 314,
      right: 326,
      top: 179,
      bottom: 189,
      centerX: 320,
      centerY: 184,
    });
  });

  it('maps every cardinal direction to full speed and the matching walk contract', () => {
    const cases = [
      [{ ...still, up: true }, 'up', 0, -96],
      [{ ...still, down: true }, 'down', 0, 96],
      [{ ...still, left: true }, 'left', -96, 0],
      [{ ...still, right: true }, 'right', 96, 0],
    ] as const;

    for (const [directions, facing, x, y] of cases) {
      const movement = resolveMovement(directions, 'down');
      expect(movement).toMatchObject({ moving: true, facing, x, y, speed: 96 });
      expect(movement.animation).toBe(GRAYBOX_CONTRACT.animationKeys.walk[facing]);
    }
  });

  it('normalizes diagonals to cardinal speed', () => {
    const movement = resolveMovement({ ...still, up: true, right: true }, 'down');
    expect(Math.hypot(movement.x, movement.y)).toBeCloseTo(GRAYBOX_CONTRACT.player.speed, 8);
    expect(Math.abs(movement.x)).toBeCloseTo(Math.abs(movement.y), 8);
  });

  it('cancels opposite directions and retains the last idle facing', () => {
    const movement = resolveMovement({ up: true, down: true, left: true, right: true }, 'left');
    expect(movement).toEqual({
      x: 0,
      y: 0,
      speed: 0,
      moving: false,
      facing: 'left',
      animation: GRAYBOX_CONTRACT.animationKeys.idle.left,
    });
  });
});

describe('depth bands and anchors', () => {
  it('keeps explicit bands ordered', () => {
    expect(depthForBand('floor')).toBeLessThan(depthForBand('lowerFurniture'));
    expect(depthForBand('lowerFurniture')).toBeLessThan(depthForBand('entities'));
    expect(depthForBand('entities')).toBeLessThan(depthForBand('upperFurniture'));
    expect(depthForBand('upperFurniture')).toBeLessThan(depthForBand('viewportUi'));
  });

  it('places the player behind or in front of a tall visual by feet position', () => {
    expect(isEntityBehindAnchor(120, 144)).toBe(true);
    expect(depthForEntity(120)).toBeLessThan(depthForAnchor(144));
    expect(isEntityBehindAnchor(160, 144)).toBe(false);
    expect(depthForEntity(160)).toBeGreaterThan(depthForAnchor(144));
  });
});

describe('deterministic movement trace', () => {
  it('resolves the same fixed-step collision path to an exact final coordinate', () => {
    const result = runMovementTrace(validateGrayboxMap(grayboxHome), PHASE1_ACCEPTANCE_TRACE);

    expect(result).toEqual({ x: 370, y: 307, facing: 'down', frames: 270 });
  });
});
