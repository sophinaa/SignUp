import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import config from '../config/event.js';
import { validateConfig } from './event.js';
import { openDatabase } from './db.js';
import { createApp } from './app.js';

const env = process.env;
const production = env.NODE_ENV === 'production';

validateConfig(config);

let appSecret = env.APP_SECRET;
if (!appSecret || appSecret.length < 32) {
  if (production) {
    console.error('APP_SECRET must be set to a random string of at least 32 characters. Generate one with:\n  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
  }
  appSecret = randomBytes(32).toString('hex');
  console.warn('APP_SECRET not set: using a temporary secret. Guest manage links and organiser sign-ins will stop working when the server restarts.');
}

const organiserPassword = env.ORGANISER_PASSWORD || '';
if (organiserPassword && organiserPassword.length < 12) {
  console.error('ORGANISER_PASSWORD must be at least 12 characters long.');
  process.exit(1);
}
if (!organiserPassword) console.warn('ORGANISER_PASSWORD not set: the organiser view is disabled.');

let siteUrl = null;
if (env.SITE_URL) {
  try {
    siteUrl = new URL(env.SITE_URL).origin;
  } catch {
    console.error(`SITE_URL "${env.SITE_URL}" is not a valid URL (expected e.g. https://sharedlight.example.org).`);
    process.exit(1);
  }
}

const trustProxy = env.TRUST_PROXY ? (/^\d+$/.test(env.TRUST_PROXY) ? Number(env.TRUST_PROXY) : env.TRUST_PROXY) : false;
const dbFile = resolve(env.DATA_DIR || 'data', 'rsvps.sqlite');
const db = openDatabase(dbFile);

const app = createApp({ db, config, appSecret, organiserPassword, siteUrl, production, trustProxy });
const port = Number(env.PORT) || 3000;
const server = app.listen(port, () => {
  console.log(`Shared Light Café is running on http://localhost:${port} (database: ${dbFile})`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
