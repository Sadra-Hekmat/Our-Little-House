import type { DirectionState } from '@game/systems/movement';

export type InputAction = 'up' | 'down' | 'left' | 'right' | 'interact' | 'pause' | 'mute';

const keyActions: Readonly<Record<string, InputAction>> = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  KeyE: 'interact',
  Enter: 'interact',
  Space: 'interact',
  Escape: 'pause',
  KeyM: 'mute',
};

export const actionForCode = (code: string): InputAction | null => keyActions[code] ?? null;

export const shouldPreventGameplayDefault = (code: string): boolean =>
  ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Escape'].includes(code);

export class InputState {
  private readonly pressedCodes = new Set<string>();

  public press(code: string): { action: InputAction | null; firstPress: boolean } {
    const action = actionForCode(code);
    const firstPress = !this.pressedCodes.has(code);
    if (action) this.pressedCodes.add(code);
    return { action, firstPress };
  }

  public release(code: string): void {
    this.pressedCodes.delete(code);
  }

  public clear(): void {
    this.pressedCodes.clear();
  }

  public get directions(): DirectionState {
    const active = (action: InputAction): boolean =>
      [...this.pressedCodes].some((code) => actionForCode(code) === action);
    return {
      up: active('up'),
      down: active('down'),
      left: active('left'),
      right: active('right'),
    };
  }

  public get pressedActions(): InputAction[] {
    return [
      ...new Set([...this.pressedCodes].map(actionForCode).filter((action) => action !== null)),
    ];
  }
}
