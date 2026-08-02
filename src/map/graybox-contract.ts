export const GRAYBOX_CONTRACT = {
  version: 1,
  coordinateOrigin: 'top-left',
  logicalSize: { width: 640, height: 360 },
  tileSize: { width: 8, height: 8 },
  requiredLayers: ['floor', 'zones', 'collisions', 'interactions', 'depthAnchors', 'spawn'],
  zoneIds: ['living', 'kitchen', 'sleeping', 'work', 'exercise', 'pet', 'open_walkway'],
  interactionIds: [
    'work_computer',
    'bed',
    'television',
    'couch',
    'refrigerator',
    'water_dispenser',
    'stove',
    'sink',
    'microwave',
    'weights',
    'pet_cat',
    'wall_art',
  ],
  animationKeys: {
    idle: {
      down: 'player.idle.down',
      up: 'player.idle.up',
      left: 'player.idle.left',
      right: 'player.idle.right',
    },
    walk: {
      down: 'player.walk.down',
      up: 'player.walk.up',
      left: 'player.walk.left',
      right: 'player.walk.right',
    },
  },
  depthBands: {
    floor: 0,
    lowerFurniture: 1_000,
    entities: 2_000,
    upperFurniture: 3_000,
    viewportUi: 10_000,
  },
  player: {
    speed: 96,
    bodyWidth: 12,
    bodyHeight: 10,
    initialFacing: 'down',
    clearance: 6,
  },
  resourceLimits: {
    maxLayers: 12,
    maxObjects: 128,
    maxPointsPerObject: 64,
    maxPropertiesPerObject: 16,
  },
} as const;

export type GrayboxLayerName = (typeof GRAYBOX_CONTRACT.requiredLayers)[number];
export type GrayboxZoneId = (typeof GRAYBOX_CONTRACT.zoneIds)[number];
export type InteractionId = (typeof GRAYBOX_CONTRACT.interactionIds)[number];
export type Facing = keyof typeof GRAYBOX_CONTRACT.animationKeys.idle;
export type PlayerAnimationKey =
  | (typeof GRAYBOX_CONTRACT.animationKeys.idle)[Facing]
  | (typeof GRAYBOX_CONTRACT.animationKeys.walk)[Facing];
export type DepthBandName = keyof typeof GRAYBOX_CONTRACT.depthBands;
