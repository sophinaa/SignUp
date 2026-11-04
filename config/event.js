// ---------------------------------------------------------------------------
// Shared Light Café: event details
//
// This is the one file to edit when event details change. Restart the server
// after saving (on most hosts, a redeploy does this for you).
//
// Leave a value as `null` while it is unknown: the site will show
// "To be confirmed" (or "Entry details coming soon" for entry) in its place.
// ---------------------------------------------------------------------------

export default {
  name: 'Shared Light Café',

  // Short description used in link previews (WhatsApp, Instagram, etc.).
  summary:
    'A relaxed community gathering to meet new people, share food and build community. Reverts, people exploring Islam and anyone coming along to connect are welcome.',

  // Event date, written as YYYY-MM-DD.
  date: '2026-11-22',

  // Start and end times in 24-hour HH:MM format, e.g. '14:00' and '17:00'.
  // Once `startTime` is set, the time is shown and an "Add to calendar"
  // download appears. `endTime` is optional (the calendar entry defaults to
  // three hours if it is left out).
  startTime: '11:00',
  endTime: null,

  // Time zone the times above are in.
  timezone: 'Europe/London',

  venue: {
    // e.g. 'The Community Hall'
    name: 'The Faith Project',
    // e.g. '12 Example Street, London AB1 2CD'
    address: null,
    // Optional link to a map, e.g. a Google Maps URL.
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=The+Faith+Project',
  },

  // Entry details shown to guests, e.g. '£2 on the door'.
  // Leave as null to show "Entry details coming soon".
  entry: null,

  // Last day for confirming food contributions (YYYY-MM-DD). After the end of
  // this day the "bring something" option is closed for new RSVPs.
  foodDeadline: '2026-11-18',

  // Optional public contact email for questions. When null, no contact
  // address is shown anywhere on the site.
  contactEmail: null,
};
