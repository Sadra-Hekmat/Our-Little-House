export type RendererName = 'WebGL' | 'Canvas';

export interface GameReadyViewModel {
  renderer: RendererName;
}

export interface GameErrorViewModel {
  category: 'renderer-construction';
  userMessage: string;
}
