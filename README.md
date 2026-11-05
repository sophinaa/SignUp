# Shared Light Café — RSVP site

A single-page RSVP site for Shared Light Café (Sunday 22 November 2026), with a password-protected organiser view.

- **Stack:** React + TypeScript hero, Vite, Tailwind CSS and a shadcn/ui Button; Node.js 22 (≥ 22.13), Express and SQLite via `@libsql/client`.
- **Data:** RSVPs are saved in one SQLite file, `rsvps.sqlite`, inside `DATA_DIR`. On hosts without a persistent disk, they go to a hosted [Turso](https://turso.tech) database instead (same SQLite format).
- **Media:** the cinematic hero uses Google Fonts (Instrument Serif and Inter) and the supplied CloudFront video. There is no analytics.

## Run it locally

```bash
npm install
npm run build            # compile the React hero into public/hero
cp .env.example .env     # then fill in APP_SECRET and ORGANISER_PASSWORD
npm run dev              # http://localhost:3000, restarts when files change
npm test                 # automated checks
```

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `APP_SECRET` | In production | A random string of 32+ characters. It signs guest manage links, organiser sessions and anti-spam tokens. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. **If you change it, every guest's manage link stops working**, so set it once and keep it. |
| `ORGANISER_PASSWORD` | To use `/organiser` | At least 12 characters. If it isn't set, the organiser view is disabled. Changing it signs all organisers out. |
| `SITE_URL` | Recommended | The public address, e.g. `https://sharedlightcafe.example.org`. It's used for the WhatsApp/Instagram link-preview image and calendar files. |
| `DATA_DIR` | Recommended | The folder for the database (default `./data`). It **must be on persistent storage.** Ignored when `TURSO_DATABASE_URL` is set. |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | For free hosting | Store RSVPs in a hosted Turso database (`libsql://…`) instead of a local file. Needed on hosts with no persistent disk, such as Render's free plan. |
| `NODE_ENV` | In production | Set this to `production`. It enables secure cookies and HSTS, and the server won't start without `APP_SECRET`. |
| `TRUST_PROXY` | Usually `1` when hosted | The number of reverse proxies in front of the app, so rate limiting sees each visitor's real IP address. |
| `PORT` | No | Default is `3000`. Most hosts set it for you. |

## Updating event details

Edit **`config/event.js`** and then restart or redeploy. Comments in the file explain each field.

- Any value left as `null` shows **"To be confirmed"**. For entry, `null` shows **"Entry details coming soon"**. The £2 price hasn't been confirmed, so it isn't shown anywhere yet. When it's agreed, set `entry: '£2 on the door'` (or similar).
- Setting `startTime` (and optionally `endTime`) shows the time and adds an **Add to calendar** (.ics) button to the page and the confirmation.
- Setting `venue.name` / `venue.address` / `venue.mapUrl` shows the venue.
- `contactEmail` stays hidden until you set it.
- After `foodDeadline` (end of that day, UK time), new RSVPs can no longer offer food. Guests who already RSVP'd can still edit their contribution.
- If you change the illustration or headline, regenerate `public/og-image.png` (1200×630). It's the picture shown in WhatsApp link previews. Delete it to fall back to a text-only preview.

## How RSVPs work

- **Validation:** the browser and server use the same rules (`public/js/validation.js`), and the server always re-checks. A dish name is required when the guest chooses "Yes" to bringing food, but not for "Maybe".
- **No duplicate bookings:** the button ignores repeat taps while a request is in progress. Each form also sends a one-off submission ID, so a retry after a dropped connection returns the booking that was already made instead of creating a second one. Guests give a phone number instead of an email. Each number can only have one RSVP (07700 900123, +44 7700 900123 and +44 (0)7700 900123 count as the same number), and a second attempt gets a friendly "you're already on the list" message. RSVPs made before the switch to phone numbers keep their email, which the organiser view and CSV still show.
- **Spam protection:** a hidden honeypot field, a signed form token that rejects submissions made within 3 seconds of loading the page, and per-IP rate limits (10 RSVPs, 30 manage-link actions and 8 organiser sign-in attempts per 15 minutes). The limits are kept in memory, so they reset when the server restarts.
- **Managing a booking:** the confirmation shows a private link (`/booking#…`) that lets the guest update or cancel their RSVP. The token sits after the `#`, so it is never sent to the server in page requests or included in referrers.
- **Email:** the site **does not send any email**, and it never says a confirmation email is coming. The confirmation screen asks guests to save their link instead. To add confirmation emails later, you'd need an email provider (such as Postmark, Resend or SMTP) and a call to it after `db.create` in `server/app.js`.
- **Future-event opt-in:** this is a separate checkbox, unticked by default. It's included in the CSV export.

## Organiser access

Go to **`/organiser`** and sign in with `ORGANISER_PASSWORD`. You'll see:

- totals (RSVPs, food offered, maybe, confirmed, dietary notes, opt-ins)
- a searchable attendee list, with an option to remove an RSVP
- food contributions, with a **Confirmed** tick box for organisers (it clears automatically if the guest later changes their food details)
- dietary requirements and allergies
- **Download CSV**, which opens correctly in Excel and Google Sheets

The page, API and CSV are all checked on the server. Without a valid session, the API returns `401` and the pages redirect to sign-in. The session is a signed, `HttpOnly`, `SameSite=Strict` cookie that lasts 12 hours. Requests that change data from other websites are blocked. The password only ever lives in the environment variable, never in frontend code.

## Deployment

The app is a single long-running Node process. RSVPs must be stored somewhere that survives restarts: either a persistent disk (`DATA_DIR`) or a hosted Turso database (`TURSO_DATABASE_URL`). GitHub Pages can't host it, because Pages only serves static files.

### Free: Render + Turso

1. **Turso** (free): sign up at [turso.tech](https://turso.tech) and create a database (any name, e.g. `shared-light`). From the database page, copy its **URL** (`libsql://…`) and create an **auth token**.
2. **Render** (free): click **New → Blueprint** and pick this repo. [render.yaml](render.yaml) sets up the service. When asked, enter:
   - `ORGANISER_PASSWORD`: 12+ characters
   - `SITE_URL`: e.g. `https://shared-light-cafe.onrender.com`
   - `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`: from step 1
3. Open the site, send a test RSVP, and check it appears at `/organiser`.

On Render's free plan the site sleeps after 15 minutes without visitors, and the next visitor waits about a minute while it wakes. RSVPs are safe in Turso throughout.

### Other hosts

- **Render (paid, with a disk):** in [render.yaml](render.yaml), set `plan: starter`, add a disk mounted at `/data`, set `DATA_DIR=/data`, and remove the Turso variables.
- **Fly.io or Railway:** use the included `Dockerfile` and attach a volume at `/data`.
- **Any VPS:** run `npm ci && npm run build && npm prune --omit=dev && npm start` behind Caddy or nginx with HTTPS, and keep it running with systemd or pm2.

For any host, set `NODE_ENV=production`, `APP_SECRET`, `ORGANISER_PASSWORD`, `SITE_URL`, `TRUST_PROXY=1`, and either `DATA_DIR` (on a persistent disk) or the two Turso variables. Always serve the site over HTTPS. `/healthz` returns `{"ok":true}` for uptime checks.

**Backups:** download the CSV regularly from the organiser view. With a local file, you can also copy `rsvps.sqlite` (plus any `-wal`/`-shm` files next to it) while the app is stopped.

**Privacy:** once the event is over, consider deleting the database (or removing RSVPs from the organiser view). Keep any contact details for people who ticked the future-events box if you plan to use them.

## Project layout

```
config/event.js          event details (edit this)
server/index.js          startup and environment variables
server/app.js            routes
server/db.js             RSVP storage (local SQLite file or Turso)
server/security.js       signing, sessions, rate limiting, headers
server/views.js          HTML pages
server/event.js, ics.js, csv.js
public/                  CSS, browser JS, favicon, link-preview image
test/app.test.js         automated tests (npm test)
```

## Cinematic hero

The home-page hero lives in `frontend/src/components/cinematic-hero.tsx`. Both RSVP links point to the existing `#rsvp` form; the booking API and organiser workflow remain server-side. The hero uses the supplied Velorah branding and copy.

Run `npm run build` after editing the React code, or run `npm run dev:hero` in a second terminal for rebuilds while the Express server is running. The build also type-checks TypeScript. The Docker image builds the frontend before removing development dependencies.

The supplied video plays muted and loops. A small playback control lets visitors pause it; reduced-motion preferences disable the entrance animation and pause the video. The cream background remains when the video cannot load. The poster’s cream, olive, mustard and terracotta palette is used throughout, with a warm, subdued treatment on the video.
