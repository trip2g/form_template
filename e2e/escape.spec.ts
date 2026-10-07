import { expect, test } from '@playwright/test';
import { marker, submitButton, submitsWith } from './stand';

test('markup in the title, labels, hints and thanks shows as text and runs nothing', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('dialog', (dialog) => errors.push(`dialog: ${dialog.message()}`));

  await page.goto('/escape');
  await expect(page).toHaveTitle('Escape </script><img src=x onerror=window.__pwned=1>');
  await expect(page.locator('h1')).toHaveText('Escape </script><img src=x onerror=window.__pwned=1>');
  await expect(page.locator('.survey__title')).toHaveText('Form </script><script>window.__pwned=2</script>');
  await expect(page.getByText('Label </script><script>window.__pwned=4</script>')).toBeVisible();
  await expect(page.getByText('Hint <img src=x onerror=window.__pwned=5>')).toBeVisible();
  await expect(page.locator('legend').filter({ hasText: 'Group <b onmouseover=window.__pwned=6>bold</b>' })).toBeVisible();
  await expect(page.getByText('Option <img src=x onerror=window.__pwned=7>')).toBeVisible();
  await expect(page.locator('#survey img, #survey script, #survey b')).toHaveCount(0);
  await expect(page.locator('.survey__form')).toHaveCount(1);

  const answer = marker('escape');
  await page.getByLabel('Label </script>').fill(answer);
  await page.locator('legend').hover();
  await submitButton(page).click();
  await expect(page.locator('.survey__thanks p')).toHaveText('Thanks <img src=x onerror=window.__pwned=3>');
  await expect(page.locator('.survey__thanks img')).toHaveCount(0);

  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
  expect(errors).toEqual([]);
  expect(await submitsWith(answer)).toHaveLength(1);
});
