export type GameState =
  'Boot' | 'Preload' | 'Title' | 'Playing' | 'DialogueOpen' | 'Paused' | 'Error';

const transitions: Readonly<Record<GameState, readonly GameState[]>> = {
  Boot: ['Preload', 'Error'],
  Preload: ['Title', 'Error'],
  Title: ['Playing', 'Error'],
  Playing: ['DialogueOpen', 'Paused', 'Title', 'Error'],
  DialogueOpen: ['Playing', 'Paused', 'Error'],
  Paused: ['Playing', 'DialogueOpen', 'Title', 'Error'],
  Error: ['Boot', 'Title'],
};

export class StateController {
  private currentState: GameState = 'Boot';
  private readonly listeners = new Set<(state: GameState) => void>();

  public get state(): GameState {
    return this.currentState;
  }

  public get acceptsMovement(): boolean {
    return this.currentState === 'Playing';
  }

  public transition(nextState: GameState): void {
    if (!transitions[this.currentState].includes(nextState)) {
      throw new Error(`Invalid game-state transition: ${this.currentState} → ${nextState}`);
    }

    this.currentState = nextState;
    this.listeners.forEach((listener) => listener(nextState));
  }

  public subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
