import { createServer } from 'node:http';
import { createApp } from '../../src/app.js';

export async function createTestServer() {
  const app = createApp();
  const server = createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to determine test server port.');
  }

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`
  };
}

export async function closeTestServer(server) {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}
