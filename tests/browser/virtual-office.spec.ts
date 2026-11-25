import { test, expect } from '@playwright/test';

const rooms = ['ngolab', 'coworking', 'redbox', 'jago', 'studio', 'kroombox'];

test('every room and the combined plan render, and overview labels cover all rooms', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const area of ['overview', ...rooms]) {
    await page.goto('/tests/browser/virtual-office.html?area=' + area);
    await expect.poll(() => page.evaluate(() => (window as any).frames)).toBeGreaterThan(0);
    expect(await page.evaluate(() => (window as any).unavailable)).toBeFalsy();
  }
  await page.goto('/tests/browser/virtual-office.html?area=overview');
  await expect.poll(() => page.evaluate(() => (window as any).projection?.filter((point: any) => point.visible).map((point: any) => point.id).sort()))
    .toEqual([...rooms].sort());
  expect(errors).toEqual([]);
});

test('clicking the floor of a room returns a local point inside it', async ({ page }) => {
  await page.goto('/tests/browser/virtual-office.html?area=studio');
  await expect.poll(() => page.evaluate(() => (window as any).frames)).toBeGreaterThan(0);
  await page.mouse.click(550, 400);
  const point = await page.evaluate(() => (window as any).picked);
  expect(Math.abs(point.x)).toBeLessThanOrEqual(2.125);
  expect(Math.abs(point.z)).toBeLessThanOrEqual(2.825);
});

test('people markers render as 3D figures in their room and in the overview', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const markers = [
    { id: 'a', room: 'coworking', x: -2, z: 1 },
    { id: 'b', room: 'coworking', x: 2.5, z: -1 },
    { id: 'c', room: 'studio', x: 0, z: 0 }
  ];
  const query = 'markers=' + encodeURIComponent(JSON.stringify(markers)) + '&labels';
  await page.goto('/tests/browser/virtual-office.html?area=coworking&' + query);
  await expect.poll(() => page.evaluate(() => (window as any).projection?.map((point: any) => point.id).sort())).toEqual(['a', 'b']);
  await page.screenshot({ path: test.info().outputPath('coworking-people.png') });
  await page.goto('/tests/browser/virtual-office.html?area=overview&' + query);
  await expect.poll(() => page.evaluate(() => (window as any).frames)).toBeGreaterThan(0);
  await page.screenshot({ path: test.info().outputPath('overview-people.png') });
  expect(errors).toEqual([]);
});
