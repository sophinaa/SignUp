import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

const b64url = (buf) => Buffer.from(buf).toString('base64url');

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function createSigner(secret) {
  const sign = (purpose, payload) => b64url(createHmac('sha256', secret).update(`${purpose}:${payload}`).digest());
  return {
    sign,
    verify: (purpose, payload, signature) => safeEqual(sign(purpose, payload), signature),
  };
}

// ---- Guest manage links -----------------------------------------------------
// A manage token is "<rsvp public id>.<signature>". Nothing extra is stored, so
// the same link can be shown again if a submission is retried.

export function manageToken(signer, publicId) {
  return `${publicId}.${signer.sign('manage', publicId)}`;
}

export function readManageToken(signer, token) {
  const [publicId, signature, extra] = String(token || '').split('.');
  if (!publicId || !signature || extra !== undefined) return null;
  return signer.verify('manage', publicId, signature) ? publicId : null;
}

// ---- Anti-spam form token ------------------------------------------------------
// Embedded in the page; proves the form was loaded and wasn't submitted
// implausibly quickly.

export function formToken(signer, now = Date.now()) {
  return `${now}.${signer.sign('form', String(now))}`;
}

export function checkFormToken(signer, token, { minAgeMs, now = Date.now() }) {
  const [issued, signature] = String(token || '').split('.');
  if (!/^\d+$/.test(issued || '') || !signature || !signer.verify('form', issued, signature)) return 'invalid';
  if (now - Number(issued) < minAgeMs) return 'too_fast';
  return 'ok';
}

// ---- Organiser sessions --------------------------------------------------------

export const SESSION_COOKIE = 'slc_organiser';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export function passwordMatches(expected, given) {
  if (!expected || typeof given !== 'string') return false;
  const a = createHash('sha256').update(expected).digest();
  const b = createHash('sha256').update(given).digest();
  return timingSafeEqual(a, b);
}

// Sessions are tied to the current password: changing ORGANISER_PASSWORD
// signs everyone out.
const sessionPurpose = (password) => `session:${createHash('sha256').update(password).digest('hex')}`;

export function createSession(signer, password, now = Date.now()) {
  const expires = String(now + SESSION_TTL_MS);
  return { value: `${expires}.${signer.sign(sessionPurpose(password), expires)}`, maxAge: SESSION_TTL_MS };
}

export function sessionIsValid(signer, password, cookieValue, now = Date.now()) {
  if (!password || !cookieValue) return false;
  const [expires, signature] = String(cookieValue).split('.');
  if (!/^\d+$/.test(expires || '') || !signature) return false;
  return Number(expires) > now && signer.verify(sessionPurpose(password), expires, signature);
}

export function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const key = part.slice(0, i).trim();
    try {
      out[key] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      // ignore malformed cookie values
    }
  }
  return out;
}

// ---- Rate limiting ---------------------------------------------------------------
// Fixed-window, in-memory. Enough for a single-server community site.

export function createRateLimiter({ windowMs, max }) {
  const hits = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }, windowMs);
  timer.unref();

  return {
    // Records a hit and returns { allowed, retryAfterSec }.
    hit(key) {
      const now = Date.now();
      let entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        entry = { count: 0, resetAt: now + windowMs };
        hits.set(key, entry);
      }
      entry.count += 1;
      return { allowed: entry.count <= max, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
    },
    reset: (key) => hits.delete(key),
  };
}

// ---- Headers ---------------------------------------------------------------------

export function securityHeaders({ production }) {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "form-action 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
  return (req, res, next) => {
    // The cinematic home page uses the requested Google Fonts and video host.
    const pageCsp = req.path === '/' ? csp
      .replace("style-src 'self'", "style-src 'self' https://fonts.googleapis.com; style-src-attr 'unsafe-inline'")
      .replace("font-src 'self'", "font-src 'self' https://fonts.gstatic.com; media-src https://d8j0ntlcm91z4.cloudfront.net") : csp;
    res.set({
      'Content-Security-Policy': pageCsp,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'same-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      'Cross-Origin-Opener-Policy': 'same-origin',
    });
    if (production) res.set('Strict-Transport-Security', 'max-age=31536000');
    next();
  };
}

// Rejects state-changing requests sent from other websites. Modern browsers
// send Sec-Fetch-Site; older ones are checked against the Origin header.
export function sameOriginOnly(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const blocked = () => res.status(403).json({ error: 'Cross-site request blocked.' });
  const site = req.get('sec-fetch-site');
  if (site) return ['same-origin', 'none'].includes(site) ? next() : blocked();
  const origin = req.get('origin');
  if (origin) {
    let host;
    try {
      host = new URL(origin).host;
    } catch {
      return blocked();
    }
    if (host !== req.get('host')) return blocked();
  }
  next();
}
