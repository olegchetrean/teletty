const { describe, it } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

// Set env before requiring auth
process.env.BOT_TOKEN = 'test_bot_token_123';
process.env.SESSION_SECRET = 'test_secret_for_jwt_signing_32chars';
process.env.ALLOWED_USER_IDS = '12345,67890';

const auth = require('../auth');

describe('isAllowed', () => {
  it('allows whitelisted user', () => {
    assert.strictEqual(auth.isAllowed('12345'), true);
  });
  it('rejects non-whitelisted user', () => {
    assert.strictEqual(auth.isAllowed('99999'), false);
  });
  it('coerces numbers to strings', () => {
    assert.strictEqual(auth.isAllowed(12345), true);
  });
});

describe('createSessionToken + verifySessionToken', () => {
  it('creates and verifies a valid token', () => {
    const token = auth.createSessionToken('12345', '192.168.1.1');
    const payload = auth.verifySessionToken(token, '192.168.1.1');
    assert.ok(payload);
    assert.strictEqual(payload.telegramId, '12345');
  });

  it('rejects token with wrong IP', () => {
    const token = auth.createSessionToken('12345', '192.168.1.1');
    const payload = auth.verifySessionToken(token, '10.0.0.1');
    assert.strictEqual(payload, null);
  });

  it('rejects token for non-whitelisted user', () => {
    const token = auth.createSessionToken('99999', '192.168.1.1');
    const payload = auth.verifySessionToken(token, '192.168.1.1');
    assert.strictEqual(payload, null);
  });

  it('rejects garbage token', () => {
    const payload = auth.verifySessionToken('invalid.token.here', '192.168.1.1');
    assert.strictEqual(payload, null);
  });
});

describe('verifyTelegramInitData', () => {
  it('verifies valid initData', () => {
    const user = JSON.stringify({ id: 12345, first_name: 'Test' });
    const authDate = String(Math.floor(Date.now() / 1000));
    const params = new URLSearchParams();
    params.set('user', user);
    params.set('auth_date', authDate);

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${key}=${val}`)
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData')
      .update('test_bot_token_123').digest();
    const hash = crypto.createHmac('sha256', secretKey)
      .update(dataCheckString).digest('hex');

    params.set('hash', hash);

    const result = auth.verifyTelegramInitData(params.toString());
    assert.ok(result);
    assert.strictEqual(result.telegramId, '12345');
  });

  it('rejects invalid hash', () => {
    const params = new URLSearchParams();
    params.set('user', JSON.stringify({ id: 12345 }));
    params.set('auth_date', '1234567890');
    params.set('hash', 'invalid_hash');
    assert.strictEqual(auth.verifyTelegramInitData(params.toString()), null);
  });

  it('rejects empty input', () => {
    assert.strictEqual(auth.verifyTelegramInitData(''), null);
    assert.strictEqual(auth.verifyTelegramInitData(null), null);
  });
});
