import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const base = process.env.TRIP2G_URL || 'http://localhost:18081';
const ownerEmail = process.env.OWNER_EMAIL || 'owner@example.com';
const testerEmail = process.env.TESTER_EMAIL || 'tester@example.com';
const endpoint = `${base}/_system/graphql`;

async function gql(query, variables, headers) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors && body.errors.length) {
    throw new Error(`${res.status}: ${body.errors.map((e) => e.message).join('; ')}`);
  }
  return { body, res };
}

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  for (;;) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ __typename }' }),
      });
      if (res.ok) return;
    } catch (err) {
      if (Date.now() > deadline) throw err;
    }
    if (Date.now() > deadline) throw new Error(`${endpoint} did not answer in time`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

async function signIn(email) {
  const { body } = await gql(
    'mutation ($input: SignInByEmailInput!) { signInByEmail(input: $input) { __typename ... on SignInPayload { token } ... on ErrorPayload { message } } }',
    { input: { email, code: '111111' } },
  );
  const out = body.data.signInByEmail;
  if (out.__typename !== 'SignInPayload') throw new Error(`sign-in as ${email}: ${out.message}`);
  return out.token;
}

async function createApiKey(token) {
  const { body } = await gql(
    'mutation ($input: CreateApiKeyInput!) { admin { createApiKey(input: $input) { __typename ... on CreateApiKeyPayload { value } ... on ErrorPayload { message } } } }',
    { input: { description: 'form_template stand seed' } },
    { Cookie: `trip2g_token=${token}` },
  );
  const out = body.data.admin.createApiKey;
  if (out.__typename !== 'CreateApiKeyPayload') throw new Error(`createApiKey: ${out.message}`);
  return out.value;
}

async function ensureUser(token, email) {
  const { body } = await gql(
    'mutation ($input: CreateUserInput!) { admin { createUser(input: $input) { __typename ... on ErrorPayload { message } } } }',
    { input: { email } },
    { Cookie: `trip2g_token=${token}` },
  );
  const out = body.data.admin.createUser;
  if (out.__typename === 'CreateUserPayload') return;
  await signIn(email);
}

async function requireSignin(token, name) {
  const headers = { Cookie: `trip2g_token=${token}` };
  const { body } = await gql('{ admin { allSubgraphs { nodes { id name color hidden humanDescription } } } }', {}, headers);
  const subgraph = body.data.admin.allSubgraphs.nodes.find((s) => s.name === name);
  if (!subgraph) throw new Error(`subgraph ${name} not found`);
  const input = {
    id: subgraph.id,
    color: subgraph.color || '#888888',
    hidden: subgraph.hidden,
    requireSignin: true,
    humanDescription: subgraph.humanDescription,
  };
  const res = await gql(
    'mutation ($input: UpdateSubgraphInput!) { admin { updateSubgraph(input: $input) { __typename ... on ErrorPayload { message } } } }',
    { input },
    headers,
  );
  const out = res.body.data.admin.updateSubgraph;
  if (out.__typename === 'ErrorPayload') throw new Error(`updateSubgraph: ${out.message}`);
}

async function listNotes(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listNotes(path)));
    else if (entry.name.endsWith('.md')) out.push(path);
  }
  return out;
}

async function pushNotes(apiKey, updates) {
  const { body } = await gql(
    'mutation ($input: PushNotesInput!) { pushNotes(input: $input) { __typename ... on PushNotesPayload { notes { path url warnings { message } } } ... on ErrorPayload { message } } }',
    { input: { updates } },
    { 'X-API-Key': apiKey },
  );
  const out = body.data.pushNotes;
  if (out.__typename !== 'PushNotesPayload') throw new Error(`pushNotes: ${out.message}`);
  return out.notes;
}

await waitForServer();
const token = await signIn(ownerEmail);
const apiKey = await createApiKey(token);
await ensureUser(token, testerEmail);

const updates = [{ path: '_layouts/form.html', content: await readFile('form.html', 'utf8') }];
for (const root of ['example', 'stand/notes']) {
  for (const file of await listNotes(root)) {
    updates.push({ path: relative(root, file), content: await readFile(file, 'utf8') });
  }
}

const notes = await pushNotes(apiKey, updates);
for (const n of notes) {
  const warnings = n.warnings.map((w) => w.message).join('; ');
  console.log(`${n.path} -> ${n.url || '(no url)'}${warnings ? `  warnings: ${warnings}` : ''}`);
}
await requireSignin(token, 'staff');
console.log(`ready: open ${process.env.STAND_URL || base}/survey`);
