export type AppRoute = '/' | '/game';

const normalizeRoute = (pathname: string): AppRoute => (pathname === '/game' ? '/game' : '/');

export class Router {
  private readonly listeners = new Set<(route: AppRoute) => void>();
  private readonly onPopState = (): void => this.emit();

  public constructor() {
    window.addEventListener('popstate', this.onPopState);
  }

  public get route(): AppRoute {
    return normalizeRoute(window.location.pathname);
  }

  public navigate(route: AppRoute, options: { replace?: boolean } = {}): void {
    if (this.route === route) {
      this.emit();
      return;
    }

    const method = options.replace ? 'replaceState' : 'pushState';
    window.history[method]({}, '', route);
    this.emit();
  }

  public subscribe(listener: (route: AppRoute) => void): () => void {
    this.listeners.add(listener);
    listener(this.route);
    return () => this.listeners.delete(listener);
  }

  public destroy(): void {
    window.removeEventListener('popstate', this.onPopState);
    this.listeners.clear();
  }

  private emit(): void {
    const route = this.route;
    this.listeners.forEach((listener) => listener(route));
  }
}
