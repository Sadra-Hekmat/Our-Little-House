import { expect, test } from '@playwright/test';

test('shows the semantic title screen and starts with keyboard activation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Our Little House' })).toBeVisible();
  await expect(page.getByText('{{SUBTITLE_TO_BE_PROVIDED}}')).toBeVisible();
  await expect(page.getByText(/Arrow keys or WASD/)).toBeVisible();

  const play = page.getByRole('button', { name: 'Play Game' });
  await play.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/game$/);
  await expect(page.locator('#game-container[data-ready="true"]')).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
});

test('supports direct game navigation and history return', async ({ page }) => {
  await page.goto('/game');
  await expect(page.locator('#game-container[data-ready="true"]')).toBeVisible();
  await page.getByRole('button', { name: '← Start' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: 'Play Game' })).toBeVisible();
});

for (const renderer of ['webgl', 'canvas'] as const) {
  test(`forces a visible ${renderer} frame in development`, async ({ page }) => {
    await page.goto(`/game?renderer=${renderer}`);
    await expect(page.locator('#game-container[data-ready="true"]')).toBeVisible();
    await expect(page.getByTestId('renderer-diagnostics')).toContainText(
      renderer === 'webgl' ? 'WebGL' : 'Canvas',
    );
    const box = await page.locator('canvas').boundingBox();
    expect(box?.width).toBeGreaterThan(300);
    expect(box?.height).toBeGreaterThan(160);
  });
}

test('shows a DOM recovery panel after an injected renderer failure', async ({ page }) => {
  await page.goto('/game?failRenderer=1');
  const error = page.getByTestId('renderer-error');
  await expect(error).toBeVisible();
  await expect(error).toContainText('could not create the game canvas');

  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page).toHaveURL(/\/game$/);
  await expect(page.locator('#game-container[data-ready="true"]')).toBeVisible();
});

test('keeps one game and one owned listener set through repeated lifecycle changes', async ({
  page,
}) => {
  await page.goto('/game?failRenderer=1');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.locator('#game-container[data-ready="true"]')).toBeVisible();

  for (let visit = 0; visit < 3; visit += 1) {
    await expect
      .poll(() =>
        page.evaluate(() => ({
          activeGames: window.__OLH_DEV__?.activeGames,
          inputSubscriptions: window.__OLH_DEV__?.inputSubscriptions,
          resizeListeners: window.__OLH_DEV__?.resizeListeners,
        })),
      )
      .toEqual({ activeGames: 1, inputSubscriptions: 1, resizeListeners: 1 });

    await page.getByRole('button', { name: '← Start' }).click();
    await expect(page.getByRole('button', { name: 'Play Game' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__OLH_DEV__?.activeGames)).toBe(0);
    await page.getByRole('button', { name: 'Play Game' }).click();
    await expect(page.locator('#game-container[data-ready="true"]')).toBeVisible();
  }
});
