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
  p95FrameMs: number;
  sampleFrames: number;
  sampleDurationMs: number;
  collisionCount: number;
  body: BodySnapshot;
}

interface BodySnapshot {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
  blocked: { up: boolean; down: boolean; left: boolean; right: boolean };
}

interface TraceSegment {
  directions: { up: boolean; down: boolean; left: boolean; right: boolean };
  frames: number;
}

interface TraceResult {
  x: number;
  y: number;
  facing: Facing;
  frames: number;
  body: BodySnapshot;
  segmentEnds: Array<{
    position: { x: number; y: number };
    facing: Facing;
    body: BodySnapshot;
  }>;
}

type Facing = 'up' | 'down' | 'left' | 'right';

interface CollisionGeometry {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: 'wall' | 'furniture';
}

interface AcceptanceCapture {
  renderer: 'WebGL' | 'Canvas';
  viewport: { width: number; height: number };
  performance: Pick<Snapshot, 'averageFps' | 'p95FrameMs' | 'sampleFrames' | 'sampleDurationMs'>;
  traceDefinition: TraceSegment[];
  trace: TraceResult;
}

interface Phase1Api {
  snapshot: () => Snapshot;
  teleport: (x: number, y: number) => Snapshot;
  collisions: () => CollisionGeometry[];
  resetPerformanceSample: () => void;
  captureAcceptanceEvidence: () => AcceptanceCapture;
  runTrace: (
    segments: TraceSegment[],
    start?: { x: number; y: number; facing: Facing },
  ) => TraceResult;
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
  start?: { x: number; y: number; facing: Facing },
): Promise<TraceResult> =>
  page.evaluate(
    ({ trace, traceStart }) => {
      const phase1 = (window as Window & { __OLH_PHASE1__?: Phase1Api }).__OLH_PHASE1__;
      if (!phase1) throw new Error('Phase 1 development API is unavailable.');
      return traceStart ? phase1.runTrace(trace, traceStart) : phase1.runTrace(trace);
    },
    { trace: segments, traceStart: start ?? null },
  );

const collisions = (page: Page): Promise<CollisionGeometry[]> =>
  page.evaluate(() => {
    const phase1 = (window as Window & { __OLH_PHASE1__?: Phase1Api }).__OLH_PHASE1__;
    if (!phase1) throw new Error('Phase 1 development API is unavailable.');
    return phase1.collisions();
  });

const resetPerformanceSample = (page: Page): Promise<void> =>
  page.evaluate(() => {
    const phase1 = (window as Window & { __OLH_PHASE1__?: Phase1Api }).__OLH_PHASE1__;
    if (!phase1) throw new Error('Phase 1 development API is unavailable.');
    phase1.resetPerformanceSample();
  });

const captureAcceptanceEvidence = (page: Page): Promise<AcceptanceCapture> =>
  page.evaluate(() => {
    const phase1 = (window as Window & { __OLH_PHASE1__?: Phase1Api }).__OLH_PHASE1__;
    if (!phase1) throw new Error('Phase 1 development API is unavailable.');
    return phase1.captureAcceptanceEvidence();
  });

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

const directionState = (direction: Facing): TraceSegment['directions'] => ({
  ...still,
  [direction]: true,
});

interface CollisionProbe {
  start: { x: number; y: number; facing: Facing };
  contact: { x: number; y: number };
  toward: Facing;
  away: Facing;
}

const BODY_HALF_WIDTH = 6;
const BODY_HALF_HEIGHT = 5;
const PROBE_GAP = 16;

const bodyOverlaps = (position: { x: number; y: number }, rectangle: CollisionGeometry): boolean =>
  position.x + BODY_HALF_WIDTH > rectangle.x &&
  position.x - BODY_HALF_WIDTH < rectangle.x + rectangle.width &&
  position.y + BODY_HALF_HEIGHT > rectangle.y &&
  position.y - BODY_HALF_HEIGHT < rectangle.y + rectangle.height;

const sampleSpan = (minimum: number, maximum: number): number[] => {
  if (minimum > maximum) return [(minimum + maximum) / 2];
  const values = new Set<number>([minimum, maximum, (minimum + maximum) / 2]);
  for (let value = Math.ceil(minimum / 4) * 4; value <= maximum; value += 4) {
    values.add(value);
  }
  return [...values].sort(
    (left, right) =>
      Math.abs(left - (minimum + maximum) / 2) - Math.abs(right - (minimum + maximum) / 2),
  );
};

const collisionProbe = (
  target: CollisionGeometry,
  allCollisions: CollisionGeometry[],
): CollisionProbe => {
  const wall = (name: string): CollisionGeometry => {
    const result = allCollisions.find((collision) => collision.name === name);
    if (!result) throw new Error(`Required collision ${name} is missing.`);
    return result;
  };
  const west = wall('wall_west');
  const east = wall('wall_east');
  const north = wall('wall_north');
  const south = wall('wall_south');
  const playable = {
    minimumX: west.x + west.width + BODY_HALF_WIDTH,
    maximumX: east.x - BODY_HALF_WIDTH,
    minimumY: north.y + north.height + BODY_HALF_HEIGHT,
    maximumY: south.y - BODY_HALF_HEIGHT,
  };
  const horizontalSamples = sampleSpan(
    target.x + BODY_HALF_WIDTH,
    target.x + target.width - BODY_HALF_WIDTH,
  );
  const verticalSamples = sampleSpan(
    target.y + BODY_HALF_HEIGHT,
    target.y + target.height - BODY_HALF_HEIGHT,
  );
  const candidates: CollisionProbe[] = [
    ...verticalSamples.map((y) => ({
      start: { x: target.x - BODY_HALF_WIDTH - PROBE_GAP, y, facing: 'right' as const },
      contact: { x: target.x - BODY_HALF_WIDTH, y },
      toward: 'right' as const,
      away: 'left' as const,
    })),
    ...verticalSamples.map((y) => ({
      start: {
        x: target.x + target.width + BODY_HALF_WIDTH + PROBE_GAP,
        y,
        facing: 'left' as const,
      },
      contact: { x: target.x + target.width + BODY_HALF_WIDTH, y },
      toward: 'left' as const,
      away: 'right' as const,
    })),
    ...horizontalSamples.map((x) => ({
      start: { x, y: target.y - BODY_HALF_HEIGHT - PROBE_GAP, facing: 'down' as const },
      contact: { x, y: target.y - BODY_HALF_HEIGHT },
      toward: 'down' as const,
      away: 'up' as const,
    })),
    ...horizontalSamples.map((x) => ({
      start: {
        x,
        y: target.y + target.height + BODY_HALF_HEIGHT + PROBE_GAP,
        facing: 'up' as const,
      },
      contact: { x, y: target.y + target.height + BODY_HALF_HEIGHT },
      toward: 'up' as const,
      away: 'down' as const,
    })),
  ];

  const valid = candidates.find((candidate) => {
    for (const position of [candidate.start, candidate.contact]) {
      if (
        position.x < playable.minimumX ||
        position.x > playable.maximumX ||
        position.y < playable.minimumY ||
        position.y > playable.maximumY
      ) {
        return false;
      }
    }
    for (let step = 0; step <= PROBE_GAP; step += 1) {
      const ratio = step / PROBE_GAP;
      const position = {
        x: candidate.start.x + (candidate.contact.x - candidate.start.x) * ratio,
        y: candidate.start.y + (candidate.contact.y - candidate.start.y) * ratio,
      };
      if (
        allCollisions.some(
          (collision) => collision.name !== target.name && bodyOverlaps(position, collision),
        )
      ) {
        return false;
      }
    }
    return true;
  });

  if (!valid) throw new Error(`No clear runtime collision probe exists for ${target.name}.`);
  return valid;
};

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
  expect(initial.body).toMatchObject({ centerX: 320, centerY: 184 });

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

test('collides with every room wall and furniture footprint using the live Phaser body', async ({
  page,
}) => {
  await waitForGame(page);
  const collisionGeometry = await collisions(page);
  expect(collisionGeometry).toHaveLength(16);

  for (const collision of collisionGeometry) {
    const probe = collisionProbe(collision, collisionGeometry);
    const result = await runTrace(
      page,
      [
        { directions: directionState(probe.toward), frames: 20 },
        { directions: directionState(probe.away), frames: 8 },
      ],
      probe.start,
    );
    const contact = result.segmentEnds[0];
    const movedAway = result.segmentEnds[1];
    expect(contact, `${collision.name} should produce a trace contact sample`).toBeDefined();
    expect(movedAway, `${collision.name} should produce a departure sample`).toBeDefined();
    if (!contact || !movedAway) continue;

    expect(contact.position.x, `${collision.name} contact x`).toBeCloseTo(probe.contact.x, 3);
    expect(contact.position.y, `${collision.name} contact y`).toBeCloseTo(probe.contact.y, 3);
    expect(
      Math.hypot(
        movedAway.position.x - contact.position.x,
        movedAway.position.y - contact.position.y,
      ),
      `${collision.name} should allow the player to move away`,
    ).toBeGreaterThan(8);
  }
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

test('clears held input when a pointer moves focus outside gameplay', async ({ page }) => {
  await waitForGame(page);
  await page.evaluate(() => {
    const outside = document.createElement('button');
    outside.id = 'pointer-focus-target';
    outside.textContent = 'Outside game';
    document.body.append(outside);
  });

  await page.keyboard.down('d');
  await expect.poll(async () => (await snapshot(page)).velocity.x).toBeGreaterThan(90);
  await page.locator('#pointer-focus-target').click();
  await page.keyboard.up('d');

  await expect(page.getByTestId('pause-panel')).toBeVisible();
  const paused = await snapshot(page);
  expect(paused.state).toBe('Paused');
  expect(paused.velocity).toEqual({ x: 0, y: 0 });
  expect(paused.pressedActions).toEqual([]);
});

test('clears visibility and route-exit input without leaving a live runtime', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
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
  await page.waitForTimeout(100);
  expect(runtimeErrors).toEqual([]);
});

test('produces the same deterministic trace in forced WebGL and Canvas', async ({ browser }) => {
  const results = [];
  for (const renderer of ['webgl', 'canvas'] as const) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    await waitForGame(page, `/game?renderer=${renderer}`);
    const result = await runTrace(page, deterministicTrace);
    const runtime = await snapshot(page);
    expect(result.body.centerX).toBeCloseTo(result.x, 3);
    expect(result.body.centerY).toBeCloseTo(result.y, 3);
    results.push({
      renderer: runtime.renderer,
      x: result.x,
      y: result.y,
      facing: result.facing,
      frames: result.frames,
    });
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
): Promise<AcceptanceCapture> => {
  const context = await browser.newContext({ viewport: options.viewport });
  const page = await context.newPage();
  const session = await context.newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', { rate: options.throttle });
  await waitForGame(page, `/game?renderer=${options.renderer}`);
  await resetPerformanceSample(page);
  await page.waitForTimeout(2_200);
  const result = await captureAcceptanceEvidence(page);
  if (process.env.UPDATE_PHASE1_EVIDENCE === '1') {
    const evidenceDirectory = path.resolve('docs/evidence/phase1');
    await mkdir(evidenceDirectory, { recursive: true });
    await page.locator('canvas').screenshot({
      path: path.join(evidenceDirectory, options.screenshotName),
    });
  }
  await context.close();
  return result;
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

  expect(desktop.performance.averageFps).toBeGreaterThanOrEqual(55);
  expect(mobile.performance.averageFps).toBeGreaterThanOrEqual(30);
  expect(desktop.performance.sampleFrames).toBeGreaterThan(60);
  expect(mobile.performance.sampleFrames).toBeGreaterThan(60);
  expect(desktop.performance.p95FrameMs).toBeGreaterThan(0);
  expect(mobile.performance.p95FrameMs).toBeGreaterThan(0);
  expect(desktop.traceDefinition).toEqual(deterministicTrace);
  expect(mobile.traceDefinition).toEqual(deterministicTrace);
  expect(desktop.trace).toEqual(mobile.trace);

  if (process.env.UPDATE_PHASE1_EVIDENCE === '1') {
    const evidence = {
      schemaVersion: 1,
      capturedAt: new Date().toISOString(),
      traceSource: 'live Phaser Arcade Physics at fixed 60 Hz',
      thresholds: { desktopFps: 55, mobileCanvasFps: 30, rendererCoordinateTolerance: 1 },
      trace: desktop.traceDefinition,
      profiles: [
        {
          name: 'Desktop Chromium 1366×768',
          renderer: desktop.renderer,
          viewport: { width: 1366, height: 768 },
          cpuThrottle: 1,
          averageFps: desktop.performance.averageFps,
          p95FrameMs: desktop.performance.p95FrameMs,
          sampleFrames: desktop.performance.sampleFrames,
          sampleDurationMs: desktop.performance.sampleDurationMs,
          finalTrace: {
            x: desktop.trace.x,
            y: desktop.trace.y,
            facing: desktop.trace.facing,
            frames: desktop.trace.frames,
          },
          finalBody: desktop.trace.body,
        },
        {
          name: 'Mobile landscape Chromium 844×390, 4× CPU throttle',
          renderer: mobile.renderer,
          viewport: { width: 844, height: 390 },
          cpuThrottle: 4,
          averageFps: mobile.performance.averageFps,
          p95FrameMs: mobile.performance.p95FrameMs,
          sampleFrames: mobile.performance.sampleFrames,
          sampleDurationMs: mobile.performance.sampleDurationMs,
          finalTrace: {
            x: mobile.trace.x,
            y: mobile.trace.y,
            facing: mobile.trace.facing,
            frames: mobile.trace.frames,
          },
          finalBody: mobile.trace.body,
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
