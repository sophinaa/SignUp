// Turns the raw event config into display-ready values.

export const TBC = 'To be confirmed';
export const ENTRY_PENDING = 'Entry details coming soon';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const blank = (v) => v == null || String(v).trim() === '';

export function validateConfig(config) {
  const problems = [];
  if (blank(config.name)) problems.push('name is required');
  if (!DATE_RE.test(config.date || '')) problems.push('date must be YYYY-MM-DD');
  if (!DATE_RE.test(config.foodDeadline || '')) problems.push('foodDeadline must be YYYY-MM-DD');
  if (!blank(config.startTime) && !TIME_RE.test(config.startTime)) problems.push('startTime must be HH:MM (24-hour)');
  if (!blank(config.endTime) && !TIME_RE.test(config.endTime)) problems.push('endTime must be HH:MM (24-hour)');
  if (!blank(config.endTime) && blank(config.startTime)) problems.push('endTime is set but startTime is not');
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: config.timezone });
  } catch {
    problems.push(`timezone "${config.timezone}" is not recognised`);
  }
  if (problems.length) {
    throw new Error(`Invalid config/event.js: ${problems.join('; ')}`);
  }
}

// Milliseconds that `tz` is ahead of UTC at the given instant.
function tzOffsetMs(instant, tz) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instant);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

// Converts a wall-clock date and time in `tz` to a UTC Date.
export function zonedToUtc(date, time, tz) {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi, s = 0] = time.split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  const first = guess - tzOffsetMs(new Date(guess), tz);
  return new Date(guess - tzOffsetMs(new Date(first), tz));
}

function formatDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d))).replace(',', '');
}

// '14:30' -> '2:30pm', '14:00' -> '2pm'
function formatTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h < 12 ? 'am' : 'pm';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12}${suffix}` : `${hour12}:${String(m).padStart(2, '0')}${suffix}`;
}

export function eventView(config, now = new Date()) {
  const hasTime = !blank(config.startTime);
  const timeLabel = hasTime
    ? blank(config.endTime)
      ? formatTime(config.startTime)
      : `${formatTime(config.startTime)} – ${formatTime(config.endTime)}`
    : null;

  const venueName = blank(config.venue?.name) ? null : config.venue.name.trim();
  const venueAddress = blank(config.venue?.address) ? null : config.venue.address.trim();
  const mapUrl = !blank(config.venue?.mapUrl) && /^https?:\/\//i.test(config.venue.mapUrl) ? config.venue.mapUrl : null;

  const foodDeadlineEnd = zonedToUtc(config.foodDeadline, '23:59:59', config.timezone);

  return {
    name: config.name,
    summary: config.summary || '',
    date: config.date,
    dateLabel: formatDate(config.date),
    shortDateLabel: formatDate(config.date).replace(/ \d{4}$/, ''),
    timeConfirmed: hasTime,
    timeLabel: timeLabel || TBC,
    venueConfirmed: Boolean(venueName || venueAddress),
    venueName,
    venueAddress,
    venueLabel: venueName || venueAddress || TBC,
    mapUrl,
    entryConfirmed: !blank(config.entry),
    entryLabel: blank(config.entry) ? ENTRY_PENDING : config.entry.trim(),
    foodDeadlineLabel: formatDate(config.foodDeadline),
    foodDeadlineShort: formatDate(config.foodDeadline).replace(/ \d{4}$/, ''),
    foodOpen: now <= foodDeadlineEnd,
    contactEmail: blank(config.contactEmail) ? null : config.contactEmail.trim(),
    calendarAvailable: hasTime,
  };
}

// The details guests see in the confirmation; safe to send to the browser.
export function publicEventDetails(view) {
  return {
    name: view.name,
    dateLabel: view.dateLabel,
    timeLabel: view.timeLabel,
    venueLabel: view.venueLabel,
    venueAddress: view.venueName ? view.venueAddress : null,
    entryLabel: view.entryLabel,
    calendarUrl: view.calendarAvailable ? '/event.ics' : null,
  };
}
