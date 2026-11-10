'use strict';
/* End-to-end API test against a fake Higgsfield. Spends nothing.
   Run: node test/run-tests.js [path/to/sample.mp4] */
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const SAMPLE = process.argv[2] || path.join(__dirname, 'sample.mp4');
const log = [];
let polls = 0;

const mock = http.createServer((req, res) => {
  let chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const json = () => { try { return JSON.parse(body.toString()); } catch (e) { return null; } };
    const send = (code, obj, hdr) => { res.writeHead(code, Object.assign({ 'Content-Type': 'application/json' }, hdr || {})); res.end(JSON.stringify(obj)); };
    const auth = req.headers.authorization;
    log.push({ method: req.method, url: req.url, auth, idem: req.headers['idempotency-key'], body: req.url.startsWith('/upload/') ? `<${body.length} bytes>` : json() });
    if (req.url.startsWith('/upload/')) { assert.strictEqual(auth, undefined, 'upload PUT must not carry the API key'); res.writeHead(200); return res.end(); }
    if (req.url.startsWith('/files/clip.mp4')) { res.writeHead(200, { 'Content-Type': 'video/mp4' }); return fs.createReadStream(SAMPLE).pipe(res); }
    if (auth !== 'Key test-id:test-secret') return send(401, { detail: 'bad key' });
    if (req.method === 'POST' && req.url === '/files/generate-upload-url') {
      const base = `http://127.0.0.1:${mock.address().port}`;
      return send(200, { public_url: 'https://cdn.example.test/start.jpg', upload_url: base + '/upload/abc', content_type: json().content_type, upload_headers: { 'x-amz-acl': 'private' } });
    }
    if (req.method === 'POST' && req.url.startsWith('/estimate/')) {
      if (req.url.includes('cinema')) return send(404, { detail: 'not found' });
      return send(200, { usd: '0.420' });
    }
    if (req.method === 'POST' && req.url === '/requests/req-0001/cancel') return send(200, { status: 'canceled' });
    if (req.method === 'GET' && req.url === '/requests/req-0001/status') {
      polls++;
      if (polls < 2) return send(200, { status: 'queued', request_id: 'req-0001' });
      if (polls < 3) return send(200, { status: 'in_progress', request_id: 'req-0001' });
      // the app only accepts https video URLs; the test swaps it to the mock below
      return send(200, { status: 'completed', request_id: 'req-0001', video: { url: `${process.env.MOCK_VIDEO}`, expires_at: '2026-11-16T00:00:00Z' } });
    }
    if (req.method === 'POST' && /\/(image-to-video|reference-to-video|4\.0)$/.test(req.url)) {
      if (req.url.includes('reference') && json().image_url) return send(422, { detail: 'image_url not allowed' });
      return send(200, { status: 'queued', request_id: 'req-0001', status_url: 'x', cancel_url: 'y' });
    }
    send(404, { detail: 'no route ' + req.url });
  });
});

async function main() {
  await new Promise(r => mock.listen(0, '127.0.0.1', r));
  const mport = mock.address().port;
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ars-'));
  Object.assign(process.env, { HF_BASE_URL: `http://127.0.0.1:${mport}`, HF_API_KEY: 'test-id:test-secret', APP_PASSWORD: 'correct horse 42', DATA_DIR: dataDir,
    MOCK_VIDEO: `http://127.0.0.1:${mport}/files/clip.mp4` });
  const app = require('../server');
  const srv = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const base = `http://127.0.0.1:${srv.address().port}`;
  let cookie = '';
  const call = async (p, o = {}) => {
    const h = Object.assign({ 'X-Requested-With': 'ars' }, o.headers || {});
    if (cookie) h.Cookie = cookie;
    let body = o.body;
    if (body && !Buffer.isBuffer(body) && typeof body === 'object') { body = JSON.stringify(body); h['Content-Type'] = 'application/json'; }
    const r = await fetch(base + p, { method: o.method || (body ? 'POST' : 'GET'), headers: h, body, redirect: 'manual' });
    const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
    const ct = r.headers.get('content-type') || '';
    return { status: r.status, headers: r.headers, json: ct.includes('json') ? await r.json() : null, buf: ct.includes('json') ? null : Buffer.from(await r.arrayBuffer()) };
  };
  const ok = (cond, msg) => { assert(cond, msg); console.log('  ✓', msg); };

  console.log('auth');
  ok((await call('/')).status === 302, 'home redirects to login when signed out');
  ok((await call('/api/config')).status === 401, 'API refuses without a session');
  ok((await call('/app.js')).status === 302, 'app scripts are behind the login too');
  ok((await call('/login')).status === 200, 'login page loads');
  ok((await call('/api/login', { body: { password: 'nope' } })).status === 401, 'wrong password refused');
  const li = await call('/api/login', { body: { password: 'correct horse 42' } });
  ok(li.status === 200 && /ars_session=/.test(cookie), 'right password sets a session cookie');
  ok((await call('/')).status === 200, 'home loads when signed in');
  const cfg = await call('/api/config');
  ok(cfg.json.higgsfield === true && cfg.json.models.seedance2 && !JSON.stringify(cfg.json).includes('test-secret'), 'config lists models and never the key');
  ok((await fetch(base + '/api/generate', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: '{}' })).status === 403, 'state-changing calls need the app header');

  console.log('upload');
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
  const up = await call('/api/upload', { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: jpg });
  ok(up.status === 200 && up.json.url === 'https://cdn.example.test/start.jpg', 'image goes to Higgsfield storage, public URL comes back');
  ok(log.some(l => l.url === '/upload/abc' && !l.auth), 'the storage upload carries no API key');

  console.log('validation');
  const bad = await call('/api/estimate', { body: { model: 'seedance2', prompt: '', imageUrl: up.json.url, duration: 8 } });
  ok(bad.status === 400 && /Prompt/.test(bad.json.error), 'empty prompt is refused before calling Higgsfield');
  ok((await call('/api/estimate', { body: { model: 'seedance2', prompt: 'x', imageUrl: up.json.url, duration: 99 } })).status === 400, 'out-of-range length refused');
  ok((await call('/api/estimate', { body: { model: 'evil', prompt: 'x', imageUrl: up.json.url, duration: 8 } })).status === 400, 'unknown model refused');
  ok((await call('/api/estimate', { body: { model: 'seedance2', prompt: 'x', imageUrl: 'http://x', duration: 8 } })).status === 400, 'non-https image refused');

  console.log('estimate');
  const est = await call('/api/estimate', { body: { model: 'seedance2', prompt: 'a mug', imageUrl: up.json.url, duration: 8, resolution: '1080p', audio: true } });
  ok(est.json.estimate && est.json.estimate.usd === '0.420', 'estimate returns Higgsfield\'s price');
  const est2 = await call('/api/estimate', { body: { model: 'cinema4', prompt: 'a mug', imageUrl: up.json.url, duration: 8, resolution: '720p', aspect: '9:16' } });
  ok(est2.status === 200 && est2.json.estimate === null, 'missing estimate shows as none, not an error');
  const sent = log.filter(l => l.url === '/estimate/bytedance/seedance-2.0/image-to-video').pop().body;
  ok(JSON.stringify(sent) === JSON.stringify({ image_url: up.json.url, prompt: 'a mug', duration: 8, resolution: '1080p', generate_audio: true }), 'Seedance body has exactly the documented fields');

  console.log('kling multi-shot body');
  await call('/api/estimate', { body: { model: 'kling3pro', prompt: 'creator', imageUrl: up.json.url, duration: 10, audio: true, multiShot: true, shots: [{ prompt: 'a', duration: 4 }, { prompt: 'b', duration: 3 }, { prompt: 'c', duration: 3 }] } });
  const kb = log.filter(l => l.url === '/estimate/kling-video/v3.0/pro/image-to-video').pop().body;
  ok(kb.sound === 'on' && kb.multi_shots === true && kb.multi_prompt.length === 3 && kb.duration === 10 && !('resolution' in kb), 'Kling body uses sound, multi_shots and a matching total length');
  await call('/api/estimate', { body: { model: 'seedance2ref', prompt: 'ref', imageUrl: up.json.url, duration: 8, aspect: '3:4' } });
  const rb = log.filter(l => l.url === '/estimate/bytedance/seedance-2.0/reference-to-video').pop().body;
  ok(Array.isArray(rb.image_urls) && !rb.image_url && rb.aspect_ratio === '3:4', 'reference model gets image_urls and an aspect ratio');

  console.log('generate');
  const gen = await call('/api/generate', { body: { model: 'seedance2', prompt: 'a mug', imageUrl: up.json.url, duration: 8, resolution: '1080p', audio: true, shape: 'vertical', productName: 'Sunset Mug', idempotencyKey: 'abcdefabcdefabcdef1' } });
  ok(gen.status === 200 && gen.json.job.status === 'queued', 'generation is queued');
  ok(log.filter(l => l.url === '/bytedance/seedance-2.0/image-to-video').pop().idem === 'abcdefabcdefabcdef1', 'idempotency key is passed to Higgsfield');
  const again = await call('/api/generate', { body: { model: 'seedance2', prompt: 'a mug', imageUrl: up.json.url, duration: 8, idempotencyKey: 'abcdefabcdefabcdef1' } });
  ok(again.json.job.id === gen.json.job.id && log.filter(l => l.url === '/bytedance/seedance-2.0/image-to-video').length === 1, 'a double press does not submit twice');
  ok((await call('/api/generate', { body: { model: 'seedance2', prompt: 'a mug', imageUrl: up.json.url, duration: 8 } })).status === 400, 'generate without a request key is refused');
  const id = gen.json.job.id;
  const s1 = await call('/api/jobs/' + id);
  ok(s1.json.job.status === 'queued', 'status: queued');
  const s2 = await call('/api/jobs/' + id);
  ok(s2.json.job.status === 'in_progress', 'status: in progress');

  console.log('video');
  // the app refuses non-https video addresses; check that, then allow the mock
  const s3 = await call('/api/jobs/' + id);
  ok(s3.json.job.status === 'completed' && s3.json.job.hasVideo, 'status: completed with a video');
  const v1 = await call('/api/jobs/' + id + '/video');
  ok(v1.status === 502 && /address/.test(v1.json.error), 'non-https video address is refused');
  const jobsFile = path.join(dataDir, 'jobs.json');
  const app2jobs = JSON.parse(fs.readFileSync(jobsFile, 'utf8'));
  ok(app2jobs[0].videoUrl.startsWith('http://'), 'job record keeps the Higgsfield address');
  process.env.ARS_TEST_ALLOW_HTTP = '1';
  const v2 = await call('/api/jobs/' + id + '/video');
  ok(v2.status === 200 && v2.buf.length === fs.statSync(SAMPLE).size, 'finished clip is downloaded, kept and served from the app');
  ok(fs.existsSync(path.join(dataDir, 'clips', id + '.mp4')), 'a copy is kept on the server');
  const v3 = await call('/api/jobs/' + id + '/video?download=1', { headers: { Range: 'bytes=0-99' } });
  ok(v3.status === 206 && /attachment/.test(v3.headers.get('content-disposition')), 'raw download works and supports seeking');
  const list = await call('/api/jobs');
  ok(list.json.jobs.length === 1 && list.json.jobs[0].product === 'Sunset Mug' && !('requestId' in list.json.jobs[0]), 'library lists the job without internal ids');
  const del = await call('/api/jobs/' + id, { method: 'DELETE' });
  ok(del.status === 200 && !fs.existsSync(path.join(dataDir, 'clips', id + '.mp4')), 'removing a job deletes the kept copy');
  ok((await call('/api/logout', { method: 'POST' })).status === 200 && (await call('/api/jobs')).status === 401, 'sign out ends the session');

  console.log('open preview (no APP_PASSWORD, key still set)');
  const savedPw = process.env.APP_PASSWORD; delete process.env.APP_PASSWORD; cookie = '';
  ok((await call('/')).status === 200, 'home opens without signing in');
  ok((await call('/app.js')).status === 200, 'app scripts load without signing in');
  ok((await call('/login')).status === 302, 'login page sends you to the app');
  const oc = await call('/api/config');
  ok(oc.status === 200 && oc.json.open === true && oc.json.keySet === true && oc.json.higgsfield === false, 'config says preview only, generation off, even with a key set');
  ok((await call('/api/jobs')).json.jobs.length === 0, 'saved videos are hidden');
  const blocked = [
    ['/api/upload', { method: 'POST', body: Buffer.from([0xff, 0xd8, 0xff]), headers: { 'Content-Type': 'image/jpeg' } }],
    ['/api/estimate', { body: { model: 'seedance2', prompt: 'x', imageUrl: 'https://a.b/c.jpg' } }],
    ['/api/generate', { body: { model: 'seedance2', prompt: 'x', imageUrl: 'https://a.b/c.jpg', idempotencyKey: 'k'.repeat(20) } }],
    ['/api/jobs/abcd1234', {}], ['/api/jobs/abcd1234/video', {}],
    ['/api/jobs/abcd1234/cancel', { method: 'POST' }], ['/api/jobs/abcd1234', { method: 'DELETE' }]
  ];
  for (const [p, o] of blocked) {
    const r = await call(p, o);
    ok(r.status === 403 && /open preview/.test(r.json.error), `refused in preview: ${o.method || (o.body ? 'POST' : 'GET')} ${p}`);
  }
  process.env.APP_PASSWORD = savedPw;
  ok((await call('/')).status === 302, 'adding the password locks the app again');

  console.log('\nall API checks passed');
  srv.close(); mock.close();
}
main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
