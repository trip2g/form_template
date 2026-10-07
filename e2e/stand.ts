import { expect, request, type BrowserContext, type Locator, type Page } from '@playwright/test';

export const STAND_URL = process.env.STAND_URL ?? 'http://localhost:18081';
export const OWNER_EMAIL = 'owner@example.com';
const GRAPHQL = `${STAND_URL}/_system/graphql`;

type Headers = Record<string, string>;

export async function gql<T = any>(query: string, variables: Record<string, unknown> = {}, headers: Headers = {}): Promise<T> {
  const api = await request.newContext();
  try {
    const res = await api.post(GRAPHQL, { data: { query, variables }, headers });
    expect(res.ok(), `graphql answered ${res.status()}`).toBeTruthy();
    const body = await res.json();
    expect(body.errors, JSON.stringify(body.errors)).toBeUndefined();
    return body.data as T;
  } finally {
    await api.dispose();
  }
}

export async function signIn(email: string): Promise<string> {
  const data = await gql(
    'mutation ($input: SignInByEmailInput!) { signInByEmail(input: $input) { __typename ... on SignInPayload { token } ... on ErrorPayload { message } } }',
    { input: { email, code: '111111' } },
  );
  expect(data.signInByEmail.__typename, data.signInByEmail.message).toBe('SignInPayload');
  return data.signInByEmail.token;
}

export async function signInBrowser(context: BrowserContext, email: string): Promise<void> {
  const token = await signIn(email);
  await context.addCookies([{ name: 'trip2g_token', value: token, url: STAND_URL }]);
}

let ownerToken: Promise<string> | undefined;

export function asOwner<T = any>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  ownerToken ??= signIn(OWNER_EMAIL);
  return ownerToken.then((token) => gql<T>(query, variables, { Cookie: `trip2g_token=${token}` }));
}

let apiKey: Promise<string> | undefined;

export async function pushNote(path: string, content: string): Promise<void> {
  apiKey ??= asOwner(
    'mutation { admin { createApiKey(input: { description: "e2e" }) { __typename ... on CreateApiKeyPayload { value } } } }',
  ).then((d) => d.admin.createApiKey.value as string);
  const data = await gql(
    'mutation ($input: PushNotesInput!) { pushNotes(input: $input) { __typename ... on ErrorPayload { message } } }',
    { input: { updates: [{ path, content }] } },
    { 'X-API-Key': await apiKey },
  );
  expect(data.pushNotes.__typename, data.pushNotes.message).toBe('PushNotesPayload');
}

export type StoredSubmit = {
  id: number;
  formId: string;
  user: { email: string | null } | null;
  values: Record<string, string | number | boolean>;
};

export async function submitsWith(marker: string): Promise<StoredSubmit[]> {
  const data = await asOwner(`{
    admin {
      formSubmits(filter: { limit: 1000 }) {
        nodes {
          id
          formId
          user { email }
          fields {
            __typename
            ... on AdminFormStringValue { name stringValue: value }
            ... on AdminFormIntValue { name intValue: value }
            ... on AdminFormBoolValue { name boolValue: value }
          }
        }
      }
    }
  }`);
  const out: StoredSubmit[] = [];
  for (const node of data.admin.formSubmits.nodes) {
    const values: StoredSubmit['values'] = {};
    for (const f of node.fields) values[f.name] = f.stringValue ?? f.intValue ?? f.boolValue;
    if (Object.values(values).includes(marker)) out.push({ id: node.id, formId: node.formId, user: node.user, values });
  }
  return out;
}

export function marker(label: string): string {
  return `${label}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function field(page: Page, name: string | RegExp): Locator {
  return page.locator('.survey__field').filter({
    has: page.locator('legend, label').filter({ hasText: name }),
  }).first();
}

export function fieldError(page: Page, name: string | RegExp): Locator {
  return field(page, name).locator('.survey__error');
}

export async function fillFieldsForm(page: Page, story: string): Promise<void> {
  await page.getByRole('group', { name: 'Scale question' }).getByText('4', { exact: true }).click();
  await page.getByRole('group', { name: 'Single choice question' }).getByText('Green', { exact: true }).click();
  await page.getByLabel('Option A').check();
  await page.getByLabel('Option C').check();
  await page.getByLabel('Long text question').fill(story);
  await page.getByLabel('Short text question').fill('short answer');
  await page.getByLabel('Email question').fill('guest@example.com');
  await page.getByLabel('Number question').fill('30');
  await page.getByLabel('Required checkbox').check();
  await page.getByLabel('Consent question').check();
}

export function submitButton(page: Page, name = 'Submit'): Locator {
  return page.getByRole('button', { name });
}

export async function noHorizontalScroll(page: Page): Promise<void> {
  const [scrollWidth, innerWidth] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}
