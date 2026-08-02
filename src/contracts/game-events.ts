export type RendererName = 'WebGL' | 'Canvas';

export interface GameReadyViewModel {
  renderer: RendererName;
}

export interface GameErrorViewModel {
  category: 'renderer-construction' | 'map-validation';
  userMessage: string;
}

export type GamePauseReason = 'manual' | 'blur' | 'hidden' | 'focus-loss' | 'pointer-focus-loss';

export type GameCommand = { type: 'pause' | 'resume' | 'restart' };

export const GAME_COMMAND_EVENT = 'our-little-house:game-command';
