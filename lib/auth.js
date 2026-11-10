'use strict';
/* Password gate: one shared password from APP_PASSWORD, signed session cookie. */
const crypto = require('crypto');

const COOKIE = 'ars_session';
const MAX_AGE_S = 60 * 60 * 24 * 14; // two weeks

function password() { return process.env.APP_PASSWORD || ''; }
function configured() { return password().length >= 8; }
function secret() {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16) return process.env.SESSION_SECRET;
  // Derived from the password, so changing the password signs everyone out.
  return crypto.createHash('sha256').update('ars-session:' + password()).digest('hex');
}
function sign(payload) { return crypto.createHmac('sha256', secret()).update(payload).digest('base64url'); }
function makeToken() {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_S;
  const payload = `${exp}.${crypto.randomBytes(9).toString('base64url')}`;
  return `${payload}.${sign(payload)}`;
}
function validToken(tok) {
  if (!tok || typeof tok !== 'string') return false;
  const i = tok.lastIndexOf('.');
  if (i < 0) return false;
  const payload = tok.slice(0, i), mac = tok.slice(i + 1);
  const want = sign(payload);
  if (mac.length !== want.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(want))) return false;
  const exp = Number(payload.split('.')[0]);
  return Number.isFinite(exp) && exp > Date.now() / 1000;
}
function readCookie(req, name) {
  const h = req.headers.cookie || '';
  for (const part of h.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}
function checkPassword(input) {
  const a = crypto.createHash('sha256').update(String(input || '')).digest();
  const b = crypto.createHash('sha256').update(password()).digest();
  return configured() && crypto.timingSafeEqual(a, b);
}

// simple in-memory limit: 8 wrong tries per 15 minutes per address
const tries = new Map();
function limited(ip) {
  const now = Date.now(), r = tries.get(ip);
  if (!r || now - r.start > 15 * 60 * 1000) return false;
  return r.n >= 8;
}
function fail(ip) {
  const now = Date.now(), r = tries.get(ip);
  if (!r || now - r.start > 15 * 60 * 1000) tries.set(ip, { start: now, n: 1 });
  else r.n++;
}

function setSession(res, secure) {
  res.setHeader('Set-Cookie', `${COOKIE}=${makeToken()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE_S}${secure ? '; Secure' : ''}`);
}
function clearSession(res, secure) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`);
}
function isAuthed(req) { return configured() && validToken(readCookie(req, COOKIE)); }

module.exports = { configured, checkPassword, limited, fail, setSession, clearSession, isAuthed };
