import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS rsvps (
  id                  INTEGER PRIMARY KEY,
  public_id           TEXT NOT NULL UNIQUE,
  submission_id       TEXT UNIQUE,
  full_name           TEXT NOT NULL,
  email               TEXT NOT NULL UNIQUE COLLATE NOCASE,
  dietary             TEXT NOT NULL DEFAULT '',
  bringing            TEXT NOT NULL CHECK (bringing IN ('yes', 'maybe', 'no')),
  dish                TEXT NOT NULL DEFAULT '',
  category            TEXT NOT NULL DEFAULT '',
  servings            INTEGER,
  ingredients         TEXT NOT NULL DEFAULT '',
  food_notes          TEXT NOT NULL DEFAULT '',
  food_confirmed      INTEGER NOT NULL DEFAULT 0,
  marketing_opt_in    INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);
`;

const FOOD_FIELDS = ['bringing', 'dish', 'category', 'servings', 'ingredients', 'foodNotes'];

export class DuplicateEmailError extends Error {}

function toRecord(row) {
  if (!row) return null;
  return {
    id: row.public_id,
    submissionId: row.submission_id,
    fullName: row.full_name,
    email: row.email,
    dietary: row.dietary,
    bringing: row.bringing,
    dish: row.dish,
    category: row.category,
    servings: row.servings,
    ingredients: row.ingredients,
    foodNotes: row.food_notes,
    foodConfirmed: Boolean(row.food_confirmed),
    marketingOptIn: Boolean(row.marketing_opt_in),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const isUniqueEmailError = (err) => /UNIQUE constraint failed: rsvps\.email/.test(err?.message || '');

export function openDatabase(file) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  db.exec(SCHEMA);

  const q = {
    insert: db.prepare(`
      INSERT INTO rsvps (public_id, submission_id, full_name, email, dietary, bringing, dish, category,
                         servings, ingredients, food_notes, marketing_opt_in, created_at, updated_at)
      VALUES (:publicId, :submissionId, :fullName, :email, :dietary, :bringing, :dish, :category,
              :servings, :ingredients, :foodNotes, :marketingOptIn, :now, :now)`),
    update: db.prepare(`
      UPDATE rsvps SET full_name = :fullName, email = :email, dietary = :dietary, bringing = :bringing,
             dish = :dish, category = :category, servings = :servings, ingredients = :ingredients,
             food_notes = :foodNotes, marketing_opt_in = :marketingOptIn, food_confirmed = :foodConfirmed,
             updated_at = :now
       WHERE public_id = :publicId`),
    byPublicId: db.prepare('SELECT * FROM rsvps WHERE public_id = ?'),
    bySubmissionId: db.prepare('SELECT * FROM rsvps WHERE submission_id = ?'),
    all: db.prepare('SELECT * FROM rsvps ORDER BY created_at ASC, id ASC'),
    setFoodConfirmed: db.prepare('UPDATE rsvps SET food_confirmed = ?, updated_at = ? WHERE public_id = ?'),
    delete: db.prepare('DELETE FROM rsvps WHERE public_id = ?'),
  };

  const params = (v) => ({
    fullName: v.fullName,
    email: v.email,
    dietary: v.dietary,
    bringing: v.bringing,
    dish: v.dish,
    category: v.category,
    servings: v.servings ?? null,
    ingredients: v.ingredients,
    foodNotes: v.foodNotes,
    marketingOptIn: v.marketingOptIn ? 1 : 0,
    now: new Date().toISOString(),
  });

  return {
    raw: db,

    findBySubmissionId: (submissionId) => toRecord(q.bySubmissionId.get(submissionId)),
    findById: (publicId) => toRecord(q.byPublicId.get(publicId)),
    list: () => q.all.all().map(toRecord),

    create(value, submissionId) {
      const publicId = randomUUID();
      try {
        q.insert.run({ ...params(value), publicId, submissionId: submissionId || null });
      } catch (err) {
        if (isUniqueEmailError(err)) throw new DuplicateEmailError();
        throw err;
      }
      return toRecord(q.byPublicId.get(publicId));
    },

    // Updates an RSVP from the guest's manage link. If the food details change,
    // any organiser confirmation is cleared so it can be re-checked.
    updateFromGuest(publicId, value) {
      const existing = toRecord(q.byPublicId.get(publicId));
      if (!existing) return null;
      const foodChanged = FOOD_FIELDS.some((f) => (existing[f] ?? null) !== (value[f] ?? null));
      try {
        q.update.run({
          ...params(value),
          publicId,
          foodConfirmed: existing.foodConfirmed && !foodChanged && value.bringing !== 'no' ? 1 : 0,
        });
      } catch (err) {
        if (isUniqueEmailError(err)) throw new DuplicateEmailError();
        throw err;
      }
      return toRecord(q.byPublicId.get(publicId));
    },

    setFoodConfirmed(publicId, confirmed) {
      const result = q.setFoodConfirmed.run(confirmed ? 1 : 0, new Date().toISOString(), publicId);
      return result.changes > 0 ? toRecord(q.byPublicId.get(publicId)) : null;
    },

    delete: (publicId) => q.delete.run(publicId).changes > 0,

    close: () => db.close(),
  };
}
