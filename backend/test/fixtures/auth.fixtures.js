const BASE_PASSWORD = 'StrongerPass!123';

export const authFixtures = {
  password: BASE_PASSWORD,
  wrongPassword: `${BASE_PASSWORD}-wrong`,
  displayName: 'Integration Tester'
};

export function buildUniqueEmail(tag) {
  return `${tag}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}@example.test`;
}
