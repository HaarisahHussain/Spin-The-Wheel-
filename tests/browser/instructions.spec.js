import { test, expect } from '@playwright/test';
test('all game instructions fit the display and let players read before explicitly starting', async ({
  page,
}) => {
  await page.request.post('/__test/reset');
  for (const gameId of ['debug', 'output', 'robot', 'parcel', 'painter']) {
    await page.request.post('/__test/scene', { data: { gameId, introduction: true } });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/display/play');
    await expect(page.getByText('Worked example · no score')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/instructions-${gameId}.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Start game', exact: true })).toBeVisible();
    await expect(page.getByText(/Ready within|Starts in/)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole('button', { name: 'Start game', exact: true }).click();
    await expect(page.getByText(/Question 1|Board 1/)).toBeVisible({ timeout: 6000 });
  }
});
test('host has an explicit Start game button during instructions', async ({ page }) => {
  await page.request.post('/__test/reset');
  await page.request.post('/__test/scene', { data: { gameId: 'robot', introduction: true } });
  await page.goto('/host');
  await page.getByLabel('Password', { exact: true }).fill('browser test passphrase');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Start game', exact: true }).click();
  await expect(page.getByText('Solo · Starting', { exact: true })).toBeVisible();
});
