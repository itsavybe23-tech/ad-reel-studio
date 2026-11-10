'use strict';
/*
 * Higgsfield video models this app can call, with the request fields each one
 * takes (from docs.higgsfield.ai). Only fields listed here are ever sent, so a
 * request can't carry anything unexpected.
 *
 * framing: 'image'  -> output follows the start frame's shape, so the browser
 *                      composes a start frame at the target aspect first.
 *          'aspect' -> the model takes an aspect_ratio field.
 */
const MODELS = {
  seedance2: {
    label: 'Seedance 2.0',
    endpoint: 'bytedance/seedance-2.0/image-to-video',
    framing: 'image',
    duration: { min: 4, max: 15, def: 8 },
    resolutions: ['480p', '720p', '1080p'],
    defRes: '1080p',
    audio: true,
    multiShot: false,
    blurb: 'Keeps your product closest to the photo. Best for clean product shots.'
  },
  kling3pro: {
    label: 'Kling 3.0 Pro',
    endpoint: 'kling-video/v3.0/pro/image-to-video',
    framing: 'image',
    duration: { min: 3, max: 15, def: 10 },
    resolutions: null,
    audio: true,
    multiShot: true,
    blurb: 'Smooth camera moves and natural people. Can cut between up to 6 shots.'
  },
  kling3std: {
    label: 'Kling 3.0 Standard',
    endpoint: 'kling-video/v3.0/std/image-to-video',
    framing: 'image',
    duration: { min: 3, max: 15, def: 8 },
    resolutions: null,
    audio: true,
    multiShot: true,
    blurb: 'Cheaper Kling for drafts and tests.'
  },
  seedance2ref: {
    label: 'Seedance 2.0 Reference',
    endpoint: 'bytedance/seedance-2.0/reference-to-video',
    framing: 'aspect',
    aspects: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9'],
    duration: { min: 4, max: 15, def: 8 },
    resolutions: ['480p', '720p', '1080p'],
    defRes: '1080p',
    audio: true,
    multiShot: false,
    blurb: 'Uses your photo as a reference and builds a new scene around it.'
  },
  cinema4: {
    label: 'Cinema Studio 4.0',
    endpoint: 'higgsfield/cinema-studio/4.0',
    framing: 'aspect',
    aspects: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    duration: { min: 4, max: 30, def: 8 },
    resolutions: ['480p', '720p'],
    defRes: '720p',
    audio: true,
    multiShot: false,
    blurb: 'Higgsfield\'s film-style director model. 720p at most.'
  }
};

class InputError extends Error { constructor(msg) { super(msg); this.status = 400; } }

function str(v, max, name, required) {
  const s = typeof v === 'string' ? v.trim() : '';
  if (required && !s) throw new InputError(`${name} is required.`);
  if (s.length > max) throw new InputError(`${name} is too long (${s.length} of ${max} characters).`);
  return s;
}
function httpsUrl(v, name) {
  let u;
  try { u = new URL(String(v || '')); } catch (e) { throw new InputError(`${name} must be a web address.`); }
  if (u.protocol !== 'https:') throw new InputError(`${name} must start with https.`);
  return u.toString();
}
function int(v, min, max, name) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new InputError(`${name} must be a whole number from ${min} to ${max}.`);
  return n;
}

/** Turn the browser's request into the exact Higgsfield body for one model. */
function buildRequest(modelId, input) {
  const M = MODELS[modelId];
  if (!M) throw new InputError('Unknown model.');
  input = input || {};
  const prompt = str(input.prompt, 2500, 'Prompt', true);
  const imageUrl = httpsUrl(input.imageUrl, 'Image');
  let duration = int(input.duration, M.duration.min, M.duration.max, 'Length');
  const audio = !!input.audio;
  const body = {};

  if (modelId === 'kling3pro' || modelId === 'kling3std') {
    body.image_url = imageUrl;
    body.prompt = prompt;
    body.sound = audio ? 'on' : 'off';
    const shots = Array.isArray(input.shots) ? input.shots : [];
    if (input.multiShot && shots.length) {
      if (shots.length > 6) throw new InputError('Kling takes at most 6 shots.');
      body.multi_shots = true;
      body.multi_prompt = shots.map((s, i) => ({
        prompt: str(s && s.prompt, 512, `Shot ${i + 1}`, true),
        duration: int(s && s.duration, 1, 15, `Shot ${i + 1} length`)
      }));
      duration = body.multi_prompt.reduce((a, s) => a + s.duration, 0);
      if (duration < M.duration.min || duration > M.duration.max) {
        throw new InputError(`The shots add up to ${duration} seconds; Kling takes ${M.duration.min} to ${M.duration.max}.`);
      }
    }
    body.duration = duration;
  } else if (modelId === 'seedance2') {
    body.image_url = imageUrl;
    body.prompt = prompt;
    body.duration = duration;
    body.resolution = pick(input.resolution, M.resolutions, M.defRes, 'Quality');
    body.generate_audio = audio;
  } else {
    // reference / director models: take the photo as a reference plus an aspect ratio
    const aspect = String(input.aspect || '');
    if (!M.aspects.includes(aspect)) throw new InputError('Unsupported aspect ratio for this model.');
    body.prompt = prompt;
    body.image_urls = [imageUrl];
    body.duration = duration;
    body.resolution = pick(input.resolution, M.resolutions, M.defRes, 'Quality');
    body.aspect_ratio = aspect;
    body.generate_audio = audio;
  }
  return { endpoint: M.endpoint, body, duration };
}
function pick(v, list, def, name) {
  if (v === undefined || v === null || v === '') return def;
  if (!list.includes(v)) throw new InputError(`${name} must be one of ${list.join(', ')}.`);
  return v;
}

/** Public description for the browser (no endpoints needed there, but harmless). */
function publicModels() {
  const out = {};
  for (const [id, m] of Object.entries(MODELS)) {
    out[id] = { label: m.label, framing: m.framing, aspects: m.aspects || null, duration: m.duration,
      resolutions: m.resolutions, defRes: m.defRes || null, audio: m.audio, multiShot: m.multiShot, blurb: m.blurb };
  }
  return out;
}

module.exports = { MODELS, buildRequest, publicModels, InputError };
