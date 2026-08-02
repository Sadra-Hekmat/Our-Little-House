import { describe, expect, it, vi } from 'vitest';

import { StateController } from '@game/state/state-controller';

describe('StateController', () => {
  it('follows the boot-to-playing path and gives movement to Playing only', () => {
    const controller = new StateController();
    expect(controller.state).toBe('Boot');
    expect(controller.acceptsMovement).toBe(false);

    controller.transition('Preload');
    controller.transition('Title');
    controller.transition('Playing');

    expect(controller.state).toBe('Playing');
    expect(controller.acceptsMovement).toBe(true);
  });

  it('supports dialogue and pause without allowing movement ownership', () => {
    const controller = new StateController();
    controller.transition('Preload');
    controller.transition('Title');
    controller.transition('Playing');
    controller.transition('DialogueOpen');

    expect(controller.acceptsMovement).toBe(false);
    controller.transition('Paused');
    expect(controller.acceptsMovement).toBe(false);
    controller.transition('Playing');
    expect(controller.acceptsMovement).toBe(true);
  });

  it('rejects impossible transitions without notifying subscribers', () => {
    const controller = new StateController();
    const listener = vi.fn();
    controller.subscribe(listener);

    expect(() => controller.transition('Playing')).toThrow('Boot → Playing');
    expect(controller.state).toBe('Boot');
    expect(listener).not.toHaveBeenCalled();
  });

  it('notifies subscribers and supports deterministic unsubscribe', () => {
    const controller = new StateController();
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);
    controller.transition('Preload');
    unsubscribe();
    controller.transition('Title');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('Preload');
  });
});
