import { zonedToUtc } from './event.js';

const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000;

const icsDate = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const icsText = (s) =>
  String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

// Folds lines longer than 75 octets, as RFC 5545 requires.
function fold(line) {
  const out = [];
  let current = '';
  for (const ch of line) {
    if (Buffer.byteLength(current + ch) > 74) {
      out.push(current);
      current = ' ' + ch;
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out.join('\r\n');
}

// Returns an .ics calendar file, or null while the start time is unconfirmed.
export function buildIcs(config, view, siteUrl) {
  if (!view.calendarAvailable) return null;
  const start = zonedToUtc(config.date, config.startTime, config.timezone);
  const end = config.endTime
    ? zonedToUtc(config.date, config.endTime, config.timezone)
    : new Date(start.getTime() + DEFAULT_DURATION_MS);

  const location = [view.venueName, view.venueAddress].filter(Boolean).join(', ');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Shared Light Cafe//RSVP//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${config.date}-shared-light-cafe@${siteUrl ? new URL(siteUrl).host : 'shared-light-cafe'}`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(view.name)}`,
    `DESCRIPTION:${icsText(view.summary + (siteUrl ? `\n\n${siteUrl}` : ''))}`,
    ...(location ? [`LOCATION:${icsText(location)}`] : []),
    ...(siteUrl ? [`URL:${siteUrl}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}
