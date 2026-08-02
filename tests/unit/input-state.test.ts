import { describe, expect, it } from 'vitest';

import { actionForCode, InputState, shouldPreventGameplayDefault } from '@game/systems/input-state';

describe('InputState', () => {
  it('unifies WASD and arrow keys without dropping simultaneous inputs', () => {
    const state = new InputState();
    state.press('KeyW');
    state.press('ArrowUp');
    state.press('KeyD');
    expect(state.directions).toEqual({ up: true, down: false, left: false, right: true });

    state.release('KeyW');
    expect(state.directions.up).toBe(true);
    state.release('ArrowUp');
    expect(state.directions.up).toBe(false);
  });

  it('marks key repeat as a non-edge press and clears every stuck action', () => {
    const state = new InputState();
    expect(state.press('Escape')).toEqual({ action: 'pause', firstPress: true });
    expect(state.press('Escape')).toEqual({ action: 'pause', firstPress: false });
    state.press('KeyA');
    state.press('KeyM');
    expect(state.pressedActions).toEqual(['pause', 'left', 'mute']);

    state.clear();
    expect(state.pressedActions).toEqual([]);
    expect(state.directions).toEqual({ up: false, down: false, left: false, right: false });
  });

  it('maps all required action keys and scopes browser-default suppression', () => {
    expect(
      ['KeyW', 'ArrowUp', 'KeyS', 'ArrowDown', 'KeyA', 'ArrowLeft', 'KeyD', 'ArrowRight'].map(
        actionForCode,
      ),
    ).toEqual(['up', 'up', 'down', 'down', 'left', 'left', 'right', 'right']);
    expect(actionForCode('KeyE')).toBe('interact');
    expect(actionForCode('Enter')).toBe('interact');
    expect(actionForCode('Space')).toBe('interact');
    expect(actionForCode('Escape')).toBe('pause');
    expect(actionForCode('KeyM')).toBe('mute');
    expect(actionForCode('Unknown')).toBeNull();

    expect(shouldPreventGameplayDefault('ArrowDown')).toBe(true);
    expect(shouldPreventGameplayDefault('Space')).toBe(true);
    expect(shouldPreventGameplayDefault('KeyW')).toBe(false);
  });
});
