import test from 'node:test';
import assert from 'node:assert/strict';
import { authFixtures, buildUniqueEmail } from '../fixtures/auth.fixtures.js';
import { createTestServer, closeTestServer } from '../support/testApp.js';
import { buildAuthClient } from '../support/authClient.js';
import { createResetFixture } from '../support/resetFixture.js';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/togetherhere_test';

process.env.NODE_ENV = 'test';
process.env.AUTH_EXPOSE_TOKENS_IN_RESPONSE = 'true';
process.env.EMAIL_PROVIDER = 'noop';
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
}

const { default: config } = await import('../../src/config/index.js');
Object.assign(config, {
  authRateLimitWindowMs: 5_000,
  authRateLimitBaseBackoffMs: 60,
  authRateLimitMaxBackoffMs: 200,
  authRateLimitLockoutThreshold: 3,
  authRateLimitLockoutMs: 260
});

const resetFixture = createResetFixture({ databaseUrl: process.env.DATABASE_URL });
const { server, baseUrl } = await createTestServer();

test.beforeEach(async () => {
  await resetFixture.resetSecurityState();
});

test.after(async () => {
  await resetFixture.close();
  await closeTestServer(server);
});

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function registerAndVerify(client, tag) {
  const email = buildUniqueEmail(tag);

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
  assert.ok(registerPayload.user);
  assert.ok(registerPayload.user.verificationToken);

  const verifyResponse = await client.request('/auth/verification/confirm', {
    method: 'POST',
    body: JSON.stringify({ token: registerPayload.user.verificationToken })
  });

  assert.equal(verifyResponse.status, 200);
  return email;
}

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
  assert.ok(registerPayload.user);
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

  assert.equal(registerResponse.status, 201);
  const registerPayload = await registerResponse.json();
  assert.ok(registerPayload.user);
  assert.ok(registerPayload.user.verificationToken);

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

test('rate-limit: repeated failed login attempts trigger backoff and lockout', async () => {
  const client = buildAuthClient({ baseUrl, csrfHeaderName: config.csrfHeaderName });
  const email = await registerAndVerify(client, 'rate-limit-lockout');

  const firstFailure = await client.request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: authFixtures.wrongPassword })
  });
  assert.equal(firstFailure.status, 401);

  const blockedByBackoff = await client.request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: authFixtures.wrongPassword })
  });
  assert.equal(blockedByBackoff.status, 429);
  assert.ok(Number(blockedByBackoff.headers.get('retry-after')) >= 1);

  await wait(config.authRateLimitBaseBackoffMs + 30);

  const secondFailure = await client.request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: authFixtures.wrongPassword })
  });
  assert.equal(secondFailure.status, 401);

  await wait(config.authRateLimitBaseBackoffMs * 2 + 30);

  const thirdFailure = await client.request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: authFixtures.wrongPassword })
  });
  assert.equal(thirdFailure.status, 401);

  const blockedByLockout = await client.request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: authFixtures.password })
  });
  assert.equal(blockedByLockout.status, 429);
  assert.ok(Number(blockedByLockout.headers.get('retry-after')) >= 1);
});

test('rate-limit: login succeeds again after cooldown/unlock', async () => {
  const client = buildAuthClient({ baseUrl, csrfHeaderName: config.csrfHeaderName });
  const email = await registerAndVerify(client, 'rate-limit-cooldown');

  for (let attempt = 0; attempt < config.authRateLimitLockoutThreshold; attempt += 1) {
    const failedResponse = await client.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: authFixtures.wrongPassword })
    });
    assert.equal(failedResponse.status, 401);

    if (attempt < config.authRateLimitLockoutThreshold - 1) {
      await wait(Math.min(config.authRateLimitMaxBackoffMs, config.authRateLimitBaseBackoffMs * (2 ** (attempt + 1))) + 30);
    }
  }

  const lockedResponse = await client.request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: authFixtures.password })
  });
  assert.equal(lockedResponse.status, 429);

  await wait(config.authRateLimitLockoutMs + 40);

  const successResponse = await client.request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: authFixtures.password })
  });
  assert.equal(successResponse.status, 200);
  const successPayload = await successResponse.json();
  assert.equal(successPayload.user.email, email);
});

test('csrf: state-changing requests reject missing token and accept valid token', async () => {
  const client = buildAuthClient({ baseUrl, csrfHeaderName: config.csrfHeaderName });
  const email = buildUniqueEmail('csrf-create');

  const missingTokenResponse = await client.request('/auth/register', {
    method: 'POST',
    injectCsrfToken: false,
    body: JSON.stringify({
      email,
      password: authFixtures.password,
      displayName: authFixtures.displayName
    })
  });
  assert.equal(missingTokenResponse.status, 403);
  const missingTokenPayload = await missingTokenResponse.json();
  assert.equal(missingTokenPayload.message, 'Invalid CSRF token.');

  const validTokenResponse = await client.request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: authFixtures.password,
      displayName: authFixtures.displayName
    })
  });
  assert.equal(validTokenResponse.status, 201);
});

test('csrf client: first state-changing request succeeds without a manual csrf pre-call', async () => {
  const client = buildAuthClient({ baseUrl, csrfHeaderName: config.csrfHeaderName });
  const email = buildUniqueEmail('csrf-lazy-first-post');

  const registerResponse = await client.request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: authFixtures.password,
      displayName: authFixtures.displayName
    })
  });

  assert.equal(registerResponse.status, 201);
  assert.ok(typeof client.getCsrfToken() === 'string' && client.getCsrfToken().length > 0);
  assert.ok(client.getCookie(config.csrfCookieName));
});

test('csrf: safe/idempotent routes work without csrf header and set csrf state', async () => {
  const client = buildAuthClient({ baseUrl, csrfHeaderName: config.csrfHeaderName });

  const healthResponse = await client.request('/health', { injectCsrfToken: false });
  assert.equal(healthResponse.status, 200);

  const csrfResponse = await client.request('/csrf-token', { injectCsrfToken: false });
  assert.equal(csrfResponse.status, 200);
  const csrfPayload = await csrfResponse.json();
  assert.ok(typeof csrfPayload.csrfToken === 'string' && csrfPayload.csrfToken.length > 0);
  assert.ok(client.getCookie(config.csrfCookieName));
});

test('csrf: malformed and missing header/cookie combinations are rejected', async () => {
  const client = buildAuthClient({ baseUrl, csrfHeaderName: config.csrfHeaderName });
  const baseBody = {
    email: buildUniqueEmail('csrf-negative'),
    password: authFixtures.password,
    displayName: authFixtures.displayName
  };

  await client.refreshCsrf();

  const malformedHeaderResponse = await client.request('/auth/register', {
    method: 'POST',
    csrfToken: 'malformed-token',
    body: JSON.stringify(baseBody)
  });
  assert.equal(malformedHeaderResponse.status, 403);

  const missingHeaderWithCookieResponse = await client.request('/auth/register', {
    method: 'POST',
    injectCsrfToken: false,
    body: JSON.stringify({ ...baseBody, email: buildUniqueEmail('csrf-missing-header') })
  });
  assert.equal(missingHeaderWithCookieResponse.status, 403);

  client.clearCookie(config.csrfCookieName);

  const missingCookieResponse = await client.request('/auth/register', {
    method: 'POST',
    csrfToken: client.getCsrfToken(),
    body: JSON.stringify({ ...baseBody, email: buildUniqueEmail('csrf-missing-cookie') })
  });
  assert.equal(missingCookieResponse.status, 403);
});

test('cors+credentials: allowed origin receives credential headers and disallowed origin does not', async () => {
  const allowedOrigin = config.corsAllowedOrigins[0];
  const disallowedOrigin = 'http://evil.example.test';

  const allowedPreflight = await fetch(`${baseUrl}/auth/login`, {
    method: 'OPTIONS',
    headers: {
      origin: allowedOrigin,
      'access-control-request-method': 'POST'
    }
  });
  assert.equal(allowedPreflight.status, 204);
  assert.equal(allowedPreflight.headers.get('access-control-allow-origin'), allowedOrigin);
  assert.equal(allowedPreflight.headers.get('access-control-allow-credentials'), 'true');

  const disallowedPreflight = await fetch(`${baseUrl}/auth/login`, {
    method: 'OPTIONS',
    headers: {
      origin: disallowedOrigin,
      'access-control-request-method': 'POST'
    }
  });
  assert.equal(disallowedPreflight.status, 204);
  assert.equal(disallowedPreflight.headers.get('access-control-allow-origin'), null);
  assert.equal(disallowedPreflight.headers.get('access-control-allow-credentials'), null);
});
