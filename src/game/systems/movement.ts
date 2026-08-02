import { GRAYBOX_CONTRACT, type Facing, type PlayerAnimationKey } from '@map/graybox-contract';

export interface DirectionState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface MovementVector {
  x: number;
  y: number;
  speed: number;
  moving: boolean;
  facing: Facing;
  animation: PlayerAnimationKey;
}

export const resolveMovement = (
  directions: DirectionState,
  lastFacing: Facing,
  speed = GRAYBOX_CONTRACT.player.speed,
): MovementVector => {
  const horizontal = Number(directions.right) - Number(directions.left);
  const vertical = Number(directions.down) - Number(directions.up);
  const magnitude = Math.hypot(horizontal, vertical);

  if (magnitude === 0) {
    return {
      x: 0,
      y: 0,
      speed: 0,
      moving: false,
      facing: lastFacing,
      animation: GRAYBOX_CONTRACT.animationKeys.idle[lastFacing],
    };
  }

  let facing = lastFacing;
  if (Math.abs(horizontal) >= Math.abs(vertical) && horizontal !== 0) {
    facing = horizontal < 0 ? 'left' : 'right';
  } else if (vertical !== 0) {
    facing = vertical < 0 ? 'up' : 'down';
  }

  return {
    x: (horizontal / magnitude) * speed,
    y: (vertical / magnitude) * speed,
    speed,
    moving: true,
    facing,
    animation: GRAYBOX_CONTRACT.animationKeys.walk[facing],
  };
};

export const integralRenderPosition = (value: number): number => Math.round(value);
