'use strict';
/*
 * Minimal Higgsfield REST client. Runs only on the server: the API key comes
 * from the environment and is never sent to the browser.
 *
 *   HF_API_KEY      "KEY_ID:KEY_SECRET" as shown in console.higgsfield.ai
 *   (or HF_KEY_ID + HF_KEY_SECRET)
 *   HF_BASE_URL     optional, for tests only
 */
const BASE = (process.env.HF_BASE_URL || 'https://api.higgsfield.ai').replace(/\/+$/, '');

function credentials() {
  const one = (process.env.HF_API_KEY || process.env.HF_CREDENTIALS || '').trim();
  if (one) return one.replace(/^Key\s+/i, '');
  const id = (process.env.HF_KEY_ID || process.env.HF_API_KEY_ID || '').trim();
  const secret = (process.env.HF_KEY_SECRET || process.env.HF_API_KEY_SECRET || '').trim();
  return id && secret ? `${id}:${secret}` : '';
}
function configured() { return /^[^:\s]+:[^\s]+$/.test(credentials()); }

class HFError extends Error {
  constructor(status, detail, extra) {
    super(friendly(status, detail));
    this.status = status;
    this.detail = detail;
    Object.assign(this, extra || {});
  }
}
function friendly(status, detail) {
  const d = typeof detail === 'string' ? detail : (detail && (detail.message || JSON.stringify(detail))) || '';
  switch (status) {
    case 401: return 'Higgsfield did not accept the API key. Check HF_API_KEY in Hostinger.';
    case 403: return /balance|credit/i.test(d) ? 'Your Higgsfield balance is too low for this video.' : `Higgsfield refused the request${d ? ': ' + d : '.'}`;
    case 404: return `Higgsfield could not find that${d ? ': ' + d : '.'}`;
    case 409: return `Higgsfield says this request conflicts with another${d ? ': ' + d : '.'}`;
    case 422: return `Higgsfield could not use these settings${d ? ': ' + d : '.'}`;
    case 423: return 'Higgsfield has this request locked for now. Try again in a minute.';
    case 429: return 'Your Higgsfield queue is full. Wait for a video to finish, then try again.';
    case 503: return 'Higgsfield is busy right now. Try again in a minute.';
    default: return `Higgsfield error ${status || ''}${d ? ': ' + d : ''}`.trim();
  }
}

async function call(method, path, body, headers) {
  if (!configured()) throw new HFError(0, 'not configured', { message: 'The Higgsfield API key is not set yet.' });
  const res = await fetch(BASE + path, {
    method,
    headers: Object.assign({
      Authorization: `Key ${credentials()}`,
      Accept: 'application/json',
      'User-Agent': 'ad-reel-studio/1.0'
    }, body !== undefined ? { 'Content-Type': 'application/json' } : {}, headers || {}),
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60000)
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }
  if (!res.ok) {
    throw new HFError(res.status, json && json.detail !== undefined ? json.detail : text.slice(0, 300), {
      correlationId: res.headers.get('x-correlation-id') || null,
      retryAfter: res.headers.get('retry-after') || null
    });
  }
  return json;
}

const ALLOWED_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Upload one image to Higgsfield storage and return its public URL. */
async function uploadImage(buffer, contentType) {
  if (!ALLOWED_UPLOAD_TYPES.includes(contentType)) throw new HFError(400, 'Only JPEG, PNG or WebP images can be uploaded.');
  const slot = await call('POST', '/files/generate-upload-url', { content_type: contentType });
  if (!slot || !slot.upload_url || !slot.public_url) throw new HFError(502, 'Higgsfield did not return an upload address.');
  const put = await fetch(slot.upload_url, {
    method: 'PUT',
    headers: Object.assign({ 'Content-Type': slot.content_type || contentType }, slot.upload_headers || {}),
    body: buffer,
    signal: AbortSignal.timeout(120000)
  });
  if (!put.ok) throw new HFError(put.status, 'The image upload to Higgsfield storage failed.');
  return slot.public_url;
}

/** Ask Higgsfield what a request would cost. Returns a USD string or null. */
async function estimate(endpoint, body) {
  try {
    const r = await call('POST', '/estimate/' + endpoint, body);
    if (r && (r.usd !== undefined || r.credits !== undefined)) return { usd: r.usd ?? null, credits: r.credits ?? null };
    return null;
  } catch (e) {
    if (e.status === 401) throw e;
    return null; // estimate isn't documented for every video model; the app just shows "no estimate"
  }
}

async function submit(endpoint, body, idempotencyKey) {
  return call('POST', '/' + endpoint, body, idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined);
}
function safeId(id) {
  if (!/^[A-Za-z0-9_-]{4,128}$/.test(String(id || ''))) throw new HFError(400, 'Bad request id.');
  return id;
}
async function status(requestId) { return call('GET', `/requests/${safeId(requestId)}/status`); }
async function cancel(requestId) { return call('POST', `/requests/${safeId(requestId)}/cancel`); }

module.exports = { configured, uploadImage, estimate, submit, status, cancel, HFError, BASE };
