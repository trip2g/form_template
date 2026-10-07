import { expect, test, type Page } from '@playwright/test';
import { field, fieldError, fillFieldsForm, marker, submitButton, submitsWith } from './stand';

async function submitExpectingError(page: Page, question: string, message: string): Promise<void> {
  await submitButton(page).click();
  await expect(fieldError(page, question)).toHaveText(message);
  await expect(page.locator('.survey__status')).toHaveText('Check the highlighted question.');
  await expect(page.locator('.survey__error:not(:empty)')).toHaveCount(1);
}

test.describe('field errors appear under their question', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/fields');
  });

  test('required', async ({ page }) => {
    const story = marker('required');
    await fillFieldsForm(page, story);
    await page.getByLabel('Email question').fill('');
    await submitExpectingError(page, 'Email question', 'Please answer this question.');
    await expect(page.getByLabel('Email question')).toHaveAttribute('aria-invalid', 'true');
    expect(await submitsWith(story)).toHaveLength(0);
  });

  test('required scale with nothing picked', async ({ page }) => {
    await page.getByLabel('Long text question').fill(marker('scale'));
    await submitExpectingError(page, 'Scale question', 'Please answer this question.');
    await expect(page.getByRole('group', { name: 'Scale question' })).toHaveAttribute('aria-invalid', 'true');
  });

  test('invalid email', async ({ page }) => {
    await fillFieldsForm(page, marker('email'));
    await page.getByLabel('Email question').fill('not-an-email');
    await submitExpectingError(page, 'Email question', 'Enter an email address, like name@example.com.');
  });

  test('min_length', async ({ page }) => {
    await fillFieldsForm(page, 'too short');
    await submitExpectingError(page, 'Long text question', 'Too short: at least 10 characters.');
  });

  test('min', async ({ page }) => {
    await fillFieldsForm(page, marker('min'));
    await page.getByLabel('Number question').fill('10');
    await submitExpectingError(page, 'Number question', 'Must be at least 18.');
  });

  test('unticked consent', async ({ page }) => {
    await fillFieldsForm(page, marker('consent'));
    await page.getByLabel('Consent question').uncheck();
    await submitExpectingError(page, 'Consent question', 'Your consent is required.');
    await expect(page.getByLabel('Consent question')).toHaveAttribute('aria-invalid', 'true');
  });

  test('fixing the field clears its error on the next submit', async ({ page }) => {
    const story = marker('fixed');
    await fillFieldsForm(page, story);
    await page.getByLabel('Consent question').uncheck();
    await submitExpectingError(page, 'Consent question', 'Your consent is required.');
    await page.getByLabel('Consent question').check();
    await submitButton(page).click();
    await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
    expect(await submitsWith(story)).toHaveLength(1);
  });
});

test('trip2g reports one error at a time, and the layout walks through them', async ({ page }) => {
  await page.goto('/fields');
  await page.getByLabel('Long text question').fill(marker('one-at-a-time'));
  await submitExpectingError(page, 'Scale question', 'Please answer this question.');
  await expect(fieldError(page, 'Single choice question')).toBeEmpty();

  await page.getByRole('group', { name: 'Scale question' }).getByText('3', { exact: true }).click();
  await submitExpectingError(page, 'Single choice question', 'Please answer this question.');
  await expect(fieldError(page, 'Scale question')).toBeEmpty();
  await expect(page.getByRole('group', { name: 'Scale question' })).not.toHaveAttribute('aria-invalid', 'true');
});

test('required: true on a checkbox does not force a tick', async ({ page }) => {
  const story = marker('unticked-required');
  await page.goto('/fields');
  await fillFieldsForm(page, story);
  await page.getByLabel('Required checkbox').uncheck();
  await expect(field(page, 'Required checkbox').locator('.survey__required')).toHaveText('*');
  await submitButton(page).click();
  await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
  const [stored] = await submitsWith(story);
  expect(stored.values.newsletter).toBe(false);
});

test('trip2g leaves byFields empty, so the layout reads the field from the message', async ({ page }) => {
  await page.goto('/fields');
  const response = page.waitForResponse((res) => res.url().endsWith('/_system/graphql'));
  await page.evaluate(async () => {
    const spec = JSON.parse(document.getElementById('form-spec')!.textContent!);
    await fetch('/_system/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'mutation ($input: SubmitFormInput!) { submitForm(input: $input) { __typename ... on ErrorPayload { message byFields { name value } } } }',
        variables: { input: { noteVersionId: spec.note_version_id, formId: '', fields: [] } },
      }),
    });
  });
  const body = await (await response).json();
  expect(body.data.submitForm).toEqual({ __typename: 'ErrorPayload', message: 'scale: required', byFields: [] });
});
