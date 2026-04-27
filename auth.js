const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Optional: RS256 public key for bot command JWT verification
let PUBLIC_KEY = null;
const keyPath = process.env.JWT_PUBLIC_KEY_PATH || './keys/public.pem';
try {
  PUBLIC_KEY = fs.readFileSync(path.resolve(keyPath), 'utf8');
} catch {
  // No public key — bot command JWT verification disabled
}

// SESSION_SECRET is required for stable sessions across restarts.
// In production server.js refuses to start without it; in dev we fall back to
// a random secret and warn so you know why your token stopped working.
const SESSION_SECRET = process.env.SESSION_SECRET ||
  (process.env.NODE_ENV === 'production' ? '' : crypto.randomBytes(32).toString('hex'));
const ALLOWED_USER_IDS = new Set(
  (process.env.ALLOWED_USER_IDS || '').split(',').map(id => id.trim()).filter(Boolean)
);
const BOT_TOKEN = process.env.BOT_TOKEN || '';

/**
 * Verify a JWT token signed by the bot (RS256).
 * Used when the bot sends a /terminal command with a signed URL.
 */
function verifyBotJWT(token) {
  if (!PUBLIC_KEY) return null;
  try {
    const payload = jwt.verify(token, PUBLIC_KEY, { algorithms: ['RS256'] });
    if (!payload.telegramId) throw new Error('Missing telegramId');
    return payload;
  } catch {
    return null;
  }
}

/**
 * Verify Telegram Mini App initData using HMAC-SHA256.
 * This is the primary authentication method — cryptographically secure.
 * See: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function verifyTelegramInitData(initData) {
  if (!initData || !BOT_TOKEN) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => `${key}=${val}`)
    .join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(expectedHash, 'hex'), Buffer.from(hash, 'hex'))) return null;
  } catch { return null; }
  // Reject stale initData (max 5 minutes)
  const authDate = parseInt(params.get('auth_date'), 10);
  if (isNaN(authDate) || Date.now() / 1000 - authDate > 300) return null;
  try {
    const user = JSON.parse(params.get('user') || '{}');
    return { telegramId: String(user.id), authDate };
  } catch { return null; }
}

/**
 * Create a short-lived session JWT (4h) bound to the client IP.
 */
function createSessionToken(telegramId, clientIp) {
  const ipHash = crypto.createHash('sha256').update(clientIp || 'unknown').digest('hex').slice(0, 16);
  return jwt.sign({ telegramId, ipHash, type: 'session' }, SESSION_SECRET, { expiresIn: '4h' });
}

/**
 * Verify session token and check IP binding + whitelist.
 */
function verifySessionToken(token, clientIp) {
  try {
    const payload = jwt.verify(token, SESSION_SECRET);
    if (payload.type !== 'session') return null;
    const ipHash = crypto.createHash('sha256').update(clientIp || 'unknown').digest('hex').slice(0, 16);
    if (payload.ipHash !== ipHash) return null;
    if (!ALLOWED_USER_IDS.has(String(payload.telegramId))) return null;
    return payload;
  } catch { return null; }
}

function isAllowed(telegramId) {
  return ALLOWED_USER_IDS.has(String(telegramId));
}

module.exports = {
  verifyBotJWT,
  verifyTelegramInitData,
  createSessionToken,
  verifySessionToken,
  isAllowed,
};
