import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const db = new DatabaseSync(join(here, 'german-learn.db'));

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    german TEXT NOT NULL UNIQUE,
    chinese TEXT NOT NULL,
    pos TEXT,
    category TEXT,
    example_de TEXT,
    example_zh TEXT
  );

  CREATE TABLE IF NOT EXISTS reviews (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    ease REAL NOT NULL DEFAULT 2.5,
    interval_days INTEGER NOT NULL DEFAULT 0,
    repetitions INTEGER NOT NULL DEFAULT 0,
    lapses INTEGER NOT NULL DEFAULT 0,
    due_date TEXT NOT NULL,
    last_reviewed_at TEXT,
    PRIMARY KEY (user_id, word_id)
  );

  CREATE INDEX IF NOT EXISTS idx_reviews_due ON reviews(user_id, due_date);
`);

export function seedWords() {
  const seed = JSON.parse(readFileSync(join(here, 'data', 'seed-words.json'), 'utf8'));
  const insert = db.prepare(`
    INSERT INTO words (german, chinese, pos, category, example_de, example_zh)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(german) DO UPDATE SET
      chinese = excluded.chinese,
      pos = excluded.pos,
      category = excluded.category,
      example_de = excluded.example_de,
      example_zh = excluded.example_zh
  `);
  for (const w of seed) {
    insert.run(w.german, w.chinese, w.pos ?? null, w.category ?? null, w.example_de ?? null, w.example_zh ?? null);
  }
  return seed.length;
}
