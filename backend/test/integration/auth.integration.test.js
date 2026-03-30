import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import pg from 'pg';
import { authFixtures, buildUniqueEmail } from '../fixtures/auth.fixtures.js';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/togetherhere_test';

process.env.NODE_ENV = 'test';
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
}
if (!process.env.AUTH_RATE_LIMIT_WINDOW_MS) {
  process.env.AUTH_RATE_LIMIT_WINDOW_MS = '10000';
}
if (!process.env.AUTH_RATE_LIMIT_BASE_BACKOFF_MS) {
  process.env.AUTH_RATE_LIMIT_BASE_BACKOFF_MS = '50';
}
if (!process.env.AUTH_RATE_LIMIT_MAX_BACKOFF_MS) {
  process.env.AUTH_RATE_LIMIT_MAX_BACKOFF_MS = '200';
}
if (!process.env.AUTH_RATE_LIMIT_LOCKOUT_THRESHOLD) {
  process.env.AUTH_RATE_LIMIT_LOCKOUT_THRESHOLD = '2';
}
if (!process.env.AUTH_RATE_LIMIT_LOCKOUT_MS) {
  process.env.AUTH_RATE_LIMIT_LOCKOUT_MS = '1000';
}

function assertSafeTestDatabaseUrl(databaseUrl) {
  const normalized = String(databaseUrl || '').toLowerCase();
  if (!normalized.includes('test')) {
    throw new Error(`Refusing to run auth integration tests against a non-test database URL: ${databaseUrl}`);
  }
}

assertSafeTestDatabaseUrl(process.env.DATABASE_URL);

const { default: app } = await import('../../src/app.js');
const { default: config } = await import('../../src/config/index.js');

const { Pool } = pg;
const db = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

const server = createServer(app);
await new Promise((resolve) => server.listen(0, resolve));

const address = server.address();
if (!address || typeof address === 'string') {
  throw new Error('Failed to determine test server port.');
}

const baseUrl = `http://127.0.0.1:${address.port}`;

const TABLES_TO_TRUNCATE = ['email_verification_tokens', 'password_reset_tokens', 'sessions', 'users'];

async function resetDatabase() {
  await db.query(`TRUNCATE ${TABLES_TO_TRUNCATE.join(', ')} RESTART IDENTITY CASCADE`);
}

function parseSetCookieHeader(cookieHeaderValue) {
  const [firstPart] = cookieHeaderValue.split(';');
  const separatorIndex = firstPart.indexOf('=');

  if (separatorIndex === -1) {
    return null;
  }

  const name = firstPart.slice(0, separatorIndex).trim();
  const value = firstPart.slice(separatorIndex + 1).trim();

  if (!name) {
    return null;
  }

  return { name, value };
}

function buildClient() {
  const cookies = new Map();
  let csrfToken = null;

  function setCookieHeadersIntoJar(response) {
    const cookieValues = response.headers.getSetCookie?.() || [];

    for (const rawCookie of cookieValues) {
      const parsed = parseSetCookieHeader(rawCookie);
      if (!parsed) {
        continue;
      }

      if (!parsed.value) {
        cookies.delete(parsed.name);
        continue;
      }

      cookies.set(parsed.name, parsed.value);
    }
  }

  function getCookieHeader() {
    return Array.from(cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  async function request(path, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const headers = new Headers(options.headers || {});
    const cookieHeader = getCookieHeader();

    if (cookieHeader) {
      headers.set('cookie', cookieHeader);
    }

    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      if (!csrfToken) {
        await refreshCsrfToken();
      }

      headers.set(config.csrfHeaderName, csrfToken);
    }

    if (options.body && !headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }

    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      method,
      headers
    });

    setCookieHeadersIntoJar(response);

    return response;
  }

  async function refreshCsrfToken() {
    const headers = new Headers();
    const cookieHeader = getCookieHeader();

    if (cookieHeader) {
      headers.set('cookie', cookieHeader);
    }

    const response = await fetch(`${baseUrl}/csrf-token`, { headers });
    setCookieHeadersIntoJar(response);

    const payload = await response.json();
    csrfToken = payload.csrfToken;
  }

  function getCookie(name) {
    return cookies.get(name);
  }

  return {
    request,
    getCookie
  };
}

test.beforeEach(async () => {
  await resetDatabase();
});

test.after(async () => {
  await db.end();
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

test('register -> verify -> login -> me -> logout lifecycle', async () => {
  const client = buildClient();
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
});

test('register rejects duplicate email', async () => {
  const client = buildClient();
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
  const client = buildClient();
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
  const client = buildClient();

  const meResponse = await client.request('/auth/me');
  assert.equal(meResponse.status, 401);
  const mePayload = await meResponse.json();
  assert.equal(mePayload.message, 'No authenticated session.');

  const logoutResponse = await client.request('/auth/logout', { method: 'POST' });
  assert.equal(logoutResponse.status, 401);
  const logoutPayload = await logoutResponse.json();
  assert.equal(logoutPayload.message, 'No authenticated session.');
});

test('auth rate limit applies backoff and lockout after repeated login failures', async () => {
  const client = buildClient();
  const email = buildUniqueEmail('rate-limit');

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

  const firstFailure = await client.request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: authFixtures.wrongPassword })
  });
  assert.equal(firstFailure.status, 401);

  const secondAttemptDuringBackoff = await client.request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: authFixtures.wrongPassword })
  });
  assert.equal(secondAttemptDuringBackoff.status, 429);
  assert.ok(secondAttemptDuringBackoff.headers.get('retry-after'));

  await new Promise((resolve) => setTimeout(resolve, 100));

  const thirdFailure = await client.request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: authFixtures.wrongPassword })
  });
  assert.equal(thirdFailure.status, 401);

  const fourthAttemptDuringLockout = await client.request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: authFixtures.wrongPassword })
  });
  assert.equal(fourthAttemptDuringLockout.status, 429);
  assert.ok(fourthAttemptDuringLockout.headers.get('retry-after'));
});

test('csrf protection rejects state-changing auth requests without token for cookie sessions', async (t) => {
  if (config.authTransportStrategy !== 'cookie-session') {
    t.skip('CSRF token enforcement is only enabled for cookie-session auth transport.');
    return;
  }

  const email = buildUniqueEmail('csrf-enforcement');
  const response = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password: authFixtures.password,
      displayName: authFixtures.displayName
    })
  });

  assert.equal(response.status, 403);
  const payload = await response.json();
  assert.equal(payload.message, 'Invalid CSRF token.');
});
