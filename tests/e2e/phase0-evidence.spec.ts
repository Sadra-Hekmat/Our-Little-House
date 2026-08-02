import path from 'node:path';

import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';

const evidenceDirectory = path.resolve('docs/evidence/phase0');

for (const renderer of ['webgl', 'canvas'] as const) {
  test(`captures a nonblank first-visible-frame for ${renderer}`, async ({ page }) => {
    await page.goto(`/game?renderer=${renderer}`);
    const container = page.locator('#game-container[data-ready="true"]');
    await expect(container).toBeVisible();
    await expect(page.getByTestId('renderer-diagnostics')).toContainText(
      renderer === 'webgl' ? 'WebGL' : 'Canvas',
    );

    const screenshot = await page.locator('canvas').screenshot({
      path: path.join(evidenceDirectory, `${renderer}-first-frame.png`),
    });
    const png = PNG.sync.read(screenshot);
    const colors = new Set<string>();
    for (let offset = 0; offset < png.data.length; offset += 4) {
      const alpha = png.data[offset + 3];
      if (alpha === 0) continue;
      colors.add(`${png.data[offset]}:${png.data[offset + 1]}:${png.data[offset + 2]}`);
      if (colors.size > 8) break;
    }

    expect(
      colors.size,
      'the first canvas frame should contain visible room colors',
    ).toBeGreaterThan(8);
  });
}

for (const route of ['/', '/game', '/game?renderer=webgl', '/game?renderer=canvas']) {
  test(`loads ${route} in a cache-empty browser context`, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const response = await page.goto(route);
    expect(response?.ok()).toBe(true);
    if (route === '/') await expect(page.getByRole('button', { name: 'Play Game' })).toBeVisible();
    else await expect(page.locator('#game-container[data-ready="true"]')).toBeVisible();
    await context.close();
  });
}
