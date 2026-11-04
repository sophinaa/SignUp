import { createClient } from '@libsql/client';
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

const uniqueFailure = (err) => /UNIQUE constraint failed: rsvps\.(\w+)/.exec(err?.message || '')?.[1] ?? null;

// Opens the RSVP database. `url` is a local file ("file:data/rsvps.sqlite"),
// ":memory:" for tests, or a hosted libSQL/Turso database ("libsql://…",
// with `authToken`). All methods are async.
export async function openDatabase(url, { authToken } = {}) {
  if (url.startsWith('file:')) mkdirSync(dirname(url.slice('file:'.length)), { recursive: true });
  const client = createClient({ url, authToken });
  if (url.startsWith('file:')) await client.execute('PRAGMA journal_mode = WAL');
  await client.execute(SCHEMA);

  const one = async (sql, args) => toRecord((await client.execute({ sql, args })).rows[0]);
  const byPublicId = (publicId) => one('SELECT * FROM rsvps WHERE public_id = ?', [publicId]);

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
    findBySubmissionId: (submissionId) => one('SELECT * FROM rsvps WHERE submission_id = ?', [submissionId]),
    findById: byPublicId,
    list: async () => (await client.execute('SELECT * FROM rsvps ORDER BY created_at ASC, id ASC')).rows.map(toRecord),

    // Resolves to { rsvp, replayed }. If the same submission arrives twice at
    // once, the second gets the booking the first created.
    async create(value, submissionId) {
      const publicId = randomUUID();
      try {
        await client.execute({
          sql: `INSERT INTO rsvps (public_id, submission_id, full_name, email, dietary, bringing, dish, category,
                                   servings, ingredients, food_notes, marketing_opt_in, created_at, updated_at)
                VALUES (:publicId, :submissionId, :fullName, :email, :dietary, :bringing, :dish, :category,
                        :servings, :ingredients, :foodNotes, :marketingOptIn, :now, :now)`,
          args: { ...params(value), publicId, submissionId: submissionId || null },
        });
      } catch (err) {
        const column = uniqueFailure(err);
        if (column === 'submission_id' || (column === 'email' && submissionId)) {
          const existing = submissionId && (await this.findBySubmissionId(submissionId));
          if (existing) return { rsvp: existing, replayed: true };
        }
        if (column === 'email') throw new DuplicateEmailError();
        throw err;
      }
      return { rsvp: await byPublicId(publicId), replayed: false };
    },

    // Updates an RSVP from the guest's manage link. If the food details change,
    // any organiser confirmation is cleared so it can be re-checked.
    async updateFromGuest(publicId, value) {
      const existing = await byPublicId(publicId);
      if (!existing) return null;
      const foodChanged = FOOD_FIELDS.some((f) => (existing[f] ?? null) !== (value[f] ?? null));
      try {
        await client.execute({
          sql: `UPDATE rsvps SET full_name = :fullName, email = :email, dietary = :dietary, bringing = :bringing,
                       dish = :dish, category = :category, servings = :servings, ingredients = :ingredients,
                       food_notes = :foodNotes, marketing_opt_in = :marketingOptIn, food_confirmed = :foodConfirmed,
                       updated_at = :now
                 WHERE public_id = :publicId`,
          args: {
            ...params(value),
            publicId,
            foodConfirmed: existing.foodConfirmed && !foodChanged && value.bringing !== 'no' ? 1 : 0,
          },
        });
      } catch (err) {
        if (uniqueFailure(err) === 'email') throw new DuplicateEmailError();
        throw err;
      }
      return byPublicId(publicId);
    },

    async setFoodConfirmed(publicId, confirmed) {
      const result = await client.execute({
        sql: 'UPDATE rsvps SET food_confirmed = ?, updated_at = ? WHERE public_id = ?',
        args: [confirmed ? 1 : 0, new Date().toISOString(), publicId],
      });
      return result.rowsAffected > 0 ? byPublicId(publicId) : null;
    },

    delete: async (publicId) => (await client.execute({ sql: 'DELETE FROM rsvps WHERE public_id = ?', args: [publicId] })).rowsAffected > 0,

    close: () => client.close(),
  };
}
