import { GRAYBOX_CONTRACT, type DepthBandName } from '@map/graybox-contract';

export const depthForBand = (band: DepthBandName): number => GRAYBOX_CONTRACT.depthBands[band];

export const depthForEntity = (feetY: number): number =>
  depthForBand('entities') + Math.round(feetY);

export const depthForAnchor = (anchorY: number): number =>
  depthForBand('entities') + Math.round(anchorY);

export const isEntityBehindAnchor = (feetY: number, anchorY: number): boolean =>
  depthForEntity(feetY) < depthForAnchor(anchorY);
