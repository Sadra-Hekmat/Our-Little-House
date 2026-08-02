import {
  actionForCode,
  InputState,
  shouldPreventGameplayDefault,
  type InputAction,
} from '@game/systems/input-state';

interface KeyboardInputOptions {
  target: HTMLElement;
  onEdgeAction: (action: InputAction) => void;
  onLifecycleLoss: (reason: 'blur' | 'hidden' | 'focus-loss' | 'pointer-focus-loss') => void;
}

export class KeyboardInputController {
  public readonly state = new InputState();

  private readonly target: HTMLElement;
  private readonly onEdgeAction: KeyboardInputOptions['onEdgeAction'];
  private readonly onLifecycleLoss: KeyboardInputOptions['onLifecycleLoss'];
  private destroyed = false;

  public constructor(options: KeyboardInputOptions) {
    this.target = options.target;
    this.onEdgeAction = options.onEdgeAction;
    this.onLifecycleLoss = options.onLifecycleLoss;

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    document.addEventListener('pointerdown', this.handleDocumentPointerDown, true);
    this.target.addEventListener('focusout', this.handleFocusOut);
  }

  public clear(): void {
    this.state.clear();
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.clear();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    document.removeEventListener('pointerdown', this.handleDocumentPointerDown, true);
    this.target.removeEventListener('focusout', this.handleFocusOut);
  }

  private get active(): boolean {
    const focused = document.activeElement;
    return focused === this.target || (focused instanceof Node && this.target.contains(focused));
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.active) return;
    const action = actionForCode(event.code);
    if (!action) return;
    if (shouldPreventGameplayDefault(event.code)) event.preventDefault();

    const result = this.state.press(event.code);
    if (result.firstPress && ['interact', 'pause', 'mute'].includes(action)) {
      this.onEdgeAction(action);
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.state.release(event.code);
    if (this.active && shouldPreventGameplayDefault(event.code)) event.preventDefault();
  };

  private loseLifecycle(
    reason: Parameters<KeyboardInputOptions['onLifecycleLoss']>[0],
    force = false,
  ): void {
    const hadActions = this.state.pressedActions.length > 0;
    this.clear();
    if (force || this.active || hadActions) this.onLifecycleLoss(reason);
  }

  private readonly handleBlur = (): void => this.loseLifecycle('blur');

  private readonly handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') this.loseLifecycle('hidden');
  };

  private readonly handleDocumentPointerDown = (event: PointerEvent): void => {
    if (!this.active) return;
    const target = event.target;
    if (target instanceof Node && !this.target.contains(target)) {
      this.loseLifecycle('pointer-focus-loss');
    }
  };

  private readonly handleFocusOut = (): void => {
    queueMicrotask(() => {
      if (!this.destroyed && !this.active) this.loseLifecycle('focus-loss', true);
    });
  };
}
