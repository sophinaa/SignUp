import { CATEGORIES } from '../public/js/validation.js';

const BRINGING_LABELS = { yes: 'Yes', maybe: 'Maybe', no: 'No' };

const COLUMNS = [
  ['Full name', (r) => r.fullName],
  ['Phone', (r) => r.phone || ''],
  ['Email (early RSVPs)', (r) => r.email || ''],
  ['Dietary requirements / allergies', (r) => r.dietary],
  ['Bringing food', (r) => BRINGING_LABELS[r.bringing]],
  ['Dish or item', (r) => r.dish],
  ['Category', (r) => CATEGORIES[r.category] || ''],
  ['Servings', (r) => r.servings ?? ''],
  ['Ingredients / allergens', (r) => r.ingredients],
  ['Food notes', (r) => r.foodNotes],
  ['Food confirmed by organiser', (r) => (r.bringing === 'no' ? '' : r.foodConfirmed ? 'Yes' : 'No')],
  ['Future events opt-in', (r) => (r.marketingOptIn ? 'Yes' : 'No')],
  ['RSVP received', (r, fmt) => fmt(r.createdAt)],
  ['Last updated', (r, fmt) => fmt(r.updatedAt)],
];

function cell(value) {
  let s = String(value ?? '');
  // Stop spreadsheet apps from treating guest input as a formula.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// "2026-11-04 12:00" in the event's time zone.
function timestampFormatter(timeZone) {
  const f = new Intl.DateTimeFormat('sv-SE', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  return (iso) => (iso ? f.format(new Date(iso)) : '');
}

export function rsvpsToCsv(rsvps, { timeZone = 'Europe/London' } = {}) {
  const fmt = timestampFormatter(timeZone);
  const rows = [COLUMNS.map(([h]) => h), ...rsvps.map((r) => COLUMNS.map(([, get]) => get(r, fmt)))];
  // Leading BOM so Excel opens the file as UTF-8 (names, "Café", etc.).
  return '\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
