import express from 'express';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { validateRsvp } from '../public/js/validation.js';
import { eventView, publicEventDetails } from './event.js';
import { DuplicateEmailError } from './db.js';
import { buildIcs } from './ics.js';
import { rsvpsToCsv } from './csv.js';
import { homePage, managePage, loginPage, organiserPage } from './views.js';
import {
  createSigner, manageToken, readManageToken, formToken, checkFormToken,
  SESSION_COOKIE, passwordMatches, createSession, sessionIsValid, parseCookies,
  createRateLimiter, securityHeaders, sameOriginOnly,
} from './security.js';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const PUBLIC_DIR = here('../public/');
const FONT_DIRS = [here('../node_modules/@fontsource/fraunces/files/'), here('../node_modules/@fontsource/source-sans-3/files/')];

const SUBMISSION_ID_RE = /^[A-Za-z0-9-]{8,64}$/;
const PUBLIC_ID_RE = /^[0-9a-f-]{36}$/;

// options: { db, config, appSecret, organiserPassword, siteUrl, production, trustProxy,
//            minSubmitMs, now, limits }
export function createApp(options) {
  const { db, config, organiserPassword, siteUrl = null, production = false } = options;
  const signer = createSigner(options.appSecret);
  const minSubmitMs = options.minSubmitMs ?? 3000;
  const now = options.now ?? (() => new Date());
  const limits = { rsvp: 10, manage: 30, login: 8, ...options.limits };

  const rsvpLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: limits.rsvp });
  const manageLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: limits.manage });
  const loginLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: limits.login });
  const ogImage = existsSync(`${PUBLIC_DIR}og-image.png`) ? '/og-image.png' : null;

  const app = express();
  app.disable('x-powered-by');
  if (options.trustProxy) app.set('trust proxy', options.trustProxy);

  app.use(securityHeaders({ production }));
  app.use(express.static(PUBLIC_DIR, { index: false, maxAge: production ? '1h' : 0 }));
  for (const dir of FONT_DIRS) app.use('/fonts', express.static(dir, { maxAge: '30d', immutable: true, fallthrough: true }));
  app.use(express.json({ limit: '16kb' }));
  app.use(express.urlencoded({ extended: false, limit: '4kb' }));
  app.use(sameOriginOnly);

  const view = () => eventView(config, now());

  const limit = (limiter, keyPrefix) => (req, res, next) => {
    const { allowed, retryAfterSec } = limiter.hit(`${keyPrefix}:${req.ip}`);
    if (allowed) return next();
    res.set('Retry-After', String(retryAfterSec));
    res.status(429).json({ error: 'Too many attempts from this connection. Please wait a few minutes and try again.' });
  };

  const guestResponse = (rsvp) => ({
    rsvp: {
      fullName: rsvp.fullName,
      email: rsvp.email,
      dietary: rsvp.dietary,
      bringing: rsvp.bringing,
      dish: rsvp.dish,
      category: rsvp.category,
      servings: rsvp.servings,
      ingredients: rsvp.ingredients,
      foodNotes: rsvp.foodNotes,
      marketingOptIn: rsvp.marketingOptIn,
    },
    manageToken: manageToken(signer, rsvp.id),
    event: publicEventDetails(view()),
  });

  const validationFailed = (res, errors) =>
    res.status(422).json({ error: 'Some details need checking.', fields: errors });

  const duplicateEmail = (res) =>
    res.status(409).json({
      error: 'There’s already an RSVP for this email address, so you’re on the list. To change your details, use the private link from your confirmation.',
      fields: { email: 'This email address already has an RSVP.' },
      code: 'duplicate_email',
    });

  const noStore = (req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' });
    next();
  };

  // ---- Public pages -------------------------------------------------------------

  app.get('/', (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.type('html').send(homePage(view(), { formToken: formToken(signer, now().getTime()), siteUrl, ogImage }));
  });

  app.get('/booking', noStore, (req, res) => {
    res.type('html').send(managePage(view(), { siteUrl }));
  });

  app.get('/event.ics', (req, res) => {
    const ics = buildIcs(config, view(), siteUrl);
    if (!ics) return res.status(404).type('text').send('The event time has not been confirmed yet.');
    res.set('Content-Disposition', 'attachment; filename="shared-light-cafe.ics"');
    res.type('text/calendar; charset=utf-8').send(ics);
  });

  app.get('/healthz', (req, res) => res.json({ ok: true }));

  // ---- Guest RSVP API -----------------------------------------------------------

  // Lets the form recover if its token was rejected (e.g. after a server restart).
  app.get('/api/form-token', noStore, (req, res) => {
    res.json({ formToken: formToken(signer, now().getTime()) });
  });

  app.post('/api/rsvps', noStore, limit(rsvpLimiter, 'rsvp'), (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};

    // A retried submission (e.g. the first response was lost on a bad
    // connection) returns the booking it already created.
    const submissionId = typeof body.submissionId === 'string' && SUBMISSION_ID_RE.test(body.submissionId) ? body.submissionId : null;
    if (submissionId) {
      const existing = db.findBySubmissionId(submissionId);
      if (existing) return res.status(200).json({ ...guestResponse(existing), replayed: true });
    }

    if (typeof body.website === 'string' && body.website.trim() !== '') {
      return res.status(400).json({ error: 'We couldn’t accept this submission. Please refresh the page and try again.' });
    }
    const tokenCheck = checkFormToken(signer, body.formToken, { minAgeMs: minSubmitMs, now: now().getTime() });
    if (tokenCheck === 'invalid') {
      return res.status(400).json({ error: 'This form has expired. Please refresh the page and try again.', code: 'invalid_form' });
    }
    if (tokenCheck === 'too_fast') {
      return res.status(400).json({ error: 'That was quick! Please check your details and press the button again.' });
    }

    const { value, errors } = validateRsvp(body, { foodOpen: view().foodOpen });
    if (Object.keys(errors).length) return validationFailed(res, errors);

    try {
      const rsvp = db.create(value, submissionId);
      res.status(201).json(guestResponse(rsvp));
    } catch (err) {
      if (err instanceof DuplicateEmailError) return duplicateEmail(res);
      throw err;
    }
  });

  const findGuestBooking = (req, res, next) => {
    const publicId = readManageToken(signer, req.params.token);
    const rsvp = publicId && db.findById(publicId);
    if (!rsvp) return res.status(404).json({ error: 'We couldn’t find this booking. It may have been cancelled.' });
    req.rsvp = rsvp;
    next();
  };

  app.get('/api/booking/:token', noStore, limit(manageLimiter, 'manage'), findGuestBooking, (req, res) => {
    res.json(guestResponse(req.rsvp));
  });

  app.put('/api/booking/:token', noStore, limit(manageLimiter, 'manage'), findGuestBooking, (req, res) => {
    // Guests who already have a booking may still adjust food after the deadline.
    const { value, errors } = validateRsvp(req.body, { foodOpen: true });
    if (Object.keys(errors).length) return validationFailed(res, errors);
    try {
      res.json(guestResponse(db.updateFromGuest(req.rsvp.id, value)));
    } catch (err) {
      if (err instanceof DuplicateEmailError) return duplicateEmail(res);
      throw err;
    }
  });

  app.delete('/api/booking/:token', noStore, limit(manageLimiter, 'manage'), findGuestBooking, (req, res) => {
    db.delete(req.rsvp.id);
    res.status(204).end();
  });

  // ---- Organiser area -----------------------------------------------------------

  const isOrganiser = (req) => sessionIsValid(signer, organiserPassword, parseCookies(req.get('cookie'))[SESSION_COOKIE], Date.now());

  const requireOrganiserPage = (req, res, next) => (isOrganiser(req) ? next() : res.redirect(303, '/organiser/login'));
  const requireOrganiserApi = (req, res, next) =>
    isOrganiser(req) ? next() : res.status(401).json({ error: 'Please sign in as an organiser.' });

  const cookieOptions = { httpOnly: true, sameSite: 'strict', secure: production, path: '/' };

  app.use(['/organiser', '/api/organiser'], noStore);

  app.get('/organiser/login', (req, res) => {
    if (isOrganiser(req)) return res.redirect(303, '/organiser');
    res.type('html').send(loginPage({ configured: Boolean(organiserPassword) }));
  });

  app.post('/organiser/login', (req, res) => {
    if (!organiserPassword) return res.status(503).type('html').send(loginPage({ configured: false }));
    const key = `login:${req.ip}`;
    const { allowed } = loginLimiter.hit(key);
    if (!allowed) {
      return res.status(429).type('html').send(loginPage({ configured: true, error: 'Too many sign-in attempts. Please wait 15 minutes and try again.' }));
    }
    if (!passwordMatches(organiserPassword, req.body?.password)) {
      return res.status(401).type('html').send(loginPage({ configured: true, error: 'That password isn’t right. Please try again.' }));
    }
    loginLimiter.reset(key);
    const session = createSession(signer, organiserPassword);
    res.cookie(SESSION_COOKIE, session.value, { ...cookieOptions, maxAge: session.maxAge });
    res.redirect(303, '/organiser');
  });

  app.post('/organiser/logout', (req, res) => {
    res.clearCookie(SESSION_COOKIE, cookieOptions);
    res.redirect(303, '/organiser/login');
  });

  app.get('/organiser', requireOrganiserPage, (req, res) => {
    res.type('html').send(organiserPage(view()));
  });

  app.get('/organiser/export.csv', requireOrganiserPage, (req, res) => {
    const stamp = now().toISOString().slice(0, 10);
    res.set('Content-Disposition', `attachment; filename="shared-light-cafe-rsvps-${stamp}.csv"`);
    res.type('text/csv; charset=utf-8').send(rsvpsToCsv(db.list(), { timeZone: config.timezone }));
  });

  app.get('/api/organiser/rsvps', requireOrganiserApi, (req, res) => {
    res.json({ rsvps: db.list().map(({ submissionId, ...rest }) => rest) });
  });

  app.patch('/api/organiser/rsvps/:id', requireOrganiserApi, (req, res) => {
    if (!PUBLIC_ID_RE.test(req.params.id) || typeof req.body?.foodConfirmed !== 'boolean') {
      return res.status(400).json({ error: 'Invalid request.' });
    }
    const updated = db.setFoodConfirmed(req.params.id, req.body.foodConfirmed);
    if (!updated) return res.status(404).json({ error: 'RSVP not found.' });
    const { submissionId, ...rest } = updated;
    res.json({ rsvp: rest });
  });

  app.delete('/api/organiser/rsvps/:id', requireOrganiserApi, (req, res) => {
    if (!PUBLIC_ID_RE.test(req.params.id)) return res.status(400).json({ error: 'Invalid request.' });
    if (!db.delete(req.params.id)) return res.status(404).json({ error: 'RSVP not found.' });
    res.status(204).end();
  });

  // ---- Fallbacks ----------------------------------------------------------------

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
  app.use((req, res) => res.status(404).type('html').send('<!doctype html><title>Not found</title><p>Page not found. <a href="/">Go to Shared Light Café</a></p>'));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
      return res.status(400).json({ error: 'We couldn’t read that submission. Please try again.' });
    }
    console.error(err);
    if (req.path.startsWith('/api/')) {
      return res.status(500).json({ error: 'Something went wrong on our side and your RSVP was not saved. Please try again in a moment.' });
    }
    res.status(500).type('text').send('Something went wrong. Please try again in a moment.');
  });

  return app;
}
