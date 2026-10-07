import { expect, test } from '@playwright/test';
import { fillFieldsForm, marker, pushNote, signInBrowser, submitButton, submitsWith } from './stand';

test('a guest answer is stored with every value', async ({ page }) => {
  const story = marker('guest-story');
  await page.goto('/fields');
  await fillFieldsForm(page, story);
  await submitButton(page).click();
  await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
  await expect(page.getByText('Fields form received.')).toBeVisible();

  const [stored] = await submitsWith(story);
  expect(stored.user).toBeNull();
  expect(stored.formId).toBe('');
  expect(stored.values).toEqual({
    scale: 4,
    choice: 'Green',
    tool_a: true,
    tool_b: false,
    tool_c: true,
    story,
    short: 'short answer',
    email: 'guest@example.com',
    age: 30,
    newsletter: true,
    consent: true,
  });
});

test('a signed-in answer carries the user', async ({ page, context }) => {
  await signInBrowser(context, 'tester@example.com');
  const team = marker('signed-in-team');
  await page.goto('/staff');
  await page.getByLabel('Your team').fill(team);
  await submitButton(page).click();
  await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible();

  const [stored] = await submitsWith(team);
  expect(stored.user?.email).toBe('tester@example.com');
});

test('a signed-in person without grants can answer a free note', async ({ page, context }) => {
  test.fail(true, 'trip2g answers 403 on a free: true note to a signed-in user who holds no subgraph grant, while a guest gets the page');
  await signInBrowser(context, 'tester@example.com');
  const story = marker('signed-in-free');
  const response = await page.goto('/fields');
  expect(response?.status()).toBe(200);
  await fillFieldsForm(page, story);
  await submitButton(page).click();
  await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
  const [stored] = await submitsWith(story);
  expect(stored.user?.email).toBe('tester@example.com');
});

test('the thank-you screen replaces the form and keeps the note text', async ({ page }) => {
  await page.goto('/fields');
  await fillFieldsForm(page, marker('thanks-story'));
  await submitButton(page).click();
  const thanks = page.locator('.survey__thanks');
  await expect(thanks).toBeVisible();
  await expect(thanks).toContainText('Fields form received.');
  await expect(page.locator('.survey__form')).toHaveCount(0);
  await expect(page.getByText('A note that uses every control the layout knows.')).toBeVisible();
});

test('success_url sends the browser to that page', async ({ page }) => {
  const note = marker('redirect');
  await page.goto('/redirect');
  await page.getByLabel('Anything to add?').fill(note);
  await submitButton(page).click();
  await page.waitForURL('**/thanks');
  await expect(page.getByText('You were sent here by success_url.')).toBeVisible();
  expect(await submitsWith(note)).toHaveLength(1);
});

test('each of several forms submits on its own', async ({ page }) => {
  const name = marker('alpha');
  await page.goto('/multi');
  await page.getByLabel('Alpha name').fill(name);
  await submitButton(page).first().click();
  await expect(page.getByText('Alpha received.')).toBeVisible();
  await expect(page.locator('.survey__form')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Second form' })).toBeVisible();

  await page.getByRole('group', { name: 'Beta rating' }).getByText('2', { exact: true }).click();
  await submitButton(page).click();
  await expect(page.getByText('Beta received.')).toBeVisible();

  const [stored] = await submitsWith(name);
  expect(stored.formId).toBe('alpha');
});

test('a form shared by URL stores the answer', async ({ page }) => {
  const team = marker('team');
  await page.goto('/ref_url');
  await page.getByLabel('Which team are you on?').fill(team);
  await submitButton(page).click();
  await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
  expect(await submitsWith(team)).toHaveLength(1);
});

test.describe('admin-only form', () => {
  test('refuses a guest and stores nothing', async ({ page }) => {
    const decision = marker('guest-decision');
    await page.goto('/admin_only');
    await page.getByLabel('Admin decision').fill(decision);
    await submitButton(page).click();
    await expect(page.locator('.survey__status')).toHaveText(
      'Only a site admin can submit this form. Sign in with the button at the top of the page.',
    );
    await expect(page.getByLabel('Admin decision')).toHaveValue(decision);
    expect(await submitsWith(decision)).toHaveLength(0);
  });

  test('accepts an admin', async ({ page, context }) => {
    await signInBrowser(context, 'owner@example.com');
    const decision = marker('admin-decision');
    await page.goto('/admin_only');
    await page.getByLabel('Admin decision').fill(decision);
    await submitButton(page).click();
    await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
    const [stored] = await submitsWith(decision);
    expect(stored.user?.email).toBe('owner@example.com');
  });
});

test('the Turnstile flow: required, widget, resubmit with a token, success', async ({ page }) => {
  const word = marker('captcha');
  const sent: Array<{ token?: string; answer: string }> = [];
  page.on('request', (req) => {
    if (!req.url().endsWith('/_system/graphql') || req.method() !== 'POST') return;
    const input = req.postDataJSON()?.variables?.input;
    if (input) sent.push({ token: input.turnstileToken, answer: input.fields[0]?.stringValue });
  });

  await page.goto('/turnstile');
  await page.getByLabel('One word').fill(word);
  const first = page.waitForResponse((res) => res.url().endsWith('/_system/graphql'));
  const widget = page.waitForEvent('framenavigated', (frame) => frame.url().startsWith('https://challenges.cloudflare.com/'));
  await submitButton(page).click();
  const firstBody = await (await first).json();
  expect(firstBody.data.submitForm).toEqual({ __typename: 'TurnstileRequiredPayload', siteKey: '1x00000000000000000000AA' });
  await widget;

  await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible({ timeout: 30_000 });
  expect(sent).toHaveLength(2);
  expect(sent[0].token).toBeUndefined();
  expect(sent[1].token).toBeTruthy();
  expect(sent[1].answer).toBe(word);
  expect(await submitsWith(word)).toHaveLength(1);
});

function editMeNote(label: string): string {
  return `---\nfree: true\ntitle: Edit me\nlayout: form\nform:\n  turnstile: false\n  fields:\n    - name: text\n      type: text\n      required: true\n      label: ${label}\n---\n\nA test edits this note while a page is open.\n`;
}

test('a note edited after the page opened asks for a reload, and the reloaded page works', async ({ page }) => {
  const before = marker('Answer before the edit');
  await pushNote('edit-me.md', editMeNote(before));
  await page.goto('/edit_me');
  await expect(page.getByLabel(before)).toBeVisible();

  const after = marker('Answer after the edit');
  await pushNote('edit-me.md', editMeNote(after));

  const stale = marker('stale');
  await page.getByLabel(before).fill(stale);
  await submitButton(page).click();
  await expect(page.locator('.survey__status')).toHaveText('This form has changed or is not available. Reload the page.');
  await expect(page.getByLabel(before)).toHaveValue(stale);

  await page.reload();
  const fresh = marker('fresh');
  await page.getByLabel(after).fill(fresh);
  await submitButton(page).click();
  await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
  expect(await submitsWith(fresh)).toHaveLength(1);
  expect(await submitsWith(stale)).toHaveLength(0);
});
