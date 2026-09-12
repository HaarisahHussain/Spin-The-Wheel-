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
      await expect(page.getByRole('button', { name: 'Run from start', exact: true })).toBeVisible();
      await page.screenshot({ path: 'test-results/phone-robot.png' });
      await page.getByRole('button', { name: 'right', exact: true }).click();
      await page.getByRole('button', { name: 'Run from start', exact: true }).click();
      await expect(page.getByText(/Blocked at move|Program ended before the goal/)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Run from start', exact: true })).toBeEnabled();
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
  await expect(page.getByRole('switch', { name: 'Require email verification' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.getByRole('switch', { name: 'Require email verification' }).click();
  await expect(page.getByRole('switch', { name: 'Require email verification' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await expect
    .poll(
      async () => (await (await page.request.get('/api/state')).json()).config.requireVerification,
    )
    .toBe(false);
  await page.reload();
  await page.getByRole('button', { name: 'event', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Require email verification' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await page.getByRole('switch', { name: 'Ranked play', exact: true }).check();
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await expect
    .poll(async () => (await (await page.request.get('/api/state')).json()).config.rankedEnabled)
    .toBe(true);
  await page.screenshot({ path: 'test-results/host-settings.png' });
});

test('wrapped Python retains logical answer lines and fits small phones and 720p', async ({
  page,
  browser,
}) => {
  const display = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  for (const gameId of ['debug', 'output']) {
    for (const width of [320, 360, 390]) {
      await page.request.post('/__test/scene', { data: { gameId, level: width === 390 ? 8 : 7 } });
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await display.goto('/display/play');
      expect(
        await display.evaluate(() => document.documentElement.scrollHeight <= innerHeight),
      ).toBe(true);
      if (gameId === 'debug')
        await page.getByRole('button', { name: 'Line 1', exact: true }).click();
      else await page.locator('button[aria-pressed]').first().click();
      await page.getByRole('button', { name: 'Submit', exact: true }).click();
      await expect(
        display.getByRole('status').filter({ hasText: /Correct|Incorrect/ }),
      ).toBeVisible();
      expect(
        await display.evaluate(() => document.documentElement.scrollHeight <= innerHeight),
      ).toBe(true);
      if (width === 390)
        await display.screenshot({ path: `test-results/feedback-${gameId}-720p.png` });
    }
  }
  const code = 'value = "' + 'x'.repeat(160) + '"\nprint(value)';
  await page.request.post('/__test/scene', { data: { gameId: 'debug', code } });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const line = page.getByRole('button', { name: 'Line 1', exact: true });
  expect((await line.boundingBox()).height).toBeGreaterThan(44);
  await line.click();
  await expect(line).toHaveAttribute('aria-pressed', 'true');
  const copied = await line.evaluate((element) => {
    const event = new Event('copy', { bubbles: true, cancelable: true });
    let result;
    Object.defineProperty(event, 'clipboardData', {
      value: {
        setData: (_type, value) => {
          result = value;
        },
      },
    });
    element.dispatchEvent(event);
    return result;
  });
  expect(copied).toBe(code);
  await display.close();
  await page.request.post('/__test/clear');
});

test('robot controls stay fixed when the sequence wraps and edited programs survive retry', async ({
  page,
}) => {
  await page.request.post('/__test/scene', { data: { gameId: 'robot' } });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/');
  const right = page.getByRole('button', { name: 'right', exact: true });
  const before = await right.boundingBox();
  const up = await page.getByRole('button', { name: 'up', exact: true }).boundingBox();
  const down = await page.getByRole('button', { name: 'down', exact: true }).boundingBox();
  expect(up.x).toBe(down.x);
  expect(up.y).toBeLessThan(down.y);
  expect(before.y).toBe(down.y);
  expect(before.height).toBeGreaterThanOrEqual(44);
  for (let i = 0; i < 14; i++) await right.click();
  const after = await right.boundingBox();
  expect(after.y).toBe(before.y);
  expect(after.x).toBe(before.x);
  const sequence = page.getByLabel('Program', { exact: true });
  expect(await sequence.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(true);
  expect(await sequence.evaluate((e) => e.getBoundingClientRect().bottom <= innerHeight)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/robot-compact-phone.png' });
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await right.click();
  await page.getByRole('button', { name: 'Run from start', exact: true }).click();
  await expect(page.getByText(/Blocked at move|Program ended before the goal/)).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Move 1: right. Select to replace.', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Move 1: right. Select to replace.', exact: true })
    .click();
  await page.getByRole('button', { name: 'down', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Move 1: down. Select to replace.', exact: true }),
  ).toBeVisible();
  await page.request.post('/__test/clear');
});

test('actual wheel has ten slots and reconnect restores the same selected outcome', async ({
  page,
}) => {
  await page.request.post('/__test/scene', { data: { gameId: 'debug', wheel: true } });
  await page.goto('/display/play');
  await expect(page.locator('[data-wheel-slot]')).toHaveCount(10);
  await expect(page.getByText('Equal chance per game')).toBeVisible();
  const before = (await (await page.request.get('/api/state')).json()).active.selection;
  await page.reload();
  const after = (await (await page.request.get('/api/state')).json()).active.selection;
  expect(after).toEqual(before);
  await page.request.post('/__test/clear');
});

test('live phone locks answers without revealing correctness; reveal reaches both screens', async ({
  page,
  browser,
}) => {
  await page.request.post('/__test/scene', { data: { gameId: 'output', live: true } });
  const display = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('/');
  await display.goto('/display/play');
  await page.locator('button[aria-pressed]').first().click();
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByText('Answer locked', { exact: true })).toBeVisible();
  await expect(page.getByText('Correct answer', { exact: true })).not.toBeVisible();
  const state = await (await page.request.get('/api/state')).json();
  expect(state.live.question.answer).toBeUndefined();
  await page.request.post('/__test/close-live');
  await expect(display.getByText('Correct answer', { exact: true })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: /Correct|Incorrect/ })).toBeVisible();
  expect(await display.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
    true,
  );
  await display.close();
  await page.request.post('/__test/clear');
});

test('idle display respects reduced motion and shows ten sectors without a selection result', async ({
  page,
}) => {
  await page.request.post('/__test/clear');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/display/play');
  await expect(page.locator('[data-wheel-slot]')).toHaveCount(10);
  await expect(page.locator('animateTransform')).toHaveCount(0);
  await expect(page.getByText('Equal chance per game')).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
    true,
  );
});

test('idle wheel continues after four seconds and stops for reduced motion', async ({ page }) => {
  await page.request.post('/__test/clear');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/display/play');
  const rotor = page.locator('[data-wheel-rotor]');
  await expect(rotor).toHaveCount(1);
  await page.waitForTimeout(4200);
  const first = await rotor.getAttribute('transform');
  await expect.poll(() => rotor.getAttribute('transform')).not.toBe(first);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(rotor).toHaveAttribute('transform', 'rotate(0 200 200)');
});

test('phone wheel moves, hides the result until countdown and survives resume', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.request.post('/__test/scene', { data: { gameId: 'debug', wheel: true } });
  await page.goto('/');
  await expect(page.getByRole('img', { name: 'Selecting game', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Debug Dash', exact: true })).toHaveCount(0);
  await expect(page.getByText('Debug Dash', { exact: true })).toHaveCount(0);
  const rotor = page.locator('[data-wheel-rotor]');
  const first = await rotor.getAttribute('transform');
  await expect.poll(() => rotor.getAttribute('transform')).not.toBe(first);
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByRole('heading', { name: 'Debug Dash', exact: true })).toBeVisible({
    timeout: 5000,
  });
  await expect(page.getByRole('img', { name: 'Selecting game', exact: true })).toHaveCount(0);
  await page.request.post('/__test/clear');
});
