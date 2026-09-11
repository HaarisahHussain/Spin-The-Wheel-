import { test, expect } from '@playwright/test';
import { totp } from '../../server/security.js';
test('both displays fit and do not expose private host data', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/display/join');
  await expect(page.getByRole('heading', { name: 'Ranked leaderboard' })).toBeVisible();
  await expect(page.locator('svg')).toBeVisible();
  await expect(page.getByText('Reconnecting · standings may be outdated')).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/join-display.png' });
  await page.goto('/display/play');
  await expect(page.getByRole('heading', { name: 'Ready to play.' })).toBeVisible();
  await page.screenshot({ path: 'test-results/play-display.png' });
  expect(errors).toEqual([]);
});
test('all three controllers render, submit and fit the gameplay display', async ({
  page,
  browser,
}) => {
  const display = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const gameId of ['debug', 'output', 'robot']) {
    await page.request.post('/__test/scene', { data: { gameId } });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await display.goto('/display/play');
    await expect(page.getByText('Reconnecting… showing the last update.')).not.toBeVisible();
    if (gameId === 'robot') {
      await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeVisible();
      await page.screenshot({ path: 'test-results/phone-robot.png' });
      await page.getByRole('button', { name: 'right', exact: true }).click();
      await page.getByRole('button', { name: 'Run', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeDisabled();
    } else {
      await expect(page.getByRole('button', { name: 'Submit', exact: true })).toBeVisible();
      await page.screenshot({ path: `test-results/phone-${gameId}.png` });
      if (gameId === 'debug')
        await page.getByRole('button', { name: 'Line 1', exact: true }).click();
      else await page.locator('button[aria-pressed]').first().click();
      await page.getByRole('button', { name: 'Submit', exact: true }).click();
      await expect(page.getByText('Question 2 / 9', { exact: true })).toBeVisible();
    }
    expect(await display.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
      true,
    );
    await display.screenshot({ path: `test-results/display-${gameId}.png` });
  }
  await page.request.post('/__test/clear');
  await display.close();
});
test('phone registration, browser-bound verification and persistent queue', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByLabel('BCU email').fill('browser-player@mail.bcu.ac.uk');
  await page.getByLabel('Course', { exact: true }).fill('Computer Science');
  await page.getByLabel('Academic level').selectOption('Year 1');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  if (await page.getByRole('button', { name: 'I’ve saved it' }).isVisible())
    await page.getByRole('button', { name: 'I’ve saved it' }).click();
  await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible();
  await page.getByRole('button', { name: 'Send verification email', exact: true }).click();
  let mail;
  await expect
    .poll(async () => {
      mail = await (await page.request.get('/api/development-mail')).json();
      return !!mail.code;
    })
    .toBe(true);
  await page.getByLabel('Six-digit code').fill(mail.code);
  await page.getByRole('button', { name: 'Verify', exact: true }).click();
  await page.getByRole('button', { name: 'I’ve saved it' }).click();
  await page.getByRole('button', { name: 'Enqueue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'You’re in the queue.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'You’re in the queue.' })).toBeVisible();
  await page.screenshot({ path: 'test-results/phone-queue.png' });
  await page.getByRole('button', { name: 'Leave queue' }).click();
  await page.getByRole('button', { name: 'leaderboard', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ranked standings' })).toBeVisible();
});
test('host MFA login and verification switch updates the phone policy', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/host');
  await page.getByLabel('Username').fill('host');
  await page.getByLabel('Password', { exact: true }).fill('browser-test-password');
  await page.getByLabel('Authenticator code').fill(totp('JBSWY3DPEHPK3PXP').generate());
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Call next player' })).toBeVisible();
  await page.getByRole('button', { name: 'event', exact: true }).click();
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('switch').click();
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  await page.reload();
  await page.getByRole('button', { name: 'event', exact: true }).click();
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  await page.screenshot({ path: 'test-results/host-settings.png' });
});
