import test from 'node:test';
import assert from 'node:assert/strict';
import { authFixtures, buildUniqueEmail } from '../fixtures/auth.fixtures.js';
import { createTestServer, closeTestServer } from '../support/testApp.js';
import { buildAuthClient } from '../support/authClient.js';
import { createResetFixture } from '../support/resetFixture.js';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/togetherhere_test';

process.env.NODE_ENV = 'test';
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
}

const { default: config } = await import('../../src/config/index.js');

const resetFixture = createResetFixture({ databaseUrl: process.env.DATABASE_URL });
const { server, baseUrl } = await createTestServer();

test.beforeEach(async () => {
  await resetFixture.resetSecurityState();
});

test.after(async () => {
  await resetFixture.close();
  await closeTestServer(server);
});

test('register -> verify -> login -> me -> logout lifecycle', async () => {
  const client = buildAuthClient({ baseUrl, csrfHeaderName: config.csrfHeaderName });
  const email = buildUniqueEmail('lifecycle');

  const registerResponse = await client.request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: authFixtures.password,
      displayName: authFixtures.displayName
    })
  });

  assert.equal(registerResponse.status, 201);
  const registerPayload = await registerResponse.json();
  assert.equal(registerPayload.user.email, email);
  assert.ok(registerPayload.user.verificationToken);

  const verifyResponse = await client.request('/auth/verification/confirm', {
    method: 'POST',
    body: JSON.stringify({ token: registerPayload.user.verificationToken })
  });

  assert.equal(verifyResponse.status, 200);
  assert.deepEqual(await verifyResponse.json(), { verified: true });

  const loginResponse = await client.request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: authFixtures.password })
  });

  assert.equal(loginResponse.status, 200);
  const loginPayload = await loginResponse.json();
  assert.equal(loginPayload.user.email, email);
  assert.ok(client.getCookie(config.sessionCookieName));

  const meResponse = await client.request('/auth/me');
  assert.equal(meResponse.status, 200);
  const mePayload = await meResponse.json();
  assert.equal(mePayload.user.email, email);

  const logoutResponse = await client.request('/auth/logout', { method: 'POST' });
  assert.equal(logoutResponse.status, 204);

  const meAfterLogoutResponse = await client.request('/auth/me');
  assert.equal(meAfterLogoutResponse.status, 401);
  const meAfterLogoutPayload = await meAfterLogoutResponse.json();
  assert.equal(meAfterLogoutPayload.message, 'No authenticated session.');

  client.resetAuthState();
});

test('register rejects duplicate email', async () => {
  const client = buildAuthClient({ baseUrl, csrfHeaderName: config.csrfHeaderName });
  const email = buildUniqueEmail('duplicate');

  const firstRegister = await client.request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: authFixtures.password,
      displayName: authFixtures.displayName
    })
  });

  assert.equal(firstRegister.status, 201);

  const duplicateRegister = await client.request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: authFixtures.password,
      displayName: authFixtures.displayName
    })
  });

  assert.equal(duplicateRegister.status, 409);
  const duplicatePayload = await duplicateRegister.json();
  assert.equal(duplicatePayload.message, 'Account already exists for this email.');
});

test('login rejects wrong password', async () => {
  const client = buildAuthClient({ baseUrl, csrfHeaderName: config.csrfHeaderName });
  const email = buildUniqueEmail('wrong-password');

  const registerResponse = await client.request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: authFixtures.password,
      displayName: authFixtures.displayName
    })
  });

  const registerPayload = await registerResponse.json();

  await client.request('/auth/verification/confirm', {
    method: 'POST',
    body: JSON.stringify({ token: registerPayload.user.verificationToken })
  });

  const loginResponse = await client.request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: authFixtures.wrongPassword })
  });

  assert.equal(loginResponse.status, 401);
  const loginPayload = await loginResponse.json();
  assert.equal(loginPayload.message, 'Invalid email or password.');
});

test('me/logout return unauthorized when no session is present', async () => {
  const client = buildAuthClient({ baseUrl, csrfHeaderName: config.csrfHeaderName });

  const meResponse = await client.request('/auth/me');
  assert.equal(meResponse.status, 401);
  const mePayload = await meResponse.json();
  assert.equal(mePayload.message, 'No authenticated session.');

  const logoutResponse = await client.request('/auth/logout', { method: 'POST' });
  assert.equal(logoutResponse.status, 401);
  const logoutPayload = await logoutResponse.json();
  assert.equal(logoutPayload.message, 'No authenticated session.');
});
