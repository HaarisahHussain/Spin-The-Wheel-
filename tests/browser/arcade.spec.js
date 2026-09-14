import { test, expect } from '@playwright/test';
const password = 'browser test passphrase';
async function loginHost(page) {
  await page.goto('/host');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
test.beforeEach(async ({ page }) => {
  await page.request.post('/__test/reset');
});
test('host password sign-in, settings, refresh and explicit second-browser takeover', async ({
  page,
  browser,
}) => {
  await loginHost(page);
  await expect(page.getByRole('button', { name: 'Call next player' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Call next player' })).toBeVisible();
  await page.getByRole('button', { name: 'event', exact: true }).click();
  await page.getByRole('switch', { name: 'Ranked play', exact: true }).check();
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect
    .poll(async () => (await (await page.request.get('/api/state')).json()).config.rankedEnabled)
    .toBe(true);
  const other = await browser.newPage();
  await loginHost(other);
  await expect(other.getByRole('button', { name: 'Take over', exact: true })).toBeVisible();
  await other.getByRole('button', { name: 'Take over', exact: true }).click();
  await expect(other.getByRole('button', { name: 'Call next player' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Host sign in' })).toBeVisible();
  await other.close();
});
test('second host tab does not auto-claim control; user can move control explicitly', async ({
  page,
  context,
}) => {
  await loginHost(page);
  await expect(page.getByRole('button', { name: 'Call next player' })).toBeVisible();
  const tab = await context.newPage();
  await tab.goto('/host');
  await expect(tab.getByRole('button', { name: 'Take control here', exact: true })).toBeVisible();
  await tab.getByRole('button', { name: 'Take control here', exact: true }).click();
  await tab.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(tab.getByRole('button', { name: 'Call next player' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Take control here', exact: true })).toBeVisible();
  await tab.close();
});
test('player registration, returning password login and shared-browser host isolation', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Full name').fill('New Student');
  await page.getByLabel('BCU email').fill('new@bcu.ac.uk');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Course', { exact: true }).fill('Computer Science');
  await page.getByLabel('Academic year').selectOption('Year 1');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Join queue', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('BCU email').fill('new@bcu.ac.uk');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Join queue', exact: true })).toBeVisible();
  await loginHost(page);
  await expect(page.getByRole('button', { name: 'Call next player' })).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Join queue', exact: true })).toBeVisible();
});
test('all five solo controllers render and submit at phone size; monitors fit 720p', async ({
  page,
  browser,
}) => {
  const display = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  for (const gameId of ['debug', 'output', 'robot', 'parcel', 'painter']) {
    await page.request.post('/__test/scene', { data: { gameId } });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await display.goto('/display/play');
    await expect(page.getByText('This account is open on another controller.')).not.toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(await display.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
      true,
    );
    const solution = await (await page.request.get('/__test/solution')).json();
    if (gameId === 'debug') {
      await page
        .getByRole('button', { name: `Line ${Number(solution.answer) + 1}`, exact: true })
        .click();
      await page.getByRole('button', { name: 'Submit', exact: true }).click();
    } else if (gameId === 'output') {
      await page
        .locator('button[aria-pressed]')
        .filter({ hasText: solution.answer })
        .first()
        .click();
      await page.getByRole('button', { name: 'Submit', exact: true }).click();
    } else if (gameId === 'robot') {
      for (const move of solution.solution)
        await page.getByRole('button', { name: move, exact: true }).click();
      await page.getByRole('button', { name: 'Run', exact: true }).click();
    } else if (gameId === 'parcel') {
      const order = [...solution.starter];
      for (let i = 0; i < solution.solution.length; i++) {
        let position = order.indexOf(solution.solution[i]);
        while (position > i) {
          await page
            .getByRole('button', { name: `Move rule ${position + 1} up`, exact: true })
            .click();
          [order[position], order[position - 1]] = [order[position - 1], order[position]];
          position--;
        }
      }
      await page.getByRole('button', { name: 'Run', exact: true }).click();
    } else {
      for (const move of solution.solution)
        await page.getByRole('button', { name: move, exact: true }).click();
      await page.getByRole('button', { name: 'Run', exact: true }).click();
    }
    await expect(page.getByRole('status').filter({ hasText: /Correct|Solved/ })).toBeVisible();
    await expect(display.getByRole('status').filter({ hasText: /Correct|Solved/ })).toBeVisible();
    expect(await display.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/${gameId}-phone.png` });
    await display.screenshot({ path: `test-results/${gameId}-display.png` });
  }
  await display.close();
  await page.request.post('/__test/clear');
});
test('live robot program is private until shared execution and phone shows its result', async ({
  page,
  browser,
}) => {
  await page.request.post('/__test/scene', { data: { gameId: 'robot', live: true } });
  await page.goto('/');
  const solution = await (await page.request.get('/__test/solution')).json();
  for (const move of solution.solution)
    await page.getByRole('button', { name: move, exact: true }).click();
  await page.getByRole('button', { name: 'Lock program', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Locked', exact: true })).toBeVisible();
  let state = await (await page.request.get('/api/state')).json();
  expect(state.live.question.solution).toBeUndefined();
  expect(state.live.roster[0].result).toBeUndefined();
  const display = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await display.goto('/display/play');
  await page.request.post('/__test/close-live');
  await expect(display.getByRole('img', { name: 'Shared robot execution' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Solved' })).toBeVisible({
    timeout: 10000,
  });
  await display.screenshot({ path: 'test-results/robot-live-display.png' });
  await display.close();
  await page.request.post('/__test/clear');
});
test('idle wheel rotates continuously, selection hides result and reduced motion is neutral', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/display/play');
  const rotor = page.locator('[data-wheel-rotor]');
  await expect(page.locator('[data-wheel-slot]')).toHaveCount(10);
  await page.waitForTimeout(4100);
  const angle = await rotor.getAttribute('transform');
  await expect.poll(() => rotor.getAttribute('transform')).not.toBe(angle);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(rotor).toHaveAttribute('transform', 'rotate(0 200 200)');
  await page.request.post('/__test/scene', { data: { gameId: 'robot', wheel: true } });
  await page.goto('/');
  await expect(page.getByRole('img', { name: 'Selecting game', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Robot Rescue', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Robot Rescue', exact: true })).toBeVisible({
    timeout: 5000,
  });
  await page.request.post('/__test/clear');
});
test('final prize celebration dismisses once and remains available in Scores', async ({ page }) => {
  await page.request.post('/__test/scene', { data: { gameId: 'debug', award: true } });
  await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Got it', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'scores', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your grand prize' })).toBeVisible();
});

test('password reset link opens in another browser without consumption until submission', async ({
  page,
  browser,
}) => {
  await page.goto('/');
  await page.getByLabel('Full name').fill('Reset Student');
  await page.getByLabel('BCU email').fill('reset@bcu.ac.uk');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Course', { exact: true }).fill('Computing');
  await page.getByLabel('Academic year').selectOption('Year 1');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Join queue', exact: true })).toBeVisible();
  const other = await browser.newPage();
  await other.goto('/');
  await other.getByRole('button', { name: 'Sign in', exact: true }).click();
  await other.getByRole('button', { name: 'Forgot password?', exact: true }).click();
  await other.getByLabel('BCU email').fill('reset@bcu.ac.uk');
  await other.getByRole('button', { name: 'Send reset link', exact: true }).click();
  await expect(
    other.getByText('If this address is registered, a reset email will arrive shortly.'),
  ).toBeVisible();
  const message = await (await other.request.get('/__test/mail')).json();
  const link = `/reset-password#token=${message.token}`;
  await other.goto(link);
  await expect(other.getByRole('heading', { name: 'Set a new password' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Join queue', exact: true })).toBeVisible();
  await other.getByLabel('Password', { exact: true }).fill('replacement test passphrase');
  await other.getByRole('button', { name: 'Set password', exact: true }).click();
  await expect(other.getByRole('link', { name: 'Return to Arcade' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('BCU email').fill('reset@bcu.ac.uk');
  await page.getByLabel('Password', { exact: true }).fill('replacement test passphrase');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Join queue', exact: true })).toBeVisible();
  await other.close();
});
test('later puzzle boards fit narrow phones without horizontal overflow', async ({ page }) => {
  for (const width of [320, 360, 390])
    for (const gameId of ['robot', 'parcel', 'painter']) {
      await page.request.post('/__test/scene', { data: { gameId, level: 4 } });
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/');
      await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
});

test('Robot passes intermediate cells on phone and monitor, resumes after refresh, and retains a failed draft', async ({
  page,
  browser,
}) => {
  await page.request.post('/__test/scene', { data: { gameId: 'robot', robotPath: true } });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const monitor = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await monitor.goto('/display/play');
  for (let i = 0; i < 4; i++)
    await page.getByRole('button', { name: 'right', exact: true }).click();
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  const robot = page.locator('[data-robot-cell]');
  await Promise.all([
    expect
      .poll(() => robot.getAttribute('data-robot-cell'), { intervals: [20, 40] })
      .toMatch(/^[123]$/),
    expect
      .poll(() => monitor.locator('[data-robot-cell]').getAttribute('data-robot-cell'), {
        intervals: [20, 40],
      })
      .toMatch(/^[123]$/),
  ]);
  expect(
    await page
      .locator('[aria-label="Program"] button')
      .evaluateAll((nodes) => nodes.some((n) => n.className.includes('ring-2'))),
  ).toBe(true);
  await page.reload();
  await expect(page.getByRole('status').filter({ hasText: 'Solved' })).toBeVisible();
  await expect(page.locator('[data-robot-cell]')).toHaveAttribute('data-robot-cell', '4');
  await page.request.post('/__test/scene', { data: { gameId: 'robot', robotPath: true } });
  await page.goto('/');
  await page.getByRole('button', { name: 'down', exact: true }).click();
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.getByText('Step 1 hits a wall.', { exact: true })).toBeVisible({
    timeout: 6000,
  });
  await expect(page.getByRole('button', { name: 'Step 1: down', exact: true })).toBeVisible();
  await expect(page.getByText(/2 runs left/)).toBeVisible();
  await page.getByRole('button', { name: 'right', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Step 1: right', exact: true })).toBeVisible();
  await monitor.close();
});
test('settings draft cancellation and contextual reauthentication preserve the pending action', async ({
  page,
}) => {
  await loginHost(page);
  await page.getByRole('button', { name: 'event', exact: true }).click();
  await page.getByRole('button', { name: 'Add day', exact: true }).click();
  await expect(page.getByText('Unsaved changes', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'live', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Event settings' })).toBeVisible();
  await page.getByRole('button', { name: 'Players & Results', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await page.request.post('/__test/old-auth');
  await page.getByRole('button', { name: /Export/ }).click();
  await expect(page.getByRole('dialog', { name: 'Confirm host password' })).toBeVisible();
  await page.getByLabel('Password', { exact: true }).fill(password);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await download;
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

async function enterPainter(page, program) {
  await page.getByRole('button', { name: 'clear', exact: true }).click();
  for (const step of program) {
    if (typeof step === 'string')
      await page.getByRole('button', { name: step, exact: true }).click();
    else {
      await page.getByRole('button', { name: 'Add repeat block', exact: true }).click();
      await page.getByRole('button', { name: 'Remove repeat instruction 2', exact: true }).click();
      await page.getByRole('button', { name: 'Remove repeat instruction 1', exact: true }).click();
      for (const action of step.body)
        await page.getByRole('button', { name: `Add ${action} to repeat`, exact: true }).click();
      await page.getByLabel('Repeat count').selectOption(String(step.repeat));
      await page.getByRole('button', { name: 'Save block', exact: true }).click();
    }
  }
}
test('Painter repeat grammar can be constructed and repaired on a narrow phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 844 });
  for (const level of [1, 2, 3, 4]) {
    await page.request.post('/__test/scene', { data: { gameId: 'painter', level } });
    await page.goto('/');
    const solution = await (await page.request.get('/__test/solution')).json();
    if (level === 2) {
      await page.getByRole('button', { name: /Step .*Repeat/ }).click();
      await page.getByRole('button', { name: 'Edit repeat block', exact: true }).click();
      const block = solution.solution.find((v) => typeof v === 'object');
      await page.getByLabel('Repeat count').selectOption(String(block.repeat));
      await page.getByRole('button', { name: 'Save block', exact: true }).click();
    } else await enterPainter(page, solution.solution);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole('button', { name: 'Run', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Solved' })).toBeVisible();
    await page.screenshot({ path: `test-results/painter-tier-${level + 1}-phone.png` });
  }
});
test('later coding and puzzle challenges fit both public monitor resolutions', async ({ page }) => {
  for (const size of [
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(size);
    for (const gameId of ['debug', 'output', 'robot', 'parcel', 'painter'])
      for (const feedback of [false, true]) {
        await page.request.post('/__test/scene', { data: { gameId, level: 4, feedback } });
        await page.goto('/display/play');
        await expect(page.getByText(/Board 5|Question 5/)).toBeVisible();
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth <= innerWidth &&
              document.documentElement.scrollHeight <= innerHeight,
          ),
        ).toBe(true);
        await page.screenshot({
          path: `test-results/${gameId}-tier5-${size.height}-${feedback}.png`,
        });
      }
  }
});

test('host participants are fetched in pages and individual score reviews load on demand', async ({
  page,
}) => {
  await page.request.post('/__test/scene', { data: { gameId: 'output' } });
  await page.request.post('/__test/history');
  const requested = [];
  page.on('request', (r) => requested.push(r.url()));
  await page.goto('/');
  await page.getByRole('button', { name: 'scores', exact: true }).click();
  await expect(page.getByText('Guess the Output · 4.50', { exact: true })).toBeVisible();
  expect(requested.some((u) => u.includes('section=review'))).toBe(false);
  await page.getByText('Guess the Output · 4.50', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What is printed?' })).toBeVisible();
  expect(requested.some((u) => u.includes('section=review'))).toBe(true);
  await loginHost(page);
  await page.getByRole('button', { name: 'Players & Results', exact: true }).click();
  await expect(page.getByText('history0@bcu.ac.uk · 0/3 attempts', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next participants', exact: true }).click();
  await expect(page.getByText('history40@bcu.ac.uk · 0/3 attempts', { exact: true })).toBeVisible();
  await page.getByLabel('Find participant').fill('history75@bcu.ac.uk');
  await expect(page.getByText('history75@bcu.ac.uk · 0/3 attempts', { exact: true })).toBeVisible();
  const snapshot = await (await page.request.get('/api/state?audience=host')).json();
  expect(snapshot.host.accounts).toHaveLength(0);
  expect(snapshot.host.attempts).toHaveLength(0);
});
