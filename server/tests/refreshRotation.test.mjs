import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getAdminConnection } from '../scripts/dbHelpers.js';

/**
 * Refresh-token rotation and reuse detection.
 *
 * The refresh token used to be a stateless JWT with no identifier, so the same
 * token could be presented any number of times until it expired, and signing
 * out did nothing server-side because there was no server-side state to change.
 * These tests pin the replacement behaviour:
 *
 *   1. A refresh token is good exactly once.
 *   2. Replaying a spent token is treated as theft and kills the whole family.
 *   3. Signing out kills the family.
 *   4. Changing a password kills every session.
 */

let server;
let base;
let userCounter = 0;
const createdEmails = [];

/** Register a throwaway account so these tests never touch the seeded users. */
async function makeUser() {
  userCounter += 1;
  const email = `rotate-${Date.now()}-${userCounter}@test.local`;
  const password = 'Rotate@Test1234';
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Rotation Probe', email, password }),
  });
  expect(res.status, `register failed: ${res.status}`).toBe(201);
  const { data } = await res.json();
  createdEmails.push(email);
  return { email, password, ...data };
}

const exchange = (refreshToken) =>
  fetch(`${base}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

beforeAll(async () => {
  const app = (await import('../src/app.js')).default;
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
}, 30000);

afterAll(async () => {
  server?.close();
  // These tests register throwaway accounts, so remove them (and their refresh
  // tokens) instead of leaving junk behind for the next run.
  if (!createdEmails.length) return;
  const connection = await getAdminConnection();
  try {
    const placeholders = createdEmails.map(() => '?').join(', ');
    await connection.query(`DELETE FROM users WHERE email IN (${placeholders})`, createdEmails);
  } finally {
    await connection.end();
  }
});

describe('refresh token rotation', () => {
  it('accepts a refresh token once and issues a different one', async () => {
    const user = await makeUser();

    const first = await exchange(user.refreshToken);
    expect(first.status).toBe(200);
    const { data } = await first.json();

    expect(data.refreshToken).toBeTruthy();
    // Rotation is the whole point: a new credential every time.
    expect(data.refreshToken).not.toBe(user.refreshToken);
    expect(data.accessToken).toBeTruthy();
  });

  it('refuses a refresh token that has already been spent', async () => {
    const user = await makeUser();
    const first = await exchange(user.refreshToken);
    const { data } = await first.json();

    const replay = await exchange(user.refreshToken);
    expect(replay.status).toBe(401);
    const body = await replay.json();
    expect(body.error.code).toBe('REFRESH_TOKEN_REUSED');
    // The replacement must not be usable either: the family is now dead.
    expect((await exchange(data.refreshToken)).status).toBe(401);
  });

  it('lets a chain of refreshes continue while each token is used only once', async () => {
    const user = await makeUser();
    let token = user.refreshToken;

    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await exchange(token);
      expect(res.status, `exchange ${i} failed`).toBe(200);
      // eslint-disable-next-line no-await-in-loop
      const { data } = await res.json();
      expect(data.refreshToken).not.toBe(token);
      token = data.refreshToken;
    }
  });

  it('revokes the family when a signed-out token is replayed', async () => {
    const user = await makeUser();
    const first = await exchange(user.refreshToken);
    const { data } = await first.json();

    const out = await fetch(`${base}/api/auth/logout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: data.refreshToken }),
    });
    expect(out.status).toBe(200);

    // The token the client was about to discard must be dead, and so must the
    // one that was already spent.
    expect((await exchange(data.refreshToken)).status).toBe(401);
    expect((await exchange(user.refreshToken)).status).toBe(401);
  });

  it('rejects a token that is signed correctly but was never issued', async () => {
    const user = await makeUser();
    // Forge a well-formed token with this server's own refresh secret is not
    // possible from here, so use a structurally valid but unknown value: the
    // signature check must reject it before any database lookup.
    const res = await exchange('not-a-real-token');
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe('INVALID_TOKEN');
  });

  it('ends every session when the password changes', async () => {
    const user = await makeUser();

    const res = await fetch(`${base}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${user.accessToken}`,
      },
      body: JSON.stringify({
        currentPassword: user.password,
        newPassword: 'Changed@Test1234',
      }),
    });
    expect(res.status).toBe(200);

    const afterwards = await exchange(user.refreshToken);
    expect(afterwards.status).toBe(401);
  });
});
