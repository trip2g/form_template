import { expect, test } from '@playwright/test';
import { field, noHorizontalScroll } from './stand';

test.describe('controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/fields');
    await expect(page.locator('.survey__form')).toBeVisible();
  });

  test('a small int range is a row of buttons', async ({ page }) => {
    const scale = page.getByRole('group', { name: 'Scale question' });
    await expect(scale.locator('.survey__scale input[type=radio]')).toHaveCount(5);
    await expect(scale.locator('.survey__step span')).toHaveText(['1', '2', '3', '4', '5']);
    await expect(scale.locator('.survey__hint')).toHaveText('1 is low, 5 is high.');
    await expect(scale.locator('.survey__required')).toHaveText('*');
  });

  test('a text enum is a radio per value', async ({ page }) => {
    const choice = page.getByRole('group', { name: 'Single choice question' });
    await expect(choice.getByRole('radio')).toHaveCount(3);
    for (const value of ['Red', 'Green', 'Blue']) await expect(choice.getByRole('radio', { name: value })).toBeVisible();
  });

  test('bools with one group are one question with a checkbox each', async ({ page }) => {
    const group = page.getByRole('group', { name: 'Checkbox group question' });
    await expect(group.getByRole('checkbox')).toHaveCount(3);
    for (const name of ['Option A', 'Option B', 'Option C']) await expect(group.getByRole('checkbox', { name })).toBeVisible();
  });

  test('a long max_length is a text area, a short one an input', async ({ page }) => {
    await expect(page.getByLabel('Long text question')).toHaveJSProperty('tagName', 'TEXTAREA');
    await expect(page.getByLabel('Long text question')).toHaveAttribute('maxlength', '2000');
    const short = page.getByLabel('Short text question');
    await expect(short).toHaveJSProperty('tagName', 'INPUT');
    await expect(short).toHaveAttribute('type', 'text');
    await expect(short).toHaveAttribute('maxlength', '50');
  });

  test('an email field is an email input', async ({ page }) => {
    await expect(page.getByLabel('Email question')).toHaveAttribute('type', 'email');
    await expect(page.getByLabel('Email question')).toHaveAttribute('autocomplete', 'email');
  });

  test('a wide int range is a number input with its bounds', async ({ page }) => {
    const age = page.getByLabel('Number question');
    await expect(age).toHaveAttribute('type', 'number');
    await expect(age).toHaveAttribute('min', '18');
    await expect(age).toHaveAttribute('max', '120');
  });

  test('a consent is a checkbox marked as required', async ({ page }) => {
    await expect(page.getByRole('checkbox', { name: 'Consent question' })).not.toBeChecked();
    await expect(field(page, 'Consent question').locator('.survey__required')).toHaveText('*');
  });

  test('the form title and the note body are shown', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'All the controls' })).toBeVisible();
    await expect(page.getByText('A note that uses every control the layout knows.')).toBeVisible();
  });
});

test('several forms render in key order, each in its own box', async ({ page }) => {
  await page.goto('/multi');
  await expect(page.locator('.survey__form')).toHaveCount(2);
  await expect(page.locator('.survey__title')).toHaveText(['First form', 'Second form']);
  await expect(page.locator('.survey__form').nth(0).getByLabel('Alpha name')).toBeVisible();
  await expect(page.locator('.survey__form').nth(1).getByRole('group', { name: 'Beta rating' }).getByRole('radio')).toHaveCount(3);
});

test('form_ref by URL and by a wikilink with a leading slash shows the shared form', async ({ page }) => {
  for (const path of ['/ref_url', '/ref_link']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Shared questions' })).toBeVisible();
    await expect(page.getByLabel('Which team are you on?')).toBeVisible();
  }
});

test('form_ref by file path shows no form', async ({ page }) => {
  await page.goto('/ref_path');
  await expect(page.getByText('The form comes from a shared note named by its file path.')).toBeVisible();
  await expect(page.locator('#survey')).toBeEmpty();
});

test.describe('at 390px wide', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const path of ['/fields', '/multi', '/ru', '/escape', '/turnstile', '/ref_url', '/admin_only']) {
    test(`${path} has no horizontal scroll`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('.survey__form').first()).toBeVisible();
      await noHorizontalScroll(page);
    });
  }
});
