import { describe, expect, it } from 'vitest';

import { GRAYBOX_CONTRACT } from '@map/graybox-contract';
import { analyzeReachability } from '@map/reachability';
import { MapValidationError, validateGrayboxMap } from '@map/tiled-map-adapter';

import grayboxHome from '../fixtures/graybox-home.json';

interface MutableObject extends Record<string, unknown> {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MutableLayer extends Record<string, unknown> {
  id: number;
  name: string;
  objects: MutableObject[];
}

interface MutableMap extends Record<string, unknown> {
  width: number;
  height: number;
  layers: MutableLayer[];
  tilesets: Array<Record<string, unknown>>;
}

const fixture = (): MutableMap => structuredClone(grayboxHome);

const layer = (map: MutableMap, name: string): MutableLayer => {
  const result = map.layers.find((candidate) => candidate.name === name);
  if (!result) throw new Error(`Fixture layer ${name} is missing.`);
  return result;
};

describe('validateGrayboxMap', () => {
  it('accepts the versioned seven-zone, twelve-interaction fixture', () => {
    const result = validateGrayboxMap(fixture());

    expect(result.contractVersion).toBe(1);
    expect(result.width).toBe(640);
    expect(result.height).toBe(360);
    expect(result.zones.map((zone) => zone.zoneId)).toEqual(GRAYBOX_CONTRACT.zoneIds);
    expect(result.interactions.map((interaction) => interaction.interactionId)).toEqual(
      GRAYBOX_CONTRACT.interactionIds,
    );
    expect(result.spawn).toEqual({ x: 320, y: 184, facing: 'down' });
  });

  it('rejects dimension, layer, ID, and spawn integrity failures', () => {
    const wrongSize = fixture();
    wrongSize.width = 79;
    expect(() => validateGrayboxMap(wrongSize)).toThrow('dimensions');

    const missingLayer = fixture();
    missingLayer.layers = missingLayer.layers.filter((candidate) => candidate.name !== 'spawn');
    expect(() => validateGrayboxMap(missingLayer)).toThrow('Missing required layer spawn');

    const duplicateId = fixture();
    layer(duplicateId, 'spawn').objects[0]!.id = layer(duplicateId, 'collisions').objects[0]!.id;
    expect(() => validateGrayboxMap(duplicateId)).toThrow('Duplicate object ID');

    const duplicateSpawn = fixture();
    const secondSpawn = structuredClone(layer(duplicateSpawn, 'spawn').objects[0]!);
    secondSpawn.id = 2_000;
    layer(duplicateSpawn, 'spawn').objects.push(secondSpawn);
    expect(() => validateGrayboxMap(duplicateSpawn)).toThrow('exactly one spawn');
  });

  it('rejects external assets and malformed or out-of-bounds geometry', () => {
    const externalTileset = fixture();
    externalTileset.tilesets = [{ firstgid: 1, source: 'https://example.invalid/tiles.tsx' }];
    expect(() => validateGrayboxMap(externalTileset)).toThrow('External tileset URLs');

    const nonFinite = fixture();
    layer(nonFinite, 'collisions').objects[0]!.x = Number.POSITIVE_INFINITY;
    expect(() => validateGrayboxMap(nonFinite)).toThrow('must be finite');

    const negative = fixture();
    layer(negative, 'collisions').objects[0]!.x = -1;
    expect(() => validateGrayboxMap(negative)).toThrow('negative geometry');

    const outside = fixture();
    const collision = layer(outside, 'collisions').objects[0]!;
    collision.x = 639;
    collision.width = 16;
    expect(() => validateGrayboxMap(outside)).toThrow('extends outside');
  });

  it('fails resource-limit attacks before accepting object geometry', () => {
    const tooManyLayers = fixture();
    while (tooManyLayers.layers.length <= GRAYBOX_CONTRACT.resourceLimits.maxLayers) {
      tooManyLayers.layers.push({
        id: 100 + tooManyLayers.layers.length,
        name: 'extra',
        objects: [],
      });
    }
    expect(() => validateGrayboxMap(tooManyLayers)).toThrow('too many layers');

    const tooManyObjects = fixture();
    const collisions = layer(tooManyObjects, 'collisions');
    while (
      tooManyObjects.layers.reduce((total, candidate) => total + candidate.objects.length, 0) <=
      GRAYBOX_CONTRACT.resourceLimits.maxObjects
    ) {
      collisions.objects.push({
        ...structuredClone(collisions.objects[0]!),
        id: 1_000 + collisions.objects.length,
        name: `extra_${collisions.objects.length}`,
      });
    }
    expect(() => validateGrayboxMap(tooManyObjects)).toThrow('too many objects');

    const excessivePoints = fixture();
    layer(excessivePoints, 'collisions').objects[0]!.polygon = Array.from(
      { length: GRAYBOX_CONTRACT.resourceLimits.maxPointsPerObject + 1 },
      (_, index) => ({ x: index, y: 0 }),
    );
    expect(() => validateGrayboxMap(excessivePoints)).toThrow('exceeds the point limit');
  });

  it('rejects a spawn or approach point that violates safe geometry', () => {
    const overlappingSpawn = fixture();
    const spawn = layer(overlappingSpawn, 'spawn').objects[0]!;
    spawn.x = 40;
    spawn.y = 32;
    expect(() => validateGrayboxMap(overlappingSpawn)).toThrow('Spawn overlaps collision');

    const badApproach = fixture();
    const interaction = layer(badApproach, 'interactions').objects[0]!;
    const properties = interaction.properties as Array<Record<string, unknown>>;
    const approachX = properties.find((candidate) => candidate.name === 'approachX');
    if (!approachX) throw new Error('Fixture interaction lacks approachX.');
    approachX.value = 639;
    expect(() => validateGrayboxMap(badApproach)).toThrow('approach point must be inside');
  });

  it('uses a bounded validation error without exposing raw map data', () => {
    expect(() => validateGrayboxMap(null)).toThrow(MapValidationError);
    expect(() => validateGrayboxMap(null)).toThrow('Map must be an object');
  });
});

describe('gray-box reachability', () => {
  it('reaches every interaction approach and leaves no walkable trap pocket', () => {
    const result = analyzeReachability(validateGrayboxMap(fixture()));

    expect(result.unreachableInteractions).toEqual([]);
    expect(result.trapPocketCells).toBe(0);
    expect(result.reachableCells).toBe(result.walkableCells);
    expect(result.reachableCells).toBeGreaterThan(500);
  });
});
