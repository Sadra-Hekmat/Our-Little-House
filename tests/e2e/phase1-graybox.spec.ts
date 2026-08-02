import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { expect, test, type Browser, type Page } from '@playwright/test';

interface Snapshot {
  renderer: 'WebGL' | 'Canvas';
  state: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  facing: string;
  animation: string | null;
  pressedActions: string[];
  playerDepth: number;
  tallCabinetDepth: number;
  behindTallCabinet: boolean;
  averageFps: number;
  collisionCount: number;
}

interface TraceSegment {
  directions: { up: boolean; down: boolean; left: boolean; right: boolean };
  frames: number;
}

interface Phase1Api {
  snapshot: () => Snapshot;
  teleport: (x: number, y: number) => Snapshot;
  runTrace: (segments: TraceSegment[]) => { x: number; y: number; facing: string; frames: number };
}

const snapshot = (page: Page): Promise<Snapshot> =>
  page.evaluate(() => {
    const phase1 = (window as Window & { __OLH_PHASE1__?: Phase1Api }).__OLH_PHASE1__;
    if (!phase1) throw new Error('Phase 1 development API is unavailable.');
    return phase1.snapshot();
  });

const teleport = (page: Page, x: number, y: number): Promise<Snapshot> =>
  page.evaluate(
    ({ targetX, targetY }) => {
      const phase1 = (window as Window & { __OLH_PHASE1__?: Phase1Api }).__OLH_PHASE1__;
      if (!phase1) throw new Error('Phase 1 development API is unavailable.');
      return phase1.teleport(targetX, targetY);
    },
    { targetX: x, targetY: y },
  );

const runTrace = (
  page: Page,
  segments: TraceSegment[],
): Promise<{ x: number; y: number; facing: string; frames: number }> =>
  page.evaluate((trace) => {
    const phase1 = (window as Window & { __OLH_PHASE1__?: Phase1Api }).__OLH_PHASE1__;
    if (!phase1) throw new Error('Phase 1 development API is unavailable.');
    return phase1.runTrace(trace);
  }, segments);

const hasApi = (page: Page): Promise<boolean> =>
  page.evaluate(() => Boolean((window as Window & { __OLH_PHASE1__?: Phase1Api }).__OLH_PHASE1__));

const waitForGame = async (page: Page, route = '/game'): Promise<void> => {
  await page.goto(route);
  await expect(page.locator('#game-container[data-ready="true"]')).toBeVisible();
  await expect.poll(() => hasApi(page)).toBe(true);
};

const still = { up: false, down: false, left: false, right: false };
const deterministicTrace: TraceSegment[] = [
  { directions: { ...still, right: true }, frames: 120 },
  { directions: { ...still, down: true }, frames: 60 },
  { directions: { ...still, left: true }, frames: 60 },
  { directions: { ...still, down: true }, frames: 30 },
];

test.describe.configure({ mode: 'serial' });

test('spawns centrally, moves with keyboard input, and prevents scrolling only while focused', async ({
  page,
}) => {
  await waitForGame(page);
  const initial = await snapshot(page);
  expect(initial).toMatchObject({
    state: 'Playing',
    position: { x: 320, y: 184 },
    facing: 'down',
    collisionCount: 16,
  });

  await page.keyboard.down('d');
  await expect.poll(async () => (await snapshot(page)).animation).toBe('player.walk.right');
  const moving = await snapshot(page);
  expect(moving.velocity.x).toBeGreaterThan(90);
  expect(moving.velocity.y).toBe(0);
  await page.waitForTimeout(180);
  await page.keyboard.up('d');

  const moved = await snapshot(page);
  expect(moved.position.x).toBeGreaterThan(initial.position.x + 8);
  expect(moved.position.y).toBeCloseTo(initial.position.y, 0);
  expect(moved.facing).toBe('right');

  await page.evaluate(() => {
    document.body.style.minHeight = '200vh';
    window.scrollTo(0, 0);
  });
  await page.locator('#game-container').focus();
  await page.keyboard.press('ArrowDown');
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  await page.evaluate(() => {
    const outside = document.createElement('button');
    outside.id = 'outside-game-focus';
    outside.textContent = 'Outside game';
    document.body.append(outside);
    outside.focus();
  });
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect(page.getByTestId('pause-panel')).toBeVisible();
});

test('collides with room walls and furniture footprints', async ({ page }) => {
  await waitForGame(page);

  await teleport(page, 56, 184);
  await page.locator('#game-container').focus();
  await page.keyboard.down('a');
  await page.waitForTimeout(350);
  await page.keyboard.up('a');
  expect((await snapshot(page)).position.x).toBeGreaterThanOrEqual(53);

  await teleport(page, 410, 128);
  await page.locator('#game-container').focus();
  await page.keyboard.down('d');
  await page.waitForTimeout(350);
  await page.keyboard.up('d');
  expect((await snapshot(page)).position.x).toBeLessThanOrEqual(419);
});

test('resolves tall-furniture depth from feet position', async ({ page }) => {
  await waitForGame(page);

  const behind = await teleport(page, 452, 100);
  expect(behind.behindTallCabinet).toBe(true);
  expect(behind.playerDepth).toBeLessThan(behind.tallCabinetDepth);

  const inFront = await teleport(page, 452, 160);
  expect(inFront.behindTallCabinet).toBe(false);
  expect(inFront.playerDepth).toBeGreaterThan(inFront.tallCabinetDepth);
});

test('pauses, resumes, restarts, and clears input through lifecycle loss', async ({ page }) => {
  await waitForGame(page);
  await page.keyboard.down('d');
  await page.waitForTimeout(120);
  await page.keyboard.press('Escape');
  await page.keyboard.up('d');

  await expect(page.getByTestId('pause-panel')).toBeVisible();
  const paused = await snapshot(page);
  expect(paused.state).toBe('Paused');
  expect(paused.velocity).toEqual({ x: 0, y: 0 });
  expect(paused.pressedActions).toEqual([]);
  await page.waitForTimeout(150);
  expect((await snapshot(page)).position).toEqual(paused.position);

  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByTestId('pause-panel')).toBeHidden();
  expect((await snapshot(page)).state).toBe('Playing');

  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByTestId('pause-panel')).toBeVisible();
  expect((await snapshot(page)).state).toBe('Paused');

  await page.getByRole('button', { name: 'Restart' }).click();
  await expect(page.getByTestId('pause-panel')).toBeHidden();
  expect(await snapshot(page)).toMatchObject({
    state: 'Playing',
    position: { x: 320, y: 184 },
    velocity: { x: 0, y: 0 },
    pressedActions: [],
  });
});

test('clears visibility and route-exit input without leaving a live runtime', async ({ page }) => {
  await waitForGame(page);
  await page.keyboard.down('w');
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.keyboard.up('w');
  await expect(page.getByTestId('pause-panel')).toBeVisible();
  expect((await snapshot(page)).pressedActions).toEqual([]);

  await page.getByRole('button', { name: 'Return to Start' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: 'Play Game' })).toBeVisible();
  expect(await hasApi(page)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.__OLH_DEV__?.activeGames)).toBe(0);
});

test('produces the same deterministic trace in forced WebGL and Canvas', async ({ browser }) => {
  const results = [];
  for (const renderer of ['webgl', 'canvas'] as const) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    await waitForGame(page, `/game?renderer=${renderer}`);
    const result = await runTrace(page, deterministicTrace);
    const runtime = await snapshot(page);
    results.push({ renderer: runtime.renderer, ...result });
    await context.close();
  }

  expect(results).toEqual([
    { renderer: 'WebGL', x: 370, y: 307, facing: 'down', frames: 270 },
    { renderer: 'Canvas', x: 370, y: 307, facing: 'down', frames: 270 },
  ]);
});

const measureProfile = async (
  browser: Browser,
  options: {
    renderer: 'webgl' | 'canvas';
    viewport: { width: number; height: number };
    throttle: number;
    screenshotName: string;
  },
): Promise<{ snapshot: Snapshot; trace: Awaited<ReturnType<typeof runTrace>> }> => {
  const context = await browser.newContext({ viewport: options.viewport });
  const page = await context.newPage();
  const session = await context.newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', { rate: options.throttle });
  await waitForGame(page, `/game?renderer=${options.renderer}`);
  await page.waitForTimeout(2_200);
  const result = await snapshot(page);
  const trace = await runTrace(page, deterministicTrace);
  if (process.env.UPDATE_PHASE1_EVIDENCE === '1') {
    const evidenceDirectory = path.resolve('docs/evidence/phase1');
    await mkdir(evidenceDirectory, { recursive: true });
    await page.locator('canvas').screenshot({
      path: path.join(evidenceDirectory, options.screenshotName),
    });
  }
  await context.close();
  return { snapshot: result, trace };
};

test('meets desktop and throttled mobile-profile renderer baselines', async ({ browser }) => {
  const desktop = await measureProfile(browser, {
    renderer: 'webgl',
    viewport: { width: 1366, height: 768 },
    throttle: 1,
    screenshotName: 'desktop-webgl-graybox.png',
  });
  const mobile = await measureProfile(browser, {
    renderer: 'canvas',
    viewport: { width: 844, height: 390 },
    throttle: 4,
    screenshotName: 'mobile-canvas-graybox.png',
  });

  expect(desktop.snapshot.averageFps).toBeGreaterThanOrEqual(55);
  expect(mobile.snapshot.averageFps).toBeGreaterThanOrEqual(30);
  expect(desktop.trace).toEqual(mobile.trace);

  if (process.env.UPDATE_PHASE1_EVIDENCE === '1') {
    const evidence = {
      schemaVersion: 1,
      capturedAt: new Date().toISOString(),
      thresholds: { desktopFps: 55, mobileCanvasFps: 30, rendererCoordinateTolerance: 1 },
      trace: deterministicTrace,
      profiles: [
        {
          name: 'Desktop Chromium 1366×768',
          renderer: desktop.snapshot.renderer,
          viewport: { width: 1366, height: 768 },
          cpuThrottle: 1,
          averageFps: desktop.snapshot.averageFps,
          finalTrace: desktop.trace,
        },
        {
          name: 'Mobile landscape Chromium 844×390, 4× CPU throttle',
          renderer: mobile.snapshot.renderer,
          viewport: { width: 844, height: 390 },
          cpuThrottle: 4,
          averageFps: mobile.snapshot.averageFps,
          finalTrace: mobile.trace,
        },
      ],
    };
    const evidenceDirectory = path.resolve('docs/evidence/phase1');
    await mkdir(evidenceDirectory, { recursive: true });
    await writeFile(
      path.join(evidenceDirectory, 'renderer-baselines.json'),
      `${JSON.stringify(evidence, null, 2)}\n`,
      'utf8',
    );
  }
});
