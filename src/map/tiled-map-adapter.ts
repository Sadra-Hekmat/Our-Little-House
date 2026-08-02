import {
  GRAYBOX_CONTRACT,
  type DepthBandName,
  type Facing,
  type GrayboxLayerName,
  type GrayboxZoneId,
  type InteractionId,
} from '@map/graybox-contract';

interface TiledProperty {
  name: string;
  type: string;
  value: unknown;
}

interface TiledObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  point?: boolean;
  polygon?: unknown[];
  polyline?: unknown[];
  properties: TiledProperty[];
}

interface TiledObjectLayer {
  id: number;
  name: GrayboxLayerName;
  type: 'objectgroup';
  objects: TiledObject[];
}

export interface RectangleGeometry {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CollisionGeometry extends RectangleGeometry {
  kind: 'wall' | 'furniture';
}

export interface InteractionGeometry extends RectangleGeometry {
  interactionId: InteractionId;
  contentKey: string;
  approach: { x: number; y: number };
}

export interface DepthAnchorGeometry extends RectangleGeometry {
  anchorY: number;
  band: DepthBandName;
  collisionId: string | null;
}

export interface GrayboxMap {
  contractVersion: 1;
  width: number;
  height: number;
  floor: RectangleGeometry;
  zones: Array<RectangleGeometry & { zoneId: GrayboxZoneId }>;
  collisions: CollisionGeometry[];
  interactions: InteractionGeometry[];
  depthAnchors: DepthAnchorGeometry[];
  spawn: { x: number; y: number; facing: Facing };
}

export class MapValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'MapValidationError';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function fail(message: string): never {
  throw new MapValidationError(message);
}

const finiteNumber = (value: unknown, path: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`${path} must be finite.`);
  return value;
};

const boundedInteger = (value: unknown, path: string): number => {
  const number = finiteNumber(value, path);
  if (!Number.isInteger(number) || number < 0) fail(`${path} must be a non-negative integer.`);
  return number;
};

const stringValue = (value: unknown, path: string): string => {
  if (typeof value !== 'string' || value.length === 0) fail(`${path} must be a non-empty string.`);
  return value;
};

const readProperties = (value: unknown, path: string): TiledProperty[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail(`${path} must be an array.`);
  if (value.length > GRAYBOX_CONTRACT.resourceLimits.maxPropertiesPerObject) {
    fail(`${path} exceeds the property limit.`);
  }

  const names = new Set<string>();
  return value.map((entry, index) => {
    if (!isRecord(entry)) fail(`${path}[${index}] must be an object.`);
    const name = stringValue(entry.name, `${path}[${index}].name`);
    if (names.has(name)) fail(`${path} contains duplicate property ${name}.`);
    names.add(name);
    return {
      name,
      type: stringValue(entry.type, `${path}[${index}].type`),
      value: entry.value,
    };
  });
};

const property = (object: TiledObject, name: string): TiledProperty | undefined =>
  object.properties.find((candidate) => candidate.name === name);

const stringProperty = (object: TiledObject, name: string): string => {
  const candidate = property(object, name);
  if (!candidate || candidate.type !== 'string') fail(`${object.name}.${name} must be a string.`);
  return stringValue(candidate.value, `${object.name}.${name}`);
};

const numberProperty = (object: TiledObject, name: string): number => {
  const candidate = property(object, name);
  if (!candidate || !['float', 'int'].includes(candidate.type)) {
    fail(`${object.name}.${name} must be numeric.`);
  }
  return finiteNumber(candidate.value, `${object.name}.${name}`);
};

const boolProperty = (object: TiledObject, name: string): boolean => {
  const candidate = property(object, name);
  if (!candidate || candidate.type !== 'bool' || typeof candidate.value !== 'boolean') {
    fail(`${object.name}.${name} must be boolean.`);
  }
  return candidate.value;
};

const parseObject = (value: unknown, path: string): TiledObject => {
  if (!isRecord(value)) fail(`${path} must be an object.`);

  const polygon = value.polygon;
  const polyline = value.polyline;
  for (const [shapeName, points] of [
    ['polygon', polygon],
    ['polyline', polyline],
  ] as const) {
    if (points !== undefined) {
      if (!Array.isArray(points)) fail(`${path}.${shapeName} must be an array.`);
      if (points.length > GRAYBOX_CONTRACT.resourceLimits.maxPointsPerObject) {
        fail(`${path}.${shapeName} exceeds the point limit.`);
      }
      fail(`${path} must use rectangle geometry, not ${shapeName}.`);
    }
  }

  return {
    id: boundedInteger(value.id, `${path}.id`),
    name: stringValue(value.name, `${path}.name`),
    type: stringValue(value.type, `${path}.type`),
    x: finiteNumber(value.x, `${path}.x`),
    y: finiteNumber(value.y, `${path}.y`),
    width: finiteNumber(value.width ?? 0, `${path}.width`),
    height: finiteNumber(value.height ?? 0, `${path}.height`),
    point: value.point === true,
    ...(polygon === undefined ? {} : { polygon: polygon as unknown[] }),
    ...(polyline === undefined ? {} : { polyline: polyline as unknown[] }),
    properties: readProperties(value.properties, `${path}.properties`),
  };
};

const assertInsideMap = (
  object: TiledObject,
  mapWidth: number,
  mapHeight: number,
  options: { point?: boolean } = {},
): void => {
  if (object.x < 0 || object.y < 0) fail(`${object.name} has negative geometry.`);
  if (options.point) {
    if (object.x > mapWidth || object.y > mapHeight) fail(`${object.name} is outside the map.`);
    return;
  }
  if (object.width <= 0 || object.height <= 0) fail(`${object.name} must be a rectangle.`);
  if (object.x + object.width > mapWidth || object.y + object.height > mapHeight) {
    fail(`${object.name} extends outside ${mapWidth} × ${mapHeight}.`);
  }
};

const parseLayers = (value: unknown): TiledObjectLayer[] => {
  if (!Array.isArray(value)) fail('layers must be an array.');
  if (value.length > GRAYBOX_CONTRACT.resourceLimits.maxLayers) fail('Map has too many layers.');

  const layerIds = new Set<number>();
  const layerNames = new Set<string>();
  let objectCount = 0;

  const layers = value.map((candidate, layerIndex) => {
    if (!isRecord(candidate)) fail(`layers[${layerIndex}] must be an object.`);
    const id = boundedInteger(candidate.id, `layers[${layerIndex}].id`);
    const name = stringValue(candidate.name, `layers[${layerIndex}].name`);
    if (!GRAYBOX_CONTRACT.requiredLayers.includes(name as GrayboxLayerName)) {
      fail(`Unknown layer ${name}.`);
    }
    if (candidate.type !== 'objectgroup') fail(`${name} must be an object layer.`);
    if (layerIds.has(id)) fail(`Duplicate layer ID ${id}.`);
    if (layerNames.has(name)) fail(`Duplicate layer name ${name}.`);
    layerIds.add(id);
    layerNames.add(name);

    if (!Array.isArray(candidate.objects)) fail(`${name}.objects must be an array.`);
    objectCount += candidate.objects.length;
    if (objectCount > GRAYBOX_CONTRACT.resourceLimits.maxObjects) fail('Map has too many objects.');

    return {
      id,
      name: name as GrayboxLayerName,
      type: 'objectgroup' as const,
      objects: candidate.objects.map((object, objectIndex) =>
        parseObject(object, `${name}.objects[${objectIndex}]`),
      ),
    };
  });

  for (const required of GRAYBOX_CONTRACT.requiredLayers) {
    if (!layerNames.has(required)) fail(`Missing required layer ${required}.`);
  }
  return layers;
};

const asRectangle = (object: TiledObject): RectangleGeometry => ({
  id: object.id,
  name: object.name,
  x: object.x,
  y: object.y,
  width: object.width,
  height: object.height,
});

const overlapsPoint = (rectangle: RectangleGeometry, x: number, y: number): boolean =>
  x >= rectangle.x &&
  x <= rectangle.x + rectangle.width &&
  y >= rectangle.y &&
  y <= rectangle.y + rectangle.height;

export const validateGrayboxMap = (input: unknown): GrayboxMap => {
  if (!isRecord(input)) fail('Map must be an object.');
  if (input.type !== 'map' || input.infinite !== false) fail('Map must be a finite Tiled map.');

  const widthInTiles = boundedInteger(input.width, 'width');
  const heightInTiles = boundedInteger(input.height, 'height');
  const tileWidth = boundedInteger(input.tilewidth, 'tilewidth');
  const tileHeight = boundedInteger(input.tileheight, 'tileheight');
  const width = widthInTiles * tileWidth;
  const height = heightInTiles * tileHeight;

  if (
    width !== GRAYBOX_CONTRACT.logicalSize.width ||
    height !== GRAYBOX_CONTRACT.logicalSize.height ||
    tileWidth !== GRAYBOX_CONTRACT.tileSize.width ||
    tileHeight !== GRAYBOX_CONTRACT.tileSize.height
  ) {
    fail('Map dimensions or tile size do not match gray-box contract v1.');
  }

  if (input.tilesets !== undefined) {
    if (!Array.isArray(input.tilesets)) fail('tilesets must be an array.');
    if (input.tilesets.length > 0) {
      fail('External tileset URLs and embedded tilesets are forbidden in gray-box contract v1.');
    }
  }

  const layers = parseLayers(input.layers);
  const allObjects = layers.flatMap((layer) => layer.objects);
  const objectIds = new Set<number>();
  for (const object of allObjects) {
    if (objectIds.has(object.id)) fail(`Duplicate object ID ${object.id}.`);
    objectIds.add(object.id);
  }

  const layer = (name: GrayboxLayerName): TiledObjectLayer => {
    const result = layers.find((candidate) => candidate.name === name);
    if (!result) return fail(`Missing layer ${name}.`);
    return result;
  };

  const floorObjects = layer('floor').objects;
  const floorObject = floorObjects.at(0);
  if (floorObjects.length !== 1 || !floorObject || floorObject.type !== 'floor') {
    fail('floor must contain exactly one floor rectangle.');
  }
  assertInsideMap(floorObject, width, height);
  const floor = asRectangle(floorObject);

  const zones = layer('zones').objects.map((object) => {
    assertInsideMap(object, width, height);
    if (
      object.type !== 'zone' ||
      !GRAYBOX_CONTRACT.zoneIds.includes(object.name as GrayboxZoneId)
    ) {
      return fail(`Invalid zone ${object.name}.`);
    }
    return { ...asRectangle(object), zoneId: object.name as GrayboxZoneId };
  });
  if (
    zones.length !== GRAYBOX_CONTRACT.zoneIds.length ||
    new Set(zones.map((zone) => zone.zoneId)).size !== GRAYBOX_CONTRACT.zoneIds.length
  ) {
    fail('Every required visual zone must appear exactly once.');
  }

  const collisions = layer('collisions').objects.map((object): CollisionGeometry => {
    assertInsideMap(object, width, height);
    if (object.type !== 'collision' || boolProperty(object, 'solid') !== true) {
      return fail(`${object.name} must be a solid collision rectangle.`);
    }
    const kind = stringProperty(object, 'kind');
    if (kind !== 'wall' && kind !== 'furniture') fail(`${object.name} has invalid collision kind.`);
    return { ...asRectangle(object), kind };
  });
  const collisionNames = new Set(collisions.map((collision) => collision.name));
  if (collisionNames.size !== collisions.length) fail('Collision names must be unique.');

  const interactions = layer('interactions').objects.map((object) => {
    assertInsideMap(object, width, height);
    if (
      object.type !== 'interaction' ||
      !GRAYBOX_CONTRACT.interactionIds.includes(object.name as InteractionId)
    ) {
      return fail(`Invalid interaction ${object.name}.`);
    }
    const approach = {
      x: numberProperty(object, 'approachX'),
      y: numberProperty(object, 'approachY'),
    };
    if (approach.x < 0 || approach.x > width || approach.y < 0 || approach.y > height) {
      fail(`${object.name} has an out-of-bounds approach point.`);
    }
    if (!overlapsPoint(asRectangle(object), approach.x, approach.y)) {
      fail(`${object.name} approach point must be inside its interaction rectangle.`);
    }
    return {
      ...asRectangle(object),
      interactionId: object.name as InteractionId,
      contentKey: stringProperty(object, 'contentKey'),
      approach,
    };
  });
  if (
    interactions.length !== GRAYBOX_CONTRACT.interactionIds.length ||
    new Set(interactions.map((interaction) => interaction.interactionId)).size !==
      GRAYBOX_CONTRACT.interactionIds.length
  ) {
    fail('Every required interaction must appear exactly once.');
  }

  const depthAnchors = layer('depthAnchors').objects.map((object) => {
    assertInsideMap(object, width, height);
    if (object.type !== 'depth-anchor') fail(`${object.name} must be a depth anchor.`);
    const anchorY = numberProperty(object, 'anchorY');
    if (anchorY < object.y || anchorY > object.y + object.height) {
      fail(`${object.name}.anchorY must lie inside its visual bounds.`);
    }
    const band = stringProperty(object, 'band');
    if (!(band in GRAYBOX_CONTRACT.depthBands)) fail(`${object.name} has invalid depth band.`);
    const collisionId = property(object, 'collisionId')
      ? stringProperty(object, 'collisionId')
      : null;
    if (collisionId && !collisionNames.has(collisionId)) {
      fail(`${object.name} references missing collision ${collisionId}.`);
    }
    return {
      ...asRectangle(object),
      anchorY,
      band: band as DepthBandName,
      collisionId,
    };
  });

  const spawnObjects = layer('spawn').objects;
  if (spawnObjects.length !== 1) fail('Map must contain exactly one spawn object.');
  const spawnObject = spawnObjects[0];
  if (!spawnObject || spawnObject.type !== 'spawn' || !spawnObject.point) {
    return fail('Spawn must be one Tiled point object.');
  }
  assertInsideMap(spawnObject, width, height, { point: true });
  const facing = stringProperty(spawnObject, 'facing');
  if (!['up', 'down', 'left', 'right'].includes(facing)) fail('Spawn facing is invalid.');
  const spawn = { x: spawnObject.x, y: spawnObject.y, facing: facing as Facing };

  if (collisions.some((collision) => overlapsPoint(collision, spawn.x, spawn.y))) {
    fail('Spawn overlaps collision geometry.');
  }
  if (interactions.some((interaction) => overlapsPoint(interaction, spawn.x, spawn.y))) {
    fail('Spawn overlaps an interaction zone.');
  }

  return {
    contractVersion: 1,
    width,
    height,
    floor,
    zones,
    collisions,
    interactions,
    depthAnchors,
    spawn,
  };
};
