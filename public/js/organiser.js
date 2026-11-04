import { CATEGORIES } from './validation.js';

const $ = (id) => document.getElementById(id);
const BRINGING = { yes: 'Yes', maybe: 'Maybe', no: 'No' };

let rsvps = [];

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

const formatDate = (iso) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
    credentials: 'same-origin',
  });
  if (res.status === 401) {
    location.href = '/organiser/login';
    throw new Error('signed out');
  }
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function setStatus(message) {
  $('org-status').textContent = message;
}

// ---- Rendering -------------------------------------------------------------------

function renderStats() {
  const offering = rsvps.filter((r) => r.bringing === 'yes');
  const maybe = rsvps.filter((r) => r.bringing === 'maybe');
  const stats = [
    ['Total RSVPs', rsvps.length],
    ['Bringing food', offering.length],
    ['Maybe bringing', maybe.length],
    ['Food confirmed', rsvps.filter((r) => r.bringing !== 'no' && r.foodConfirmed).length],
    ['Dietary notes', rsvps.filter((r) => r.dietary).length],
    ['Future updates opt-in', rsvps.filter((r) => r.marketingOptIn).length],
  ];
  $('stats').replaceChildren(
    ...stats.map(([label, value]) => {
      const div = el('div', null, 'stat');
      div.append(el('dt', label), el('dd', String(value)));
      return div;
    }),
  );
}

function matches(r, q) {
  if (!q) return true;
  return [r.fullName, r.email, r.dish, r.dietary, r.ingredients, r.foodNotes].some((v) => v && v.toLowerCase().includes(q));
}

function renderAttendees() {
  const q = $('search').value.trim().toLowerCase();
  const shown = rsvps.filter((r) => matches(r, q));
  const body = $('attendee-rows');
  body.replaceChildren();
  if (!shown.length) {
    const tr = el('tr');
    const td = el('td', rsvps.length ? 'No attendees match your search.' : 'No RSVPs yet.', 'empty');
    td.colSpan = 7;
    tr.append(td);
    body.append(tr);
  }
  for (const r of shown) {
    const tr = el('tr');
    const name = el('th', r.fullName);
    name.scope = 'row';
    const bringing = r.bringing === 'no' ? 'No' : `${BRINGING[r.bringing]}${r.dish ? `: ${r.dish}` : ''}`;
    const del = el('button', 'Remove', 'btn btn-quiet btn-small');
    del.type = 'button';
    del.setAttribute('aria-label', `Remove RSVP for ${r.fullName}`);
    del.addEventListener('click', () => removeRsvp(r));
    const actions = el('td');
    actions.append(del);
    tr.append(name, el('td', r.email), el('td', bringing), el('td', r.dietary || 'None', 'prewrap'), el('td', r.marketingOptIn ? 'Yes' : 'No'), el('td', formatDate(r.createdAt)), actions);
    body.append(tr);
  }
  $('search-count').textContent = q ? `Showing ${shown.length} of ${rsvps.length} attendees.` : '';
}

function renderFood() {
  const food = rsvps.filter((r) => r.bringing !== 'no');
  const body = $('food-rows');
  body.replaceChildren();
  if (!food.length) {
    const tr = el('tr');
    const td = el('td', 'No food contributions yet.', 'empty');
    td.colSpan = 8;
    tr.append(td);
    body.append(tr);
  }
  for (const r of food) {
    const tr = el('tr');
    const name = el('th', r.fullName);
    name.scope = 'row';
    const response = el('td');
    response.append(el('span', r.bringing === 'yes' ? 'Offered' : 'Maybe', `badge badge-${r.bringing}`));

    const confirmCell = el('td');
    const box = el('input');
    box.type = 'checkbox';
    box.checked = r.foodConfirmed;
    box.setAttribute('aria-label', `Food confirmed for ${r.fullName}`);
    box.addEventListener('change', () => setFoodConfirmed(r, box));
    confirmCell.append(box);

    tr.append(
      name,
      response,
      el('td', r.dish || 'Not decided'),
      el('td', CATEGORIES[r.category] || 'Not given'),
      el('td', r.servings ? String(r.servings) : 'Not given'),
      el('td', r.ingredients || 'Not given', 'prewrap'),
      el('td', r.foodNotes || 'None', 'prewrap'),
      confirmCell,
    );
    body.append(tr);
  }
}

function renderDietary() {
  const list = $('dietary-rows');
  list.replaceChildren();
  const withNotes = rsvps.filter((r) => r.dietary);
  if (!withNotes.length) {
    list.append(el('li', 'No dietary requirements or allergies recorded.', 'empty'));
    return;
  }
  for (const r of withNotes) {
    const li = el('li');
    li.append(el('strong', r.fullName), el('span', r.dietary, 'prewrap'));
    list.append(li);
  }
}

function renderAll() {
  renderStats();
  renderAttendees();
  renderFood();
  renderDietary();
}

// ---- Actions -----------------------------------------------------------------------

async function setFoodConfirmed(r, box) {
  box.disabled = true;
  try {
    const { rsvp } = await api(`/api/organiser/rsvps/${r.id}`, { method: 'PATCH', body: JSON.stringify({ foodConfirmed: box.checked }) });
    Object.assign(r, rsvp);
    renderStats();
    setStatus(`${r.fullName}: food ${rsvp.foodConfirmed ? 'marked as confirmed' : 'marked as not confirmed'}.`);
  } catch (err) {
    box.checked = !box.checked;
    setStatus(`Couldn’t update ${r.fullName}: ${err.message}`);
  } finally {
    box.disabled = false;
  }
}

async function removeRsvp(r) {
  if (!window.confirm(`Remove the RSVP for ${r.fullName}? This can’t be undone.`)) return;
  try {
    await api(`/api/organiser/rsvps/${r.id}`, { method: 'DELETE' });
    rsvps = rsvps.filter((x) => x.id !== r.id);
    renderAll();
    setStatus(`Removed the RSVP for ${r.fullName}.`);
    $('search').focus();
  } catch (err) {
    setStatus(`Couldn’t remove ${r.fullName}: ${err.message}`);
  }
}

async function load() {
  try {
    ({ rsvps } = await api('/api/organiser/rsvps'));
    renderAll();
    setStatus(`${rsvps.length} RSVP${rsvps.length === 1 ? '' : 's'} loaded.`);
  } catch (err) {
    setStatus(`Couldn’t load RSVPs: ${err.message}. Please refresh the page.`);
  }
}

$('search').addEventListener('input', renderAttendees);
load();
