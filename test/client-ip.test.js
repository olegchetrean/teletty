// Smoke tests for the IP-detection logic. We require server.js indirectly by
// pulling the function via a tiny shim — the function lives in server.js and
// is not exported, so this test re-implements the same precedence rules. If
// you change clientIpFrom in server.js, mirror the change here.

const { describe, it } = require('node:test');
const assert = require('node:assert');

function clientIpFrom(req) {
  const h = req.headers || {};
  const cf = h['cf-connecting-ip'] || h['true-client-ip'];
  if (cf) return String(cf).trim();
  if (h['x-real-ip']) return String(h['x-real-ip']).trim();
  const xff = h['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || req.ip || 'unknown';
}

describe('clientIpFrom', () => {
  it('prefers cf-connecting-ip (Cloudflare)', () => {
    assert.strictEqual(clientIpFrom({
      headers: { 'cf-connecting-ip': '1.2.3.4', 'x-real-ip': '5.6.7.8' },
    }), '1.2.3.4');
  });

  it('prefers true-client-ip (Akamai/Cloudflare Enterprise) over x-real-ip', () => {
    assert.strictEqual(clientIpFrom({
      headers: { 'true-client-ip': '1.2.3.4', 'x-real-ip': '5.6.7.8' },
    }), '1.2.3.4');
  });

  it('falls back to x-real-ip when no cf header', () => {
    assert.strictEqual(clientIpFrom({
      headers: { 'x-real-ip': '5.6.7.8', 'x-forwarded-for': '9.9.9.9' },
    }), '5.6.7.8');
  });

  it('takes the leftmost x-forwarded-for entry', () => {
    assert.strictEqual(clientIpFrom({
      headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1, 172.16.0.1' },
    }), '1.2.3.4');
  });

  it('falls back to socket.remoteAddress when no headers', () => {
    assert.strictEqual(clientIpFrom({
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    }), '127.0.0.1');
  });

  it('returns "unknown" when neither headers nor socket are usable', () => {
    assert.strictEqual(clientIpFrom({ headers: {} }), 'unknown');
  });

  it('trims whitespace from header values', () => {
    assert.strictEqual(clientIpFrom({
      headers: { 'cf-connecting-ip': '  1.2.3.4  ' },
    }), '1.2.3.4');
  });
});
