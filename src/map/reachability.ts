import { GRAYBOX_CONTRACT, type InteractionId } from '@map/graybox-contract';
import type { GrayboxMap, RectangleGeometry } from '@map/tiled-map-adapter';

export interface ReachabilityResult {
  sampleStep: number;
  clearance: number;
  walkableCells: number;
  reachableCells: number;
  unreachableInteractions: InteractionId[];
  trapPocketCells: number;
}

const expandedContains = (
  rectangle: RectangleGeometry,
  x: number,
  y: number,
  clearance: number,
): boolean =>
  x > rectangle.x - clearance &&
  x < rectangle.x + rectangle.width + clearance &&
  y > rectangle.y - clearance &&
  y < rectangle.y + rectangle.height + clearance;

export const analyzeReachability = (
  map: GrayboxMap,
  options: { sampleStep?: number; clearance?: number } = {},
): ReachabilityResult => {
  const sampleStep = options.sampleStep ?? GRAYBOX_CONTRACT.tileSize.width;
  const clearance = options.clearance ?? GRAYBOX_CONTRACT.player.clearance;
  if (!Number.isInteger(sampleStep) || sampleStep <= 0) {
    throw new Error('Reachability sample step must be a positive integer.');
  }

  const columns = Math.floor(map.width / sampleStep) + 1;
  const rows = Math.floor(map.height / sampleStep) + 1;
  const key = (column: number, row: number): number => row * columns + column;
  const point = (column: number, row: number): { x: number; y: number } => ({
    x: column * sampleStep,
    y: row * sampleStep,
  });

  const isWalkable = (column: number, row: number): boolean => {
    const { x, y } = point(column, row);
    const insideFloor =
      x >= map.floor.x + clearance &&
      x <= map.floor.x + map.floor.width - clearance &&
      y >= map.floor.y + clearance &&
      y <= map.floor.y + map.floor.height - clearance;
    return (
      insideFloor &&
      !map.collisions.some((collision) => expandedContains(collision, x, y, clearance))
    );
  };

  const walkable = new Set<number>();
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (isWalkable(column, row)) walkable.add(key(column, row));
    }
  }

  const nearestWalkableCell = (x: number, y: number): number | null => {
    const originColumn = Math.round(x / sampleStep);
    const originRow = Math.round(y / sampleStep);
    let best: { key: number; distance: number } | null = null;
    for (let row = Math.max(0, originRow - 2); row <= Math.min(rows - 1, originRow + 2); row += 1) {
      for (
        let column = Math.max(0, originColumn - 2);
        column <= Math.min(columns - 1, originColumn + 2);
        column += 1
      ) {
        const candidateKey = key(column, row);
        if (!walkable.has(candidateKey)) continue;
        const candidate = point(column, row);
        const distance = Math.hypot(candidate.x - x, candidate.y - y);
        if (!best || distance < best.distance) best = { key: candidateKey, distance };
      }
    }
    return best?.key ?? null;
  };

  const start = nearestWalkableCell(map.spawn.x, map.spawn.y);
  if (start === null) throw new Error('Spawn has no walkable reachability sample.');

  const reachable = new Set<number>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    const row = Math.floor(current / columns);
    const column = current % columns;
    for (const [deltaColumn, deltaRow] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nextColumn = column + deltaColumn;
      const nextRow = row + deltaRow;
      if (nextColumn < 0 || nextColumn >= columns || nextRow < 0 || nextRow >= rows) continue;
      const next = key(nextColumn, nextRow);
      if (walkable.has(next) && !reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
      }
    }
  }

  const unreachableInteractions = map.interactions
    .filter((interaction) => {
      const target = nearestWalkableCell(interaction.approach.x, interaction.approach.y);
      return target === null || !reachable.has(target);
    })
    .map((interaction) => interaction.interactionId);

  return {
    sampleStep,
    clearance,
    walkableCells: walkable.size,
    reachableCells: reachable.size,
    unreachableInteractions,
    trapPocketCells: walkable.size - reachable.size,
  };
};
