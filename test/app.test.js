import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../server/db.js';
import { createApp } from '../server/app.js';
import baseConfig from '../config/event.js';

const PASSWORD = 'organiser-test-password';
const SECRET = 'x'.repeat(40);

async function startServer(overrides = {}) {
  const db = overrides.db ?? (await openDatabase(':memory:'));
  const app = createApp({
    db,
    config: overrides.config ?? baseConfig,
    appSecret: SECRET,
    organiserPassword: PASSWORD,
    minSubmitMs: 0,
    now: () => new Date('2026-11-04T12:00:00Z'),
    ...overrides,
  });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  return { db, base, close: () => new Promise((r) => server.close(r)) };
}

async function formTokenFrom(base) {
  const html = await (await fetch(`${base}/`)).text();
  return html.match(/data-form-token="([^"]+)"/)[1];
}

const guest = (over = {}) => ({
  fullName: 'Amina Rahman',
  email: 'amina@example.com',
  dietary: 'Nut allergy',
  bringing: 'yes',
  dish: 'Lentil soup',
  category: 'savoury',
  servings: '10',
  ingredients: 'Lentils, onion, celery',
  foodNotes: 'Needs warming',
  marketingOptIn: false,
  ...over,
});

async function rsvp(base, body, { token, headers = {} } = {}) {
  const res = await fetch(`${base}/api/rsvps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ formToken: token ?? (await formTokenFrom(base)), ...body }),
  });
  return { status: res.status, data: res.status === 204 ? {} : await res.json() };
}

async function login(base, password = PASSWORD) {
  const res = await fetch(`${base}/organiser/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ password }),
    redirect: 'manual',
  });
  const cookie = res.headers.get('set-cookie');
  return { status: res.status, cookie: cookie ? cookie.split(';')[0] : null, setCookie: cookie };
}

describe('public page', () => {
  let srv;
  before(async () => (srv = await startServer()));
  after(() => srv.close());

  test('shows confirmed and unconfirmed details without inventing any', async () => {
    const html = await (await fetch(`${srv.base}/`)).text();
    assert.match(html, /<h1 class="ph-word" id="hero-title">/);
    assert.match(html, />CA<\/span>[\s\S]*class="ph-pill"[\s\S]*>FÉ<\/span>/);
    assert.doesNotMatch(html, /<video/);
    assert.match(html, /\/js\/pill-hero\.js/);
    assert.match(html, /Sunday 22 November 2026/);
    assert.match(html, /<dt>Time<\/dt><dd><span class="tbc">To be confirmed<\/span>/);
    assert.match(html, /<dt>Venue<\/dt><dd><span class="tbc">To be confirmed<\/span>/);
    assert.match(html, /Entry details coming soon/);
    assert.match(html, /18 November/);
    assert.doesNotMatch(html, /£2/);
    assert.doesNotMatch(html, /Add to calendar/);
    assert.doesNotMatch(html, /mailto:/);
    assert.doesNotMatch(html, /confirmation email will|we(’|')ve (sent|emailed)/i);
    assert.match(html, /We don’t send confirmation emails/);
  });

  test('new RSVPs omit marketing while existing bookings retain an optional opt-in', async () => {
    const html = await (await fetch(`${srv.base}/`)).text();
    assert.doesNotMatch(html, /id="marketingOptIn"/);
    const bookingHtml = await (await fetch(`${srv.base}/booking`)).text();
    const box = bookingHtml.match(/<input type="checkbox" id="marketingOptIn"[^>]*>/)[0];
    assert.doesNotMatch(box, /checked|required/);
  });

  test('calendar download is omitted until a time is set', async () => {
    assert.equal((await fetch(`${srv.base}/event.ics`)).status, 404);
  });

  test('sends security headers', async () => {
    const res = await fetch(`${srv.base}/`);
    assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
  });
});

describe('calendar once the time is confirmed', () => {
  let srv;
  before(async () => (srv = await startServer({ config: { ...baseConfig, startTime: '14:00', endTime: '17:00' } })));
  after(() => srv.close());

  test('page shows time and Add to calendar; .ics has UTC times', async () => {
    const html = await (await fetch(`${srv.base}/`)).text();
    assert.match(html, /2pm to 5pm/);
    assert.match(html, /Add to calendar/);
    const ics = await (await fetch(`${srv.base}/event.ics`)).text();
    assert.match(ics, /DTSTART:20261122T140000Z/);
    assert.match(ics, /DTEND:20261122T170000Z/);
    assert.doesNotMatch(ics, /LOCATION/);
  });
});

describe('RSVP submission', () => {
  let srv;
  before(async () => (srv = await startServer({ limits: { rsvp: 100 } })));
  after(() => srv.close());

  test('saves a valid RSVP and returns a confirmation with a manage token', async () => {
    const { status, data } = await rsvp(srv.base, guest());
    assert.equal(status, 201);
    assert.equal(data.rsvp.fullName, 'Amina Rahman');
    assert.equal(data.rsvp.dish, 'Lentil soup');
    assert.equal(data.rsvp.servings, 10);
    assert.equal(data.event.timeLabel, 'To be confirmed');
    assert.equal(data.event.calendarUrl, null);
    assert.ok(data.manageToken);
    assert.equal((await srv.db.list()).length, 1);
  });

  test('requires name, email and a food choice', async () => {
    const { status, data } = await rsvp(srv.base, { fullName: ' ', email: 'not-an-email' });
    assert.equal(status, 422);
    assert.deepEqual(Object.keys(data.fields).sort(), ['bringing', 'email', 'fullName']);
  });

  test('requires a dish for confirmed contributions only', async () => {
    const yes = await rsvp(srv.base, guest({ email: 'yes@example.com', dish: '' }));
    assert.equal(yes.status, 422);
    assert.ok(yes.data.fields.dish);
    const maybe = await rsvp(srv.base, guest({ email: 'maybe@example.com', bringing: 'maybe', dish: '' }));
    assert.equal(maybe.status, 201);
  });

  test('rejects invalid categories and servings', async () => {
    const { status, data } = await rsvp(srv.base, guest({ email: 'bad@example.com', category: 'soup', servings: '2.5' }));
    assert.equal(status, 422);
    assert.ok(data.fields.category && data.fields.servings);
  });

  test('drops food details when not bringing anything', async () => {
    const { status, data } = await rsvp(srv.base, guest({ email: 'no@example.com', bringing: 'no' }));
    assert.equal(status, 201);
    assert.equal(data.rsvp.dish, '');
    assert.equal(data.rsvp.servings, null);
  });

  test('duplicate email (any case) is refused with a helpful message', async () => {
    const before = (await srv.db.list()).length;
    const { status, data } = await rsvp(srv.base, guest({ email: 'AMINA@Example.com ' }));
    assert.equal(status, 409);
    assert.equal(data.code, 'duplicate_email');
    assert.ok(data.fields.email);
    assert.equal((await srv.db.list()).length, before);
  });

  test('a retried submission returns the same booking instead of a duplicate', async () => {
    const token = await formTokenFrom(srv.base);
    const body = guest({ email: 'retry@example.com', submissionId: 'retry-submission-0001' });
    const [first, second] = await Promise.all([rsvp(srv.base, body, { token }), rsvp(srv.base, body, { token })]);
    assert.deepEqual([first.status, second.status].sort(), [200, 201]);
    assert.equal(first.data.manageToken, second.data.manageToken);
    assert.equal((await srv.db.list()).filter((r) => r.email === 'retry@example.com').length, 1);
  });

  test('honeypot and missing form token are rejected', async () => {
    assert.equal((await rsvp(srv.base, guest({ email: 'bot1@example.com', website: 'http://spam' }))).status, 400);
    const missing = await rsvp(srv.base, guest({ email: 'bot2@example.com' }), { token: 'forged.token' });
    assert.equal(missing.status, 400);
    assert.equal(missing.data.code, 'invalid_form');
    assert.equal((await srv.db.list()).some((r) => r.email.startsWith('bot')), false);
  });

  test('cross-site submissions are blocked', async () => {
    const res = await rsvp(srv.base, guest({ email: 'csrf@example.com' }), { headers: { Origin: 'https://evil.example' } });
    assert.equal(res.status, 403);
    const fetchMeta = await rsvp(srv.base, guest({ email: 'csrf@example.com' }), { headers: { 'Sec-Fetch-Site': 'cross-site' } });
    assert.equal(fetchMeta.status, 403);
  });

  test('a server error is reported as a failure, not a success', async () => {
    const broken = await startServer({
      db: { ...(await openDatabase(':memory:')), create: async () => { throw new Error('disk full'); }, findBySubmissionId: async () => null },
    });
    const origError = console.error;
    console.error = () => {};
    try {
      const { status, data } = await rsvp(broken.base, guest());
      assert.equal(status, 500);
      assert.match(data.error, /not saved/);
      assert.equal(data.manageToken, undefined);
    } finally {
      console.error = origError;
      await broken.close();
    }
  });
});

describe('anti-spam timing and rate limiting', () => {
  test('submissions made instantly after loading are rejected', async () => {
    const srv = await startServer({ minSubmitMs: 60_000 });
    const { status } = await rsvp(srv.base, guest());
    assert.equal(status, 400);
    assert.equal((await srv.db.list()).length, 0);
    await srv.close();
  });

  test('too many submissions from one address are rate limited', async () => {
    const srv = await startServer({ limits: { rsvp: 2 } });
    const token = await formTokenFrom(srv.base);
    const statuses = [];
    for (let i = 0; i < 3; i++) statuses.push((await rsvp(srv.base, guest({ email: `r${i}@example.com` }), { token })).status);
    assert.deepEqual(statuses, [201, 201, 429]);
    await srv.close();
  });
});

describe('food contribution deadline', () => {
  test('new food offers are refused after the deadline, RSVPs still accepted', async () => {
    const srv = await startServer({ now: () => new Date('2026-11-19T09:00:00Z') });
    const html = await (await fetch(`${srv.base}/`)).text();
    assert.match(html, /Food contributions closed/);
    assert.equal((await rsvp(srv.base, guest())).status, 422);
    assert.equal((await rsvp(srv.base, guest({ bringing: 'no' }))).status, 201);
    await srv.close();
  });

  test('offers are still accepted late on the deadline day (UK time)', async () => {
    const srv = await startServer({ now: () => new Date('2026-11-18T23:30:00Z') });
    assert.equal((await rsvp(srv.base, guest())).status, 201);
    await srv.close();
  });
});

describe('guest manage link', () => {
  let srv;
  let token;
  before(async () => {
    srv = await startServer();
    token = (await rsvp(srv.base, guest())).data.manageToken;
  });
  after(() => srv.close());

  const call = (t, method = 'GET', body) =>
    fetch(`${srv.base}/api/booking/${encodeURIComponent(t)}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });

  test('loads and updates the booking; food changes reset organiser confirmation', async () => {
    const id = (await srv.db.list())[0].id;
    await srv.db.setFoodConfirmed(id, true);
    assert.equal((await (await call(token)).json()).rsvp.email, 'amina@example.com');
    const res = await call(token, 'PUT', guest({ dish: 'Rice pudding', category: 'sweet' }));
    assert.equal(res.status, 200);
    const saved = await srv.db.findById(id);
    assert.equal(saved.dish, 'Rice pudding');
    assert.equal(saved.foodConfirmed, false);
  });

  test('tampered tokens find nothing', async () => {
    const [id] = token.split('.');
    assert.equal((await call(`${id}.forged`)).status, 404);
    assert.equal((await call('nonsense')).status, 404);
  });

  test('cancelling deletes the booking', async () => {
    assert.equal((await call(token, 'DELETE')).status, 204);
    assert.equal((await srv.db.list()).length, 0);
    assert.equal((await call(token)).status, 404);
  });
});

describe('organiser access', () => {
  let srv;
  before(async () => {
    srv = await startServer();
    await rsvp(srv.base, guest());
    await rsvp(srv.base, guest({ fullName: '=HYPERLINK("x")', email: 'formula@example.com', bringing: 'no', dietary: '' }));
  });
  after(() => srv.close());

  test('unauthenticated visitors cannot see attendee data', async () => {
    const api = await fetch(`${srv.base}/api/organiser/rsvps`);
    assert.equal(api.status, 401);
    assert.doesNotMatch(await api.text(), /amina/i);

    for (const path of ['/organiser', '/organiser/export.csv']) {
      const res = await fetch(`${srv.base}${path}`, { redirect: 'manual' });
      assert.equal(res.status, 303, path);
      assert.equal(res.headers.get('location'), '/organiser/login');
    }

    const id = (await srv.db.list())[0].id;
    const patch = await fetch(`${srv.base}/api/organiser/rsvps/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{"foodConfirmed":true}',
    });
    assert.equal(patch.status, 401);
    assert.equal((await fetch(`${srv.base}/api/organiser/rsvps/${id}`, { method: 'DELETE' })).status, 401);
    assert.equal((await srv.db.list()).length, 2);
  });

  test('forged or expired session cookies are rejected', async () => {
    for (const cookie of ['slc_organiser=9999999999999.forged', `slc_organiser=1.${'a'.repeat(43)}`]) {
      const res = await fetch(`${srv.base}/api/organiser/rsvps`, { headers: { Cookie: cookie } });
      assert.equal(res.status, 401);
    }
  });

  test('wrong password is refused', async () => {
    const { status, cookie } = await login(srv.base, 'wrong-password');
    assert.equal(status, 401);
    assert.equal(cookie, null);
  });

  test('organiser can sign in, see RSVPs, confirm food and export CSV', async () => {
    const { status, cookie, setCookie } = await login(srv.base);
    assert.equal(status, 303);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Strict/i);

    const page = await fetch(`${srv.base}/organiser`, { headers: { Cookie: cookie } });
    assert.equal(page.status, 200);
    assert.equal(page.headers.get('cache-control'), 'no-store');

    const { rsvps } = await (await fetch(`${srv.base}/api/organiser/rsvps`, { headers: { Cookie: cookie } })).json();
    assert.equal(rsvps.length, 2);
    const amina = rsvps.find((r) => r.email === 'amina@example.com');
    assert.equal(amina.dish, 'Lentil soup');
    assert.equal(amina.dietary, 'Nut allergy');

    const patch = await fetch(`${srv.base}/api/organiser/rsvps/${amina.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ foodConfirmed: true }),
    });
    assert.equal((await patch.json()).rsvp.foodConfirmed, true);

    const bytes = Buffer.from(await (await fetch(`${srv.base}/organiser/export.csv`, { headers: { Cookie: cookie } })).arrayBuffer());
    assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'UTF-8 BOM for Excel');
    const csv = bytes.toString('utf8');
    assert.match(csv, /^\uFEFFFull name,Email/);
    assert.match(csv, /,\d{4}-\d{2}-\d{2} \d{2}:\d{2},/);
    assert.match(csv, /Amina Rahman,amina@example\.com,Nut allergy,Yes,Lentil soup,Savoury,10/);
    assert.match(csv, /"'=HYPERLINK\(""x""\)"/);
  });

  test('organiser view is disabled when no password is configured', async () => {
    const off = await startServer({ organiserPassword: '' });
    const html = await (await fetch(`${off.base}/organiser/login`)).text();
    assert.match(html, /isn’t set up yet/);
    assert.equal((await login(off.base, '')).status, 503);
    assert.equal((await fetch(`${off.base}/api/organiser/rsvps`)).status, 401);
    await off.close();
  });

  test('login attempts are rate limited', async () => {
    const limited = await startServer({ limits: { login: 2 } });
    const statuses = [];
    for (let i = 0; i < 3; i++) statuses.push((await login(limited.base, 'nope-nope-nope')).status);
    assert.deepEqual(statuses, [401, 401, 429]);
    await limited.close();
  });
});
