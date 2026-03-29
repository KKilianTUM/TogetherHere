import { createHash } from 'crypto';

export const hashToken = (rawToken) =>
  createHash('sha256').update(String(rawToken)).digest('hex');
