import { test, expect } from '@playwright/test';
test('Play wheel fits and sound requires opt-in, responds to outcomes and mutes immediately', async ({
  page,
}) => {
  await page.request.post('/__test/reset');
  await page.addInitScript(() => {
    window.audioVoices = 0;
    const original = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function (...args) {
      window.audioVoices++;
      return original.apply(this, args);
    };
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/display/play');
  const enable = page.getByRole('button', { name: 'Enable sound' });
  await expect(enable).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
    true,
  );
  expect(await page.evaluate(() => window.audioVoices)).toBe(0);
  await enable.click();
  await expect(page.getByRole('button', { name: 'Mute sound' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.request.post('/__test/scene', { data: { gameId: 'robot', wheel: true } });
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  const wheel = page.getByRole('img', { name: 'Selecting game' });
  await expect(wheel).toBeVisible();
  const box = await wheel.boundingBox();
  expect(box.width).toBeGreaterThan(440);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
    true,
  );
  await expect.poll(() => page.evaluate(() => window.audioVoices)).toBeGreaterThan(3);
  await page.screenshot({ path: '/workspace/scratch/7be988bdca93/work/v120-wheel.png' });
  const before = await page.evaluate(() => window.audioVoices);
  await page.request.post('/__test/scene', { data: { gameId: 'debug', feedback: true } });
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect.poll(() => page.evaluate(() => window.audioVoices)).toBeGreaterThan(before);
  await page.getByRole('button', { name: 'Mute sound' }).click();
  const muted = await page.evaluate(() => window.audioVoices);
  await page.request.post('/__test/scene', { data: { wheel: true } });
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(wheel).toBeVisible();
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => window.audioVoices)).toBe(muted);
  await page.reload();
  await expect(enable).toBeVisible();
  expect(await page.evaluate(() => window.audioVoices)).toBe(0);
  await page.goto('/display/join');
  await expect(enable).toHaveCount(0);
});
