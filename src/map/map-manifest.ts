import grayboxHome from '../../tests/fixtures/graybox-home.json';

import { validateGrayboxMap, type GrayboxMap } from '@map/tiled-map-adapter';

const MAP_MANIFEST = {
  'graybox-home': grayboxHome,
} as const;

export type MapId = keyof typeof MAP_MANIFEST;

export const loadMapFromManifest = (mapId: MapId): GrayboxMap =>
  validateGrayboxMap(MAP_MANIFEST[mapId]);
