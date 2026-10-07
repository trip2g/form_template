import { expect, test } from '@playwright/test';
import { fillFieldsForm, marker, submitButton } from './stand';

const GRAPHQL = '**/_system/graphql';

test.beforeEach(async ({ page }) => {
  await page.goto('/fields');
});

test('a 500 shows an error and keeps the answers', async ({ page }) => {
  await page.route(GRAPHQL, (route) => route.fulfill({ status: 500, contentType: 'text/plain', body: 'Internal Server Error' }));
  const story = marker('server-error');
  await fillFieldsForm(page, story);
  await submitButton(page).click();
  await expect(page.locator('.survey__status--error')).toHaveText('Could not send: the server answered 500.');
  await expect(page.getByLabel('Long text question')).toHaveValue(story);
  await expect(page.getByLabel('Email question')).toHaveValue('guest@example.com');
  await expect(page.getByRole('group', { name: 'Scale question' }).getByRole('radio', { name: '4' })).toBeChecked();
  await expect(page.getByLabel('Consent question')).toBeChecked();
  await expect(submitButton(page)).toBeEnabled();
});

test('a network failure shows an error and keeps the answers', async ({ page }) => {
  await page.route(GRAPHQL, (route) => route.abort('failed'));
  const story = marker('network-error');
  await fillFieldsForm(page, story);
  await submitButton(page).click();
  await expect(page.locator('.survey__status--error')).toHaveText('Could not send: check your connection and try again.');
  await expect(page.getByLabel('Long text question')).toHaveValue(story);
  await expect(page.getByRole('group', { name: 'Single choice question' }).getByRole('radio', { name: 'Green' })).toBeChecked();
  await expect(submitButton(page)).toBeEnabled();
});

test('form_not_found asks to reload the page', async ({ page }) => {
  await page.route(GRAPHQL, (route) =>
    route.fulfill({ json: { data: { submitForm: { __typename: 'ErrorPayload', message: 'form_not_found' } } } }),
  );
  await fillFieldsForm(page, marker('not-found'));
  await submitButton(page).click();
  await expect(page.locator('.survey__status--error')).toHaveText('This form has changed or is not available. Reload the page.');
});

test('a double click submits once', async ({ page }) => {
  let calls = 0;
  let release!: () => void;
  const released = new Promise<void>((resolve) => { release = resolve; });
  await page.route(GRAPHQL, async (route) => {
    calls += 1;
    await released;
    await route.fulfill({ json: { data: { submitForm: { __typename: 'SubmitFormPayload', submitId: 1 } } } });
  });
  await fillFieldsForm(page, marker('double'));
  const request = page.waitForRequest(GRAPHQL);
  await submitButton(page).dblclick();
  await request;
  await expect(submitButton(page)).toBeDisabled();
  expect(calls).toBe(1);
  release();
  await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
  expect(calls).toBe(1);
});
