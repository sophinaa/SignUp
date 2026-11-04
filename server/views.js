import { CATEGORIES, LIMITS } from '../public/js/validation.js';

export const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Bump when CSS/JS change so phones don't keep a stale cached copy.
const ASSET_VERSION = '6';

// ---- Illustrations (decorative, hidden from screen readers) ---------------------

const ICONS = {
  cup: `<svg class="icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M10 20h24v8a12 12 0 0 1-12 12h0a12 12 0 0 1-12-12z" fill="var(--terracotta-soft)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M34 23h3a4 4 0 0 1 0 8h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M17 8c-2 2.5 2 4.5 0 7M24 6c-2 2.5 2 4.5 0 7M31 8c-2 2.5 2 4.5 0 7" fill="none" stroke="var(--terracotta)" stroke-width="2" stroke-linecap="round"/></svg>`,
  conversation: `<svg class="icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M6 12a4 4 0 0 1 4-4h18a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4h-12l-6 5v-5h0a4 4 0 0 1-4-4z" fill="var(--terracotta-soft)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M36 18h2a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4v5l-6-5H24a4 4 0 0 1-4-4v-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`,
  plate: `<svg class="icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><ellipse cx="24" cy="30" rx="19" ry="8" fill="var(--terracotta-soft)" stroke="currentColor" stroke-width="2"/><ellipse cx="24" cy="29" rx="11" ry="4" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".6"/><path d="M15 22c1-5 5-8 9-8s8 3 9 8" fill="none" stroke="var(--terracotta)" stroke-width="2" stroke-linecap="round"/><circle cx="24" cy="12" r="1.8" fill="var(--terracotta)"/></svg>`,
};

const LOGO = `<svg class="logo" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><circle cx="16" cy="10" r="5" fill="var(--terracotta-soft)" stroke="var(--terracotta)" stroke-width="1.6"/><path d="M6 17h18v3a9 9 0 0 1-9 9h0a9 9 0 0 1-9-9z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M24 19h1.5a3 3 0 0 1 0 6H23" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

// Hand-drawn sprigs and sparkles framing the RSVP card.
const SPARKLE = `<svg class="sparkle" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 1v22M1 12h22M4.2 4.2l15.6 15.6M19.8 4.2 4.2 19.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;

const SPRIG = `<path d="M4 20c14-1 26-6 36-14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M13 18c-1-4 1-7 4-8-1 4-1 6-4 8zM22 15c0-4 2-6 5-7-1 4-2 5-5 7zM31 11c0-3 2-5 5-6-1 3-2 5-5 6zM15 18c3 2 6 2 8 0-3-1-5-1-8 0zM25 14c3 1 5 1 7-1-3-1-5-1-7 1z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>`;

const VINE = `<svg class="frame-vine" viewBox="0 0 24 120" aria-hidden="true" focusable="false"><path d="M12 4c-4 20 4 36 0 56s4 36 0 56" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M11 22c-6-1-8-5-8-9 5 1 8 4 8 9zM13 40c6-1 8-5 8-9-5 1-8 4-8 9zM11 62c-6-1-8-5-8-9 5 1 8 4 8 9zM13 82c6-1 8-5 8-9-5 1-8 4-8 9zM11 102c-6-1-8-5-8-9 5 1 8 4 8 9z"/></g><circle cx="5" cy="70" r="1.8" fill="currentColor"/></svg>`;

const FRAME_ORNAMENTS = `<svg class="frame-ornament frame-top" viewBox="0 0 120 28" aria-hidden="true" focusable="false"><g transform="translate(60 0) scale(-1 1)">${SPRIG}</g><g transform="translate(60 0)">${SPRIG}</g><circle cx="60" cy="21" r="3" fill="var(--terracotta-soft)" stroke="var(--terracotta)" stroke-width="1.4"/></svg>
<svg class="frame-ornament frame-bottom" viewBox="0 0 120 28" aria-hidden="true" focusable="false"><g transform="translate(60 28) scale(-1 -1)">${SPRIG}</g><g transform="translate(60 28) scale(1 -1)">${SPRIG}</g><circle cx="60" cy="14" r="6" fill="var(--terracotta-soft)" stroke="var(--terracotta)" stroke-width="1.6"/><path d="M60 3v3M60 22v3M49 14h3M68 14h3" stroke="var(--terracotta)" stroke-width="1.4" stroke-linecap="round"/></svg>
${VINE.replace('class="frame-vine"', 'class="frame-vine frame-vine-left"')}${VINE.replace('class="frame-vine"', 'class="frame-vine frame-vine-right"')}`;

// ---- Pill hero ------------------------------------------------------------------
// "CA · pill · FÉ": scrolling opens the hairline between the halves into a
// slit, a circle, a pill and finally the whole screen, revealing the RSVP
// letter rising behind it. Animation lives in public/js/pill-hero.js.

function pillHero(ev) {
  return `<section class="pill-hero" id="hero" aria-labelledby="hero-title">
  <div class="ph-stage">
    <nav class="ph-nav" aria-label="Main">
      <div class="ph-links">
        <a href="/">${esc(ev.name)}</a>
        <span class="ph-date">${esc(ev.dateLabel)}</span>
      </div>
      <div class="ph-links">
        <a href="#rsvp">RSVP</a>
      </div>
    </nav>
    <h1 class="ph-word" id="hero-title">
      <span class="visually-hidden">${esc(ev.name)}</span>
      <span class="ph-half" aria-hidden="true">CA</span>
      <span class="ph-pill" aria-hidden="true"><span class="ph-hair"></span></span>
      <span class="ph-half" aria-hidden="true">FÉ</span>
    </h1>
    <div class="ph-foot">
      <p class="ph-copy">Join us for a relaxed gathering to meet new people, share food and build community. Whether you’re a revert, exploring Islam or coming along to connect, you’re welcome.</p>
      <span class="ph-rule" aria-hidden="true"><span class="ph-hint">Scroll to open</span></span>
      <a class="ph-btn" href="#rsvp">RSVP</a>
    </div>
  </div>
</section>
<script src="/js/pill-hero.js?v=${ASSET_VERSION}"></script>`;
}

// ---- Shared page shell ----------------------------------------------------------

function layout({ title, description, siteUrl, ogImage, body, scripts = [], bodyClass = '', noindex = false, cinematic = false }) {
  const url = siteUrl ? esc(siteUrl) : null;
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : ''}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${url ? `<meta property="og:url" content="${url}">` : ''}
${url && ogImage ? `<meta property="og:image" content="${url}${esc(ogImage)}">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:card" content="summary_large_image">` : ''}
<meta name="theme-color" content="#fbefd5">
<meta name="color-scheme" content="light">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/bodoni-moda-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/fraunces-latin-500-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/source-sans-3-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/site.css?v=${ASSET_VERSION}">
${cinematic ? `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Inter:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/hero/hero.css?v=${ASSET_VERSION}">` : ''}
${scripts.map((s) => `<script type="module" src="${s}?v=${ASSET_VERSION}"></script>`).join('\n')}
</head>
<body class="${bodyClass}">
${body}
</body>
</html>`;
}

function header({ showRsvp = true } = {}) {
  return `<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="/">${LOGO}<span>Shared Light Café</span></a>
    ${showRsvp ? '<a class="btn btn-small" href="/#rsvp">RSVP</a>' : ''}
  </div>
</header>`;
}

const tbc = (label, confirmed) => (confirmed ? esc(label) : `<span class="tbc">${esc(label)}</span>`);

function detailsList(ev, { compact = false } = {}) {
  const venue = ev.venueConfirmed
    ? `${esc(ev.venueLabel)}${ev.venueName && ev.venueAddress ? `<span class="sub">${esc(ev.venueAddress)}</span>` : ''}${
        ev.mapUrl ? `<a class="sub" href="${esc(ev.mapUrl)}" target="_blank" rel="noopener noreferrer">View map<span class="visually-hidden"> (opens in a new tab)</span></a>` : ''
      }`
    : tbc(ev.venueLabel, false);
  return `<dl class="details-list${compact ? ' compact' : ''}">
  <div><dt>Date</dt><dd>${esc(ev.dateLabel)}</dd></div>
  <div><dt>Time</dt><dd>${tbc(ev.timeLabel, ev.timeConfirmed)}</dd></div>
  <div><dt>Venue</dt><dd>${venue}</dd></div>
  <div><dt>Entry</dt><dd>${tbc(ev.entryLabel, ev.entryConfirmed)}</dd></div>
</dl>`;
}

function field({ id, label, optional, hint, input }) {
  return `<div class="field" data-field="${id}">
  <label for="${id}">${label}${optional ? ' <span class="optional">(optional)</span>' : ''}</label>
  ${hint ? `<p class="hint" id="${id}-hint">${hint}</p>` : ''}
  <p class="field-error" id="${id}-error" hidden></p>
  ${input}
</div>`;
}

const describedBy = (id, hasHint) => `aria-describedby="${hasHint ? `${id}-hint ` : ''}${id}-error"`;

function rsvpForm(ev, { mode, formToken }) {
  const foodOpen = mode === 'manage' || ev.foodOpen;
  const bringing = foodOpen
    ? `<fieldset class="field choice-group" data-field="bringing" aria-describedby="bringing-hint bringing-error">
  <legend>Bringing food?</legend>
  <p class="hint" id="bringing-hint">Optional — you’re welcome either way.</p>
  <p class="field-error" id="bringing-error" hidden></p>
  <div class="choices">
    <label class="choice"><input type="radio" id="bringing-yes" name="bringing" value="yes" aria-controls="food-details"> <span>Yes</span></label>
    <label class="choice"><input type="radio" id="bringing-maybe" name="bringing" value="maybe" aria-controls="food-details"> <span>Maybe</span></label>
    <label class="choice"><input type="radio" id="bringing-no" name="bringing" value="no"> <span>No</span></label>
  </div>
</fieldset>`
    : `<div class="note">
  <p><strong>Food contributions closed on ${esc(ev.foodDeadlineLabel)}.</strong> You’re still very welcome to come along — there’s no need to bring anything.</p>
  <input type="hidden" name="bringing" value="no">
</div>`;

  const categoryOptions = Object.entries(CATEGORIES)
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join('');

  const foodDetails = foodOpen
    ? `<div id="food-details" class="food-details" hidden>
  <fieldset>
    <legend>About your contribution</legend>
    <p class="note small">Please bring halal food and label ingredients and allergens.</p>
    ${field({
      id: 'dish',
      label: 'Dish or item <span class="optional" data-dish-tag></span>',
      hint: 'For example: samosas or cake.',
      input: `<input id="dish" name="dish" type="text" maxlength="${LIMITS.dish}" autocomplete="off" ${describedBy('dish', true)}>`,
    })}
    ${mode === 'manage' ? `
    ${field({
      id: 'category',
      label: 'Category',
      optional: true,
      input: `<select id="category" name="category" ${describedBy('category', false)}><option value="">Choose a category</option>${categoryOptions}</select>`,
    })}
    ${field({
      id: 'servings',
      label: 'Approximate number of servings',
      optional: true,
      input: `<input id="servings" name="servings" type="number" inputmode="numeric" min="1" max="${LIMITS.servingsMax}" step="1" class="input-short" ${describedBy('servings', false)}>`,
    })}
    ` : ''}
    ${field({
      id: 'ingredients',
      label: 'Known ingredients or allergens',
      optional: true,
      hint: 'For example: contains nuts, dairy and gluten.',
      input: `<textarea id="ingredients" name="ingredients" rows="2" maxlength="${LIMITS.ingredients}" ${describedBy('ingredients', true)}></textarea>`,
    })}
    ${mode === 'manage' ? `
    ${field({
      id: 'foodNotes',
      label: 'Notes',
      optional: true,
      hint: 'Anything the organisers should know, like if it needs keeping warm.',
      input: `<textarea id="foodNotes" name="foodNotes" rows="2" maxlength="${LIMITS.foodNotes}" ${describedBy('foodNotes', true)}></textarea>`,
    })}
    ` : ''}
  </fieldset>
</div>`
    : '';

  return `<form id="rsvp-form" class="card rsvp-form" novalidate data-mode="${mode}" data-form-token="${esc(formToken || '')}">
  <div id="error-summary" class="error-summary" tabindex="-1" hidden>
    <h3>Please check the following</h3>
    <ul></ul>
  </div>
  ${field({
    id: 'fullName',
    label: 'Full name',
    input: `<input id="fullName" name="fullName" type="text" autocomplete="name" maxlength="${LIMITS.fullName}" required ${describedBy('fullName', false)}>`,
  })}
  ${field({
    id: 'email',
    label: 'Email address',
    input: `<input id="email" name="email" type="email" inputmode="email" autocomplete="email" spellcheck="false" autocapitalize="off" maxlength="${LIMITS.email}" required ${describedBy('email', false)}>`,
  })}
  ${field({
    id: 'dietary',
    label: 'Dietary requirements or allergies',
    optional: true,
    hint: 'Shared food can’t be guaranteed allergen-free.',
    input: `<textarea id="dietary" name="dietary" rows="2" maxlength="${LIMITS.dietary}" ${describedBy('dietary', true)}></textarea>`,
  })}
  ${bringing}
  ${foodDetails}
  ${mode === 'manage' ? `<div class="field checkbox-field">
    <label class="checkbox"><input type="checkbox" id="marketingOptIn" name="marketingOptIn" value="yes"> <span>Let me know about future Shared Light Café gatherings <span class="optional">(optional)</span></span></label>
  </div>` : ''}
  <p class="privacy small" id="privacy">Your details are only shared with the event organisers.</p>
  <div class="hp" aria-hidden="true">
    <label for="website">Leave this field empty</label>
    <input id="website" name="website" type="text" tabindex="-1" autocomplete="off">
  </div>
  <div id="form-alert" class="form-alert" role="alert" hidden></div>
  <div class="form-actions">
    <button type="submit" class="btn btn-large" id="submit-btn">
      <span class="btn-label">${mode === 'manage' ? 'Save changes' : 'Send my RSVP'}</span>
      <span class="spinner" aria-hidden="true"></span>
    </button>
    ${mode === 'manage' ? '<button type="button" class="btn btn-quiet" id="cancel-btn">Cancel my RSVP</button>' : ''}
  </div>
  <p id="form-status" class="visually-hidden" role="status" aria-live="polite"></p>
</form>
<noscript><p class="note">Please turn on JavaScript in your browser to send your RSVP.</p></noscript>`;
}

function confirmationPanel(ev) {
  return `<div id="rsvp-success" class="card success" tabindex="-1" hidden>
  <div class="success-head">
    ${ICONS.cup}
    <h3 id="success-title">You’re on the list</h3>
  </div>
  <p id="success-message">Thank you — your RSVP has been saved. We’re looking forward to seeing you.</p>
  ${detailsList(ev, { compact: true })}
  <div id="success-food" class="success-food"></div>
  ${ev.calendarAvailable ? '<p><a class="btn btn-secondary" href="/event.ics" download="shared-light-cafe.ics">Add to calendar</a></p>' : ''}
  <div class="manage-box">
    <h4>Need to make a change?</h4>
    <p class="small">Save this private link to update or cancel your RSVP. We don’t send confirmation emails.</p>
    <div class="copy-row">
      <label for="manage-link" class="visually-hidden">Your private link</label>
      <input id="manage-link" type="text" readonly>
      <button type="button" class="btn btn-secondary btn-small" id="copy-link">Copy link</button>
    </div>
    <p class="small copy-status" id="copy-status" role="status" aria-live="polite"></p>
  </div>
</div>
<div id="rsvp-cancelled" class="card success" tabindex="-1" hidden>
  <h3>Your RSVP has been cancelled</h3>
  <p>Thanks for letting us know. If your plans change, you’re welcome to <a href="/#rsvp">RSVP again</a>.</p>
</div>`;
}

function footer(ev) {
  return `<footer class="site-footer">
  <div class="wrap">
    <p class="footer-brand">${LOGO}<span>Shared Light Café · ${esc(ev.dateLabel)}</span></p>
    <p class="small">RSVP details are used only to organise this event.${ev.contactEmail ? ` Questions? <a href="mailto:${esc(ev.contactEmail)}">${esc(ev.contactEmail)}</a>` : ''}</p>
  </div>
</footer>`;
}

// ---- Pages ----------------------------------------------------------------------

export function homePage(ev, { formToken, siteUrl, ogImage }) {
  const location = !ev.timeConfirmed && !ev.venueConfirmed
    ? 'Time &amp; venue to be confirmed'
    : `${esc(ev.timeLabel)} · ${esc(ev.venueLabel)}`;
  const deadline = ev.foodDeadlineLabel.replace(/^\w+ /, '').replace(/ \d{4}$/, '');
  const body = `<a class="skip-link" href="#rsvp">Skip to the RSVP form</a>
<main id="main">
  ${pillHero(ev)}
  <section class="section rsvp-section simple-rsvp" id="rsvp" aria-labelledby="rsvp-title" tabindex="-1">
    <div class="wrap narrow">
      <div class="rsvp-frame">
      ${FRAME_ORNAMENTS}
      <h2 id="rsvp-title" class="rsvp-script">${SPARKLE.replace('class="sparkle"', 'class="sparkle sparkle-top"')}${SPARKLE.replace('class="sparkle"', 'class="sparkle sparkle-left"')}<span aria-hidden="true">Rsvp</span><span class="visually-hidden">RSVP</span></h2>
      <div class="event-summary" id="rsvp-intro">
        <p>${esc(ev.name)} · ${esc(ev.dateLabel)}<br>${location}</p>
        ${ev.venueAddress ? `<p>${esc(ev.venueAddress)}</p>` : ''}
        ${ev.mapUrl ? `<p><a href="${esc(ev.mapUrl)}" target="_blank" rel="noopener noreferrer">View map</a></p>` : ''}
        ${ev.entryConfirmed ? `<p>${esc(ev.entryLabel)}</p>` : ''}
        <p class="small">Everyone welcome. Bringing food is optional.${ev.foodOpen ? ` Please let us know by ${esc(deadline)}.` : ''}</p>
        ${ev.calendarAvailable ? '<a href="/event.ics" download="shared-light-cafe.ics">Add to calendar</a>' : ''}
      </div>
      ${rsvpForm(ev, { mode: 'create', formToken })}
      ${confirmationPanel(ev)}
      </div>
    </div>
  </section>
</main>`;
  return layout({
    title: `${ev.name} · ${ev.dateLabel}`,
    description: ev.summary,
    siteUrl,
    ogImage,
    body,
    bodyClass: 'cinematic-page',
    cinematic: true,
    scripts: ['/js/rsvp.js'],
  });
}

export function managePage(ev, { siteUrl }) {
  const body = `${header({ showRsvp: false })}
<main id="main">
  <section class="section rsvp-section" id="rsvp" aria-labelledby="rsvp-title" tabindex="-1">
    <div class="wrap narrow">
      <h1 id="rsvp-title">Your RSVP</h1>
      <p class="lede-small" id="rsvp-intro" role="status">Loading your booking…</p>
      <div id="manage-missing" class="card" hidden>
        <p>We couldn’t find this booking. The link may be incomplete, or the RSVP may have been cancelled.</p>
        <p><a class="btn" href="/#rsvp">RSVP for ${esc(ev.name)}</a></p>
      </div>
      <div id="manage-body" hidden>
        <div class="card details-card">
          <h2 class="card-title">Event details</h2>
          ${detailsList(ev, { compact: true })}
        </div>
        ${rsvpForm(ev, { mode: 'manage' })}
      </div>
      ${confirmationPanel(ev)}
    </div>
  </section>
</main>
${footer(ev)}`;
  return layout({ title: `Your RSVP · ${ev.name}`, description: ev.summary, siteUrl, body, scripts: ['/js/rsvp.js'], noindex: true });
}

export function loginPage({ error, configured }) {
  const body = `${header({ showRsvp: false })}
<main id="main" class="section">
  <div class="wrap login-wrap">
    <div class="card">
      <h1 class="card-title">Organiser sign in</h1>
      ${
        configured
          ? `${error ? `<div class="form-alert" role="alert"><p>${esc(error)}</p></div>` : ''}
      <form method="post" action="/organiser/login" class="login-form">
        <div class="field">
          <label for="password">Password</label>
          <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
        </div>
        <button type="submit" class="btn">Sign in</button>
      </form>`
          : '<p>Organiser access isn’t set up yet. Set the <code>ORGANISER_PASSWORD</code> environment variable on the server and restart it.</p>'
      }
    </div>
  </div>
</main>`;
  return layout({ title: 'Organiser sign in · Shared Light Café', description: 'Organiser access', body, noindex: true });
}

export function organiserPage(ev) {
  const body = `<header class="site-header">
  <div class="wrap wide header-inner">
    <span class="brand">${LOGO}<span>Organiser view</span></span>
    <form method="post" action="/organiser/logout"><button type="submit" class="btn btn-small btn-secondary">Sign out</button></form>
  </div>
</header>
<main id="main" class="organiser">
  <div class="wrap wide">
    <div class="org-head">
      <div>
        <h1>${esc(ev.name)}</h1>
        <p class="small muted">${esc(ev.dateLabel)} · Time: ${esc(ev.timeLabel)} · Venue: ${esc(ev.venueLabel)}</p>
      </div>
      <a class="btn btn-secondary" href="/organiser/export.csv" download>Download CSV</a>
    </div>

    <p id="org-status" class="org-status" role="status" aria-live="polite">Loading RSVPs…</p>

    <section aria-labelledby="stats-title">
      <h2 id="stats-title" class="visually-hidden">Summary</h2>
      <dl class="stats" id="stats"></dl>
    </section>

    <nav class="org-nav" aria-label="Organiser sections">
      <a href="#attendees">Attendees</a><a href="#food">Food</a><a href="#dietary">Dietary</a>
    </nav>

    <section id="attendees" class="org-section" aria-labelledby="attendees-title">
      <div class="org-section-head">
        <h2 id="attendees-title">Attendees</h2>
        <div class="search">
          <label for="search">Search attendees</label>
          <input id="search" type="search" placeholder="Name, email, dish…" autocomplete="off">
        </div>
      </div>
      <p class="small muted" id="search-count" role="status" aria-live="polite"></p>
      <div class="table-wrap" role="region" aria-labelledby="attendees-title" tabindex="0">
        <table>
          <thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Bringing</th><th scope="col">Dietary</th><th scope="col">Updates</th><th scope="col">RSVP’d</th><th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead>
          <tbody id="attendee-rows"></tbody>
        </table>
      </div>
    </section>

    <section id="food" class="org-section" aria-labelledby="food-title">
      <h2 id="food-title">Food contributions</h2>
      <p class="small muted">“Confirmed” is for organisers to tick once a contribution has been agreed. It resets if the guest changes their food details.</p>
      <div class="table-wrap" role="region" aria-labelledby="food-title" tabindex="0">
        <table>
          <thead><tr><th scope="col">Guest</th><th scope="col">Response</th><th scope="col">Dish or item</th><th scope="col">Category</th><th scope="col">Servings</th><th scope="col">Ingredients / allergens</th><th scope="col">Notes</th><th scope="col">Confirmed</th></tr></thead>
          <tbody id="food-rows"></tbody>
        </table>
      </div>
    </section>

    <section id="dietary" class="org-section" aria-labelledby="dietary-title">
      <h2 id="dietary-title">Dietary requirements and allergies</h2>
      <ul class="dietary-list" id="dietary-rows"></ul>
    </section>
  </div>
</main>`;
  return layout({ title: 'Organiser view · Shared Light Café', description: 'Organiser view', body, scripts: ['/js/organiser.js'], bodyClass: 'organiser-body', noindex: true });
}
