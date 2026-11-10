'use strict';
/*
 * Ad Reel Studio: a small password-protected web app that sends product photos
 * to Higgsfield's API, tracks the generations, and serves the finished clips
 * back to the browser, where overlays, captions and per-platform exports are made.
 *
 * Environment variables (set them in Hostinger, never in code):
 *   APP_PASSWORD    password to open the app (8+ characters). Without it the app
 *                   opens to anyone as a look-only preview: nothing that talks to
 *                   Higgsfield or to saved videos works, even if HF_API_KEY is set.
 *   HF_API_KEY      Higgsfield key, "KEY_ID:KEY_SECRET"
 *   SESSION_SECRET  optional, keeps sessions across password changes
 *   DATA_DIR        optional, where job records and cached clips live
 *   PORT            set by the host
 */
const express = require('express');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

const auth = require('./lib/auth');
const hf = require('./lib/higgsfield');
const { buildRequest, publicModels, InputError } = require('./lib/models');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

/* ---------- storage ---------- */
function pickDataDir() {
  const tries = [process.env.DATA_DIR, path.join(os.homedir(), 'ad-reel-studio-data'), path.join(__dirname, 'data')].filter(Boolean);
  for (const d of tries) {
    try { fs.mkdirSync(path.join(d, 'clips'), { recursive: true }); fs.accessSync(d, fs.constants.W_OK); return d; } catch (e) { /* next */ }
  }
  throw new Error('No writable data folder');
}
const DATA = pickDataDir();
const JOBS_FILE = path.join(DATA, 'jobs.json');
const CLIPS = path.join(DATA, 'clips');
const MAX_JOBS = 300, MAX_CLIPS = 80;

let jobs = [];
try { jobs = JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8')); if (!Array.isArray(jobs)) jobs = []; } catch (e) { jobs = []; }
let saving = Promise.resolve();
function saveJobs() {
  jobs = jobs.slice(-MAX_JOBS);
  const snapshot = JSON.stringify(jobs, null, 1);
  saving = saving.then(async () => {
    const tmp = JOBS_FILE + '.tmp';
    await fsp.writeFile(tmp, snapshot);
    await fsp.rename(tmp, JOBS_FILE);
  }).catch(e => console.error('saving jobs failed', e.message));
  return saving;
}
const findJob = id => jobs.find(j => j.id === id);
const TERMINAL = new Set(['completed', 'failed', 'nsfw', 'canceled', 'cancelled']);
function publicJob(j) {
  return {
    id: j.id, created: j.created, model: j.model, modelLabel: j.modelLabel, shape: j.shape, aspect: j.aspect,
    duration: j.duration, prompt: j.prompt, product: j.product, status: j.status, error: j.error || null,
    estimate: j.estimate || null, hasVideo: !!(j.videoUrl || j.cached), videoExpires: j.videoExpires || null,
    cached: !!j.cached, startFrame: j.startFrame || null
  };
}

/* ---------- security headers ---------- */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' blob: data: https:",
    "media-src 'self' blob:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'"
  ].join('; '));
  next();
});

/* ---------- login ---------- */
const pub = path.join(__dirname, 'public');
app.get('/healthz', (req, res) => res.json({ ok: true }));
const openPreview = () => !auth.configured();
app.get('/login', (req, res) => openPreview() ? res.redirect('/') : res.sendFile(path.join(pub, 'login.html')));
app.get(['/login.css', '/style.css'], (req, res) => res.sendFile(path.join(pub, 'style.css')));
app.get('/login.js', (req, res) => res.sendFile(path.join(pub, 'login.js')));
app.get('/api/setup', (req, res) => res.json({ password: auth.configured(), higgsfield: hf.configured() }));

app.post('/api/login', express.json({ limit: '4kb' }), (req, res) => {
  const ip = req.ip || 'unknown';
  if (!auth.configured()) return res.status(503).json({ error: 'The app password is not set yet. Add APP_PASSWORD in Hostinger.' });
  if (auth.limited(ip)) return res.status(429).json({ error: 'Too many tries. Wait 15 minutes and try again.' });
  if (!auth.checkPassword(req.body && req.body.password)) { auth.fail(ip); return res.status(401).json({ error: 'That password is not right.' }); }
  auth.setSession(res, req.secure);
  res.json({ ok: true });
});
app.post('/api/logout', (req, res) => { auth.clearSession(res, req.secure); res.json({ ok: true }); });

/* everything below needs a session, except in the open preview */
const PREVIEW_OK = new Set(['/api/config', '/api/jobs']);
app.use((req, res, next) => {
  if (openPreview()) {
    // Open preview: pages and the look-only API calls work for anyone.
    // Anything that would reach Higgsfield (and spend credits) or touch saved videos is refused.
    if (!req.path.startsWith('/api/')) return next();
    if (req.method === 'GET' && PREVIEW_OK.has(req.path)) return next();
    return res.status(403).json({ error: 'Generation is off on this open preview. Add APP_PASSWORD in Hostinger first, then the Higgsfield key.' });
  }
  if (auth.isAuthed(req)) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Please sign in again.' });
  res.redirect('/login');
});
// only accept state-changing API calls from our own pages
app.use('/api', (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') return next();
  if (req.get('X-Requested-With') !== 'ars') return res.status(403).json({ error: 'Blocked request.' });
  next();
});

app.use(express.static(pub, { index: 'index.html', extensions: ['html'], maxAge: '5m' }));

/* ---------- API ---------- */
const wrap = fn => (req, res) => fn(req, res).catch(e => {
  const status = e instanceof InputError ? 400 : (e.status && e.status >= 400 && e.status < 600 ? e.status : 502);
  if (!(e instanceof InputError)) console.error('[api]', req.method, req.path, status, e.message, e.correlationId || '');
  res.status(status).json({ error: e.message || 'Something went wrong.', correlationId: e.correlationId || null, retryAfter: e.retryAfter || null });
});

app.get('/api/config', (req, res) => res.json({
  models: publicModels(),
  open: openPreview(),
  keySet: hf.configured(),
  higgsfield: hf.configured() && !openPreview()
}));

app.post('/api/upload', express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '20mb' }), wrap(async (req, res) => {
  if (!Buffer.isBuffer(req.body) || !req.body.length) throw new InputError('Send a JPEG, PNG or WebP image.');
  const type = req.get('Content-Type').split(';')[0].trim();
  const url = await hf.uploadImage(req.body, type);
  res.json({ url });
}));

function requestFrom(body) {
  const b = body || {};
  return buildRequest(b.model, { prompt: b.prompt, imageUrl: b.imageUrl, duration: b.duration, audio: b.audio,
    resolution: b.resolution, aspect: b.aspect, multiShot: b.multiShot, shots: b.shots });
}

app.post('/api/estimate', express.json({ limit: '64kb' }), wrap(async (req, res) => {
  const { endpoint, body } = requestFrom(req.body);
  res.json({ estimate: await hf.estimate(endpoint, body) });
}));

app.post('/api/generate', express.json({ limit: '64kb' }), wrap(async (req, res) => {
  const b = req.body || {};
  const key = String(b.idempotencyKey || '');
  if (!/^[A-Za-z0-9-]{16,64}$/.test(key)) throw new InputError('Missing request key.');
  const dup = jobs.find(j => j.idempotencyKey === key);
  if (dup) return res.json({ job: publicJob(dup) });
  const { endpoint, body, duration } = requestFrom(b);
  const r = await hf.submit(endpoint, body, key);
  if (!r || !r.request_id) throw Object.assign(new Error('Higgsfield did not return a request id.'), { status: 502 });
  const job = {
    id: crypto.randomUUID(), idempotencyKey: key, created: new Date().toISOString(),
    model: b.model, modelLabel: (publicModels()[b.model] || {}).label || b.model,
    shape: String(b.shape || '').slice(0, 20), aspect: String(b.aspectLabel || b.aspect || '').slice(0, 8),
    duration, prompt: body.prompt, shots: body.multi_prompt || null,
    product: String(b.productName || '').slice(0, 120), startFrame: body.image_url || (body.image_urls && body.image_urls[0]) || null,
    requestId: r.request_id, status: r.status || 'queued', estimate: b.estimate || null
  };
  jobs.push(job);
  await saveJobs();
  res.json({ job: publicJob(job) });
}));

app.get('/api/jobs', (req, res) => res.json({ jobs: openPreview() ? [] : jobs.slice().reverse().map(publicJob) }));

const refreshing = new Map();
async function refresh(job) {
  if (TERMINAL.has(job.status)) return job;
  if (refreshing.has(job.id)) return refreshing.get(job.id);
  const p = (async () => {
    const s = await hf.status(job.requestId);
    job.status = s.status || job.status;
    if (s.status === 'completed') {
      const v = s.video || (s.videos && s.videos[0]) || {};
      job.videoUrl = v.url || null;
      job.videoExpires = v.expires_at || null;
    } else if (s.status === 'failed') {
      job.error = (s.error && (s.error.message || s.error)) || s.detail || 'Higgsfield could not make this video.';
    } else if (s.status === 'nsfw') {
      job.error = 'Higgsfield flagged this request and did not make the video. Credits for flagged requests are usually returned.';
    }
    await saveJobs();
    return job;
  })().finally(() => refreshing.delete(job.id));
  refreshing.set(job.id, p);
  return p;
}

app.get('/api/jobs/:id', wrap(async (req, res) => {
  const job = findJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'No such video.' });
  await refresh(job);
  res.json({ job: publicJob(job) });
}));

app.post('/api/jobs/:id/cancel', wrap(async (req, res) => {
  const job = findJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'No such video.' });
  await hf.cancel(job.requestId);
  job.status = 'canceled';
  await saveJobs();
  res.json({ job: publicJob(job) });
}));

app.delete('/api/jobs/:id', wrap(async (req, res) => {
  const job = findJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'No such video.' });
  if (job.cached) await fsp.rm(path.join(CLIPS, job.cached), { force: true });
  jobs = jobs.filter(j => j !== job);
  await saveJobs();
  res.json({ ok: true });
}));

/* Serve the finished clip from our own address, so the browser can draw it
   on a canvas. The first request downloads and keeps a copy here, because
   Higgsfield deletes outputs after about 7 days. */
const downloading = new Map();
async function cacheClip(job) {
  if (job.cached && fs.existsSync(path.join(CLIPS, job.cached))) return job.cached;
  if (downloading.has(job.id)) return downloading.get(job.id);
  const p = (async () => {
    if (!job.videoUrl) throw Object.assign(new Error('This video is not ready yet.'), { status: 409 });
    const u = new URL(job.videoUrl);
    if (u.protocol !== 'https:' && !(process.env.ARS_TEST_ALLOW_HTTP === '1' && u.hostname === '127.0.0.1')) throw Object.assign(new Error('Unexpected video address.'), { status: 502 });
    const r = await fetch(u, { signal: AbortSignal.timeout(180000) });
    if (!r.ok || !r.body) throw Object.assign(new Error('The finished video could not be downloaded from Higgsfield. It may have expired.'), { status: 502 });
    const name = job.id + '.mp4', tmp = path.join(CLIPS, name + '.part');
    await pipeline(Readable.fromWeb(r.body), fs.createWriteStream(tmp));
    await fsp.rename(tmp, path.join(CLIPS, name));
    job.cached = name;
    await pruneClips();
    await saveJobs();
    return name;
  })().finally(() => downloading.delete(job.id));
  downloading.set(job.id, p);
  return p;
}
async function pruneClips() {
  const withClip = jobs.filter(j => j.cached);
  for (const j of withClip.slice(0, Math.max(0, withClip.length - MAX_CLIPS))) {
    await fsp.rm(path.join(CLIPS, j.cached), { force: true });
    j.cached = null;
  }
}

app.get('/api/jobs/:id/video', wrap(async (req, res) => {
  const job = findJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'No such video.' });
  await refresh(job);
  const name = await cacheClip(job);
  const safe = (job.product || 'clip').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'clip';
  if (req.query.download) res.setHeader('Content-Disposition', `attachment; filename="${safe}-${job.shape || 'video'}-raw.mp4"`);
  res.sendFile(path.join(CLIPS, name), { headers: { 'Content-Type': 'video/mp4', 'Cache-Control': 'private, max-age=86400' } });
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

const PORT = Number(process.env.PORT) || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Ad Reel Studio on port ${PORT}. Data in ${DATA}.`);
    if (!auth.configured()) console.warn('APP_PASSWORD is not set (8+ characters). The app is an open, look-only preview and will not generate until it is.');
    if (!hf.configured()) console.warn('HF_API_KEY is not set. Generations are off until it is.');
  });
}
module.exports = app;
