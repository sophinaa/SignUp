import { validateRsvp, CATEGORIES } from './validation.js';

const FIELD_LABELS = {
  fullName: 'Full name',
  email: 'Email address',
  dietary: 'Dietary requirements or allergies',
  bringing: 'Would you like to bring something to share?',
  dish: 'Dish or item',
  category: 'Category',
  servings: 'Approximate number of servings',
  ingredients: 'Known ingredients or allergens',
  foodNotes: 'Notes',
};
const FIELD_ORDER = Object.keys(FIELD_LABELS);
const TEXT_FIELDS = ['fullName', 'email', 'dietary', 'dish', 'category', 'servings', 'ingredients', 'foodNotes'];
const REQUEST_TIMEOUT_MS = 20000;

const $ = (id) => document.getElementById(id);

function newSubmissionId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

async function request(url, { method = 'GET', body } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      credentials: 'same-origin',
    });
    let data = {};
    if (res.status !== 204) {
      try {
        data = await res.json();
      } catch {
        data = {};
      }
    }
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

const form = $('rsvp-form');
if (form) init();

function init() {
  const mode = form.dataset.mode;
  const submitBtn = $('submit-btn');
  const submitLabel = submitBtn.querySelector('.btn-label');
  const idleLabel = submitLabel.textContent;
  const summary = $('error-summary');
  const alertBox = $('form-alert');
  const status = $('form-status');
  const foodDetails = $('food-details');
  const dishTag = form.querySelector('[data-dish-tag]');

  const submissionId = newSubmissionId();
  let manageToken = mode === 'manage' ? decodeURIComponent(location.hash.slice(1)) : null;
  let busy = false;
  let shownErrors = {};

  // ---- Reading and filling the form -------------------------------------------

  function readForm() {
    const data = {};
    for (const name of TEXT_FIELDS) data[name] = form.elements[name]?.value ?? '';
    // Radios (a RadioNodeList) or, after the food deadline, a hidden input.
    data.bringing = form.elements.bringing?.value ?? '';
    data.marketingOptIn = $('marketingOptIn')?.checked ?? false;
    return data;
  }

  function fillForm(rsvp) {
    for (const name of TEXT_FIELDS) {
      if (form.elements[name]) form.elements[name].value = rsvp[name] ?? '';
    }
    const radio = form.querySelector(`input[name="bringing"][value="${rsvp.bringing}"]`);
    if (radio) radio.checked = true;
    if ($('marketingOptIn')) $('marketingOptIn').checked = Boolean(rsvp.marketingOptIn);
    updateFood();
  }

  // ---- Food details reveal ----------------------------------------------------

  function updateFood() {
    if (!foodDetails) return;
    const choice = readForm().bringing;
    const show = choice === 'yes' || choice === 'maybe';
    foodDetails.hidden = !show;
    form.querySelectorAll('input[name="bringing"][aria-controls]').forEach((r) => r.setAttribute('aria-expanded', String(show)));
    if (dishTag) dishTag.textContent = choice === 'maybe' ? '(if you know)' : '';
    $('dish').required = choice === 'yes';
  }

  // ---- Errors -------------------------------------------------------------------

  function fieldTarget(name) {
    return name === 'bringing' ? form.querySelector('input[name="bringing"]') : $(name);
  }

  function setFieldError(name, message) {
    const wrapper = form.querySelector(`[data-field="${name}"]`);
    const errorEl = $(`${name}-error`);
    if (!wrapper || !errorEl) return;
    wrapper.classList.toggle('has-error', Boolean(message));
    errorEl.hidden = !message;
    errorEl.textContent = '';
    if (message) {
      errorEl.append(el('span', 'Error: ', 'visually-hidden'), message);
    }
    const inputs = name === 'bringing' ? form.querySelectorAll('input[name="bringing"]') : [$(name)];
    inputs.forEach((input) => {
      if (!input) return;
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    });
  }

  function showErrors(errors) {
    shownErrors = errors;
    for (const name of FIELD_ORDER) setFieldError(name, errors[name]);
    const names = FIELD_ORDER.filter((n) => errors[n]);
    const list = summary.querySelector('ul');
    list.replaceChildren();
    for (const name of names) {
      const target = fieldTarget(name);
      const link = el('a', errors[name]);
      link.href = `#${target?.id || name}`;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        target?.focus();
        target?.scrollIntoView({ block: 'center' });
      });
      const item = el('li');
      item.append(link);
      list.append(item);
    }
    summary.hidden = names.length === 0;
    return names.length;
  }

  function showAlert(message) {
    alertBox.replaceChildren(el('p', message));
    alertBox.hidden = !message;
  }

  // Re-check a field as the guest fixes it, once it has been flagged.
  form.addEventListener('input', (e) => {
    const name = e.target.name;
    if (name === 'bringing' || !shownErrors[name]) return;
    const { errors } = validateRsvp(readForm());
    if (!errors[name]) {
      delete shownErrors[name];
      setFieldError(name, null);
      if (!Object.keys(shownErrors).length) summary.hidden = true;
    }
  });

  form.addEventListener('change', (e) => {
    if (e.target.name !== 'bringing') return;
    updateFood();
    if (shownErrors.bringing) {
      delete shownErrors.bringing;
      setFieldError('bringing', null);
    }
    if (shownErrors.dish && e.target.value !== 'yes') {
      delete shownErrors.dish;
      setFieldError('dish', null);
    }
  });

  // ---- Busy state -----------------------------------------------------------------

  function setBusy(on, message = '') {
    busy = on;
    form.setAttribute('aria-busy', String(on));
    submitBtn.setAttribute('aria-disabled', String(on));
    submitBtn.classList.toggle('is-busy', on);
    submitLabel.textContent = on ? (mode === 'manage' ? 'Saving…' : 'Sending…') : idleLabel;
    const cancelBtn = $('cancel-btn');
    if (cancelBtn) cancelBtn.setAttribute('aria-disabled', String(on));
    status.textContent = message;
  }

  // ---- Success ------------------------------------------------------------------

  function foodSummary(rsvp) {
    const box = $('success-food');
    box.replaceChildren();
    if (rsvp.dietary) {
      box.append(el('h4', 'Dietary requirements or allergies'), el('p', rsvp.dietary, 'prewrap'));
    }
    if (rsvp.bringing === 'no') {
      box.append(el('h4', 'Food'), el('p', 'You’re not bringing anything, and that’s absolutely fine.'));
      return;
    }
    box.append(el('h4', rsvp.bringing === 'yes' ? 'Your food contribution' : 'You might bring something'));
    const dl = el('dl', null, 'summary-list');
    const row = (label, value) => {
      if (value == null || value === '') return;
      const div = el('div');
      div.append(el('dt', label), el('dd', String(value), 'prewrap'));
      dl.append(div);
    };
    row('Dish or item', rsvp.dish || 'Not decided yet');
    row('Category', CATEGORIES[rsvp.category]);
    row('Servings', rsvp.servings ? `About ${rsvp.servings}` : null);
    row('Ingredients or allergens', rsvp.ingredients);
    row('Notes', rsvp.foodNotes);
    box.append(dl);
    box.append(
      el(
        'p',
        rsvp.bringing === 'maybe'
          ? 'No pressure. If you decide to bring something, please update your RSVP using your private link below.'
          : 'Thank you! Please make sure it’s halal and labelled with ingredients and allergens. An organiser may get in touch about food arrangements.',
        'small',
      ),
    );
  }

  function showSuccess(data, { updated = false } = {}) {
    manageToken = data.manageToken;
    const panel = $('rsvp-success');
    const firstName = data.rsvp.fullName.split(' ')[0];
    $('success-title').textContent = updated ? 'Your changes are saved' : `You’re on the list, ${firstName}`;
    $('success-message').textContent = updated
      ? 'Thanks for keeping us up to date. Here’s a summary of your RSVP.'
      : 'Thank you. Your RSVP has been saved and we’re looking forward to seeing you.';
    foodSummary(data.rsvp);
    $('manage-link').value = `${location.origin}/booking#${encodeURIComponent(manageToken)}`;
    form.hidden = true;
    const intro = $('rsvp-intro');
    if (intro) intro.hidden = true;
    const manageBody = $('manage-body');
    if (manageBody) manageBody.hidden = true;
    panel.hidden = false;
    panel.focus();
    panel.scrollIntoView({ block: 'start' });
  }

  $('copy-link')?.addEventListener('click', async () => {
    const input = $('manage-link');
    const copyStatus = $('copy-status');
    try {
      await navigator.clipboard.writeText(input.value);
      copyStatus.textContent = 'Link copied.';
    } catch {
      input.focus();
      input.select();
      copyStatus.textContent = 'Press and hold (or Ctrl+C / Cmd+C) to copy the selected link.';
    }
  });

  async function refreshFormToken() {
    try {
      const res = await request('/api/form-token');
      if (res.ok && res.data.formToken) form.dataset.formToken = res.data.formToken;
    } catch {
      // the next attempt will report the problem
    }
  }

  // ---- Submit ---------------------------------------------------------------------

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    showAlert('');

    const data = readForm();
    const { errors } = validateRsvp(data);
    if (showErrors(errors)) {
      summary.focus();
      return;
    }

    setBusy(true, mode === 'manage' ? 'Saving your changes…' : 'Sending your RSVP…');
    try {
      const res =
        mode === 'manage'
          ? await request(`/api/booking/${encodeURIComponent(manageToken)}`, { method: 'PUT', body: data })
          : await request('/api/rsvps', {
              method: 'POST',
              body: { ...data, submissionId, formToken: form.dataset.formToken, website: form.elements.website.value },
            });

      if (res.ok) {
        setBusy(false);
        showSuccess(res.data, { updated: mode === 'manage' });
        return;
      }
      if (res.data.code === 'invalid_form') {
        await refreshFormToken();
        showAlert('Sorry, something interrupted that. Your details are still here. Please press the button again.');
        setBusy(false, 'Your RSVP was not saved.');
        return;
      }
      if (res.data.fields) showErrors(res.data.fields);
      showAlert(res.data.error || 'Something went wrong and your RSVP was not saved. Please try again.');
      setBusy(false, 'Your RSVP was not saved.');
      alertBox.scrollIntoView({ block: 'center' });
      if (res.data.fields) summary.focus();
    } catch (err) {
      const timedOut = err?.name === 'AbortError';
      showAlert(
        timedOut
          ? 'This is taking longer than expected. Your details are still here. Please press the button again; you won’t be booked twice.'
          : 'We couldn’t reach the server, so your RSVP hasn’t been saved yet. Please check your connection and try again. Your details are still here.',
      );
      setBusy(false, 'Your RSVP was not saved.');
      alertBox.scrollIntoView({ block: 'center' });
    }
  });

  // ---- Manage mode ------------------------------------------------------------------

  if (mode !== 'manage') return;

  const intro = $('rsvp-intro');
  const missing = () => {
    intro.hidden = true;
    $('manage-missing').hidden = false;
  };

  (async () => {
    if (!manageToken) return missing();
    try {
      const res = await request(`/api/booking/${encodeURIComponent(manageToken)}`);
      if (!res.ok) {
        if (res.status === 404) return missing();
        intro.textContent = res.data.error || 'We couldn’t load your booking. Please refresh the page to try again.';
        return;
      }
      fillForm(res.data.rsvp);
      intro.textContent = 'Update your details below, or cancel if you can no longer come.';
      $('manage-body').hidden = false;
    } catch {
      intro.textContent = 'We couldn’t reach the server. Please check your connection and refresh the page.';
    }
  })();

  $('cancel-btn')?.addEventListener('click', async () => {
    if (busy) return;
    if (!window.confirm('Cancel your RSVP? Your details will be removed.')) return;
    showAlert('');
    setBusy(true, 'Cancelling your RSVP…');
    try {
      const res = await request(`/api/booking/${encodeURIComponent(manageToken)}`, { method: 'DELETE' });
      setBusy(false);
      if (!res.ok && res.status !== 404) {
        showAlert(res.data.error || 'We couldn’t cancel your RSVP. Please try again.');
        return;
      }
      intro.hidden = true;
      $('manage-body').hidden = true;
      const done = $('rsvp-cancelled');
      done.hidden = false;
      done.focus();
    } catch {
      setBusy(false);
      showAlert('We couldn’t reach the server, so your RSVP hasn’t been cancelled. Please try again.');
    }
  });
}
