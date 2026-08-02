import { resolveMovement, type DirectionState } from '@game/systems/movement';
import { GRAYBOX_CONTRACT, type Facing } from '@map/graybox-contract';
import type { GrayboxMap, RectangleGeometry } from '@map/tiled-map-adapter';

export interface MovementTraceSegment {
  directions: DirectionState;
  frames: number;
}

export interface MovementTraceResult {
  x: number;
  y: number;
  facing: Facing;
  frames: number;
}

const overlaps = (
  x: number,
  y: number,
  halfWidth: number,
  halfHeight: number,
  rectangle: RectangleGeometry,
): boolean =>
  x + halfWidth > rectangle.x &&
  x - halfWidth < rectangle.x + rectangle.width &&
  y + halfHeight > rectangle.y &&
  y - halfHeight < rectangle.y + rectangle.height;

const moveAxis = (
  position: { x: number; y: number },
  delta: number,
  axis: 'x' | 'y',
  collisions: RectangleGeometry[],
): void => {
  if (delta === 0) return;
  const halfWidth = GRAYBOX_CONTRACT.player.bodyWidth / 2;
  const halfHeight = GRAYBOX_CONTRACT.player.bodyHeight / 2;
  position[axis] += delta;

  for (const collision of collisions) {
    if (!overlaps(position.x, position.y, halfWidth, halfHeight, collision)) continue;
    if (axis === 'x') {
      position.x = delta > 0 ? collision.x - halfWidth : collision.x + collision.width + halfWidth;
    } else {
      position.y =
        delta > 0 ? collision.y - halfHeight : collision.y + collision.height + halfHeight;
    }
  }
};

export const runMovementTrace = (
  map: GrayboxMap,
  segments: readonly MovementTraceSegment[],
  start: { x: number; y: number; facing: Facing } = map.spawn,
): MovementTraceResult => {
  const position = { x: start.x, y: start.y };
  let facing = start.facing;
  let frames = 0;

  for (const segment of segments) {
    if (!Number.isInteger(segment.frames) || segment.frames < 0 || segment.frames > 3_600) {
      throw new Error('Trace frame counts must be integers between 0 and 3600.');
    }
    for (let frame = 0; frame < segment.frames; frame += 1) {
      const movement = resolveMovement(segment.directions, facing);
      facing = movement.facing;
      moveAxis(position, movement.x / 60, 'x', map.collisions);
      moveAxis(position, movement.y / 60, 'y', map.collisions);
      frames += 1;
    }
  }

  return {
    x: Number(position.x.toFixed(3)),
    y: Number(position.y.toFixed(3)),
    facing,
    frames,
  };
};
