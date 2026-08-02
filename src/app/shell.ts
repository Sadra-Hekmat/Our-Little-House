import content from '@content/locales/en.json';
import { GameOwner, type GameFailure } from '@game/runtime/game-owner';

import { Router, type AppRoute } from './router';

const createElement = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: { className?: string; text?: string } = {},
): HTMLElementTagNameMap[K] => {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.text) element.textContent = options.text;
  return element;
};

export const startShell = (root: HTMLDivElement): (() => void) => {
  const router = new Router();
  const gameOwner = new GameOwner();

  const renderStart = (): void => {
    gameOwner.destroy();
    document.title = content.gameTitle;

    const page = createElement('main', { className: 'page' });
    const card = createElement('section', { className: 'start-card' });
    card.setAttribute('aria-labelledby', 'game-title');

    const eyebrow = createElement('p', { className: 'eyebrow', text: 'A remembered place' });
    const title = createElement('h1', { text: content.gameTitle });
    title.id = 'game-title';
    const subtitle = createElement('p', { className: 'subtitle', text: content.subtitle });

    const play = createElement('button', { className: 'primary-button', text: 'Play Game' });
    play.type = 'button';
    play.addEventListener('click', () => router.navigate('/game'));

    const controls = createElement('p', {
      className: 'controls-summary',
      text: 'Controls: Arrow keys or WASD to move · Enter, Space, or Escape to close memories',
    });

    card.append(eyebrow, title, subtitle, play, controls);
    page.append(card);
    root.replaceChildren(page);
  };

  const renderGame = (): void => {
    gameOwner.destroy();
    document.title = `${content.gameTitle} — Home`;

    const page = createElement('main', { className: 'game-page' });
    const header = createElement('header', { className: 'game-header' });
    const homeButton = createElement('button', { className: 'quiet-button', text: '← Start' });
    homeButton.type = 'button';
    homeButton.addEventListener('click', () => router.navigate('/'));
    header.append(homeButton, createElement('strong', { text: content.gameTitle }));

    const stage = createElement('section', { className: 'game-stage' });
    stage.setAttribute('aria-label', 'Our Little House game');
    const container = createElement('div', { className: 'game-container' });
    container.id = 'game-container';
    container.tabIndex = 0;

    const diagnostics = createElement('output', { className: 'diagnostics' });
    diagnostics.hidden = true;
    diagnostics.dataset.testid = 'renderer-diagnostics';

    const error = createElement('section', { className: 'error-panel' });
    error.hidden = true;
    error.setAttribute('role', 'alert');
    error.setAttribute('aria-live', 'assertive');
    error.dataset.testid = 'renderer-error';

    const showFailure = (failure: GameFailure): void => {
      container.hidden = true;
      diagnostics.hidden = true;
      error.replaceChildren();
      const title = createElement('h2', { text: 'The room could not open' });
      const message = createElement('p', { text: failure.userMessage });
      const actions = createElement('div', { className: 'error-actions' });
      const retry = createElement('button', { className: 'primary-button', text: 'Retry' });
      retry.type = 'button';
      retry.addEventListener('click', () => {
        if (import.meta.env.DEV) {
          const url = new URL(window.location.href);
          url.searchParams.delete('failRenderer');
          window.history.replaceState({}, '', `${url.pathname}${url.search}`);
        }
        container.hidden = false;
        error.hidden = true;
        gameOwner.mount(container, showReady, showFailure);
      });
      const returnButton = createElement('button', {
        className: 'quiet-button',
        text: 'Return to Start',
      });
      returnButton.type = 'button';
      returnButton.addEventListener('click', () => router.navigate('/'));
      actions.append(retry, returnButton);
      error.append(title, message, actions);
      error.hidden = false;
      retry.focus();
    };

    const showReady = (renderer: string): void => {
      container.dataset.ready = 'true';
      container.focus({ preventScroll: true });
      if (import.meta.env.DEV) {
        diagnostics.textContent = `Renderer: ${renderer}`;
        diagnostics.hidden = false;
      }
    };

    stage.append(container, diagnostics, error);
    page.append(header, stage);
    root.replaceChildren(page);
    gameOwner.mount(container, showReady, showFailure);
  };

  const render = (route: AppRoute): void => {
    try {
      if (route === '/game') renderGame();
      else renderStart();
    } catch {
      gameOwner.destroy();
      const fallback = createElement('main', { className: 'page' });
      const panel = createElement('section', { className: 'error-panel' });
      panel.setAttribute('role', 'alert');
      panel.append(createElement('h1', { text: 'Our Little House' }));
      panel.append(
        createElement('p', { text: 'The page could not open. Please reload and try again.' }),
      );
      fallback.append(panel);
      root.replaceChildren(fallback);
    }
  };

  const unsubscribe = router.subscribe(render);

  return () => {
    unsubscribe();
    gameOwner.destroy();
    router.destroy();
  };
};
