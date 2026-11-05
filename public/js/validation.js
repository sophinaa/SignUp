// RSVP validation rules, shared by the browser form and the server.
// The server always re-validates; the browser copy is only for quick feedback.

export const LIMITS = {
  fullName: 100,
  phone: 30,
  dietary: 500,
  dish: 120,
  ingredients: 500,
  foodNotes: 500,
  servingsMax: 500,
};

export const BRINGING = ['yes', 'maybe', 'no'];

export const CATEGORIES = {
  savoury: 'Savoury',
  sweet: 'Sweet',
  drinks: 'Drinks',
  other: 'Other',
};

// International format after normalising: + then 7 to 15 digits.
const PHONE_RE = /^\+[1-9]\d{6,14}$/;

// Normalises a phone number so the same number always matches: drops spaces
// and punctuation, and writes UK numbers ("07700 900123", "+44 (0)7700…") as +44.
export function normalisePhone(raw) {
  let n = raw.replace(/[\s().\-]/g, '');
  if (n.startsWith('00')) n = `+${n.slice(2)}`;
  else if (n.startsWith('0')) n = `+44${n.slice(1)}`;
  return n.replace(/^\+440/, '+44');
}

// Removes control characters (keeping newlines in multi-line fields) and trims.
function clean(value, { multiline = false } = {}) {
  if (typeof value !== 'string') return '';
  const pattern = multiline ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g;
  return value.replace(/\r\n?/g, '\n').replace(pattern, '').trim();
}

function truthy(value) {
  return value === true || value === 'true' || value === 'on' || value === 'yes';
}

// Validates RSVP input. Returns { value, errors } where `errors` maps field
// names to messages and is empty when the input is valid.
// `foodOpen: false` rejects new food offers (after the contribution deadline).
export function validateRsvp(input, { foodOpen = true } = {}) {
  const raw = input && typeof input === 'object' ? input : {};
  const errors = {};

  const value = {
    fullName: clean(raw.fullName).replace(/\s+/g, ' '),
    phone: clean(raw.phone),
    dietary: clean(raw.dietary, { multiline: true }),
    bringing: clean(raw.bringing),
    dish: clean(raw.dish),
    category: clean(raw.category),
    servings: clean(String(raw.servings ?? '')),
    ingredients: clean(raw.ingredients, { multiline: true }),
    foodNotes: clean(raw.foodNotes, { multiline: true }),
    marketingOptIn: truthy(raw.marketingOptIn),
  };

  if (!value.fullName) errors.fullName = 'Please enter your full name.';
  else if (value.fullName.length > LIMITS.fullName) errors.fullName = `Please keep your name under ${LIMITS.fullName} characters.`;

  if (!value.phone) errors.phone = 'Please enter your phone number.';
  else if (value.phone.length > LIMITS.phone || !PHONE_RE.test(normalisePhone(value.phone))) {
    errors.phone = 'Please enter a valid phone number, like 07700 900123 (include the country code if it isn’t a UK number).';
  } else value.phone = normalisePhone(value.phone);

  if (value.dietary.length > LIMITS.dietary) errors.dietary = `Please keep this under ${LIMITS.dietary} characters.`;

  if (!BRINGING.includes(value.bringing)) {
    errors.bringing = 'Please choose Yes, Maybe or No.';
  } else if (value.bringing !== 'no' && !foodOpen) {
    errors.bringing = 'Food contributions have now closed, but you are still very welcome to come. Please choose No.';
  }

  if (value.bringing === 'yes' || value.bringing === 'maybe') {
    if (value.bringing === 'yes' && !value.dish) errors.dish = 'Please tell us what you’re planning to bring.';
    else if (value.dish.length > LIMITS.dish) errors.dish = `Please keep this under ${LIMITS.dish} characters.`;

    if (value.category && !Object.hasOwn(CATEGORIES, value.category)) errors.category = 'Please choose a category from the list.';

    if (value.servings) {
      const n = Number(value.servings);
      if (!Number.isInteger(n) || n < 1 || n > LIMITS.servingsMax) errors.servings = `Please enter a whole number between 1 and ${LIMITS.servingsMax}.`;
      else value.servings = n;
    } else {
      value.servings = null;
    }

    if (value.ingredients.length > LIMITS.ingredients) errors.ingredients = `Please keep this under ${LIMITS.ingredients} characters.`;
    if (value.foodNotes.length > LIMITS.foodNotes) errors.foodNotes = `Please keep this under ${LIMITS.foodNotes} characters.`;
  } else {
    // Not bringing anything: drop any food details left over in the form.
    Object.assign(value, { dish: '', category: '', servings: null, ingredients: '', foodNotes: '' });
  }

  return { value, errors };
}
