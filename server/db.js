import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// 雲端部署時把 DB_PATH 指到掛載的永久磁碟,本機開發則用專案目錄下的檔案
const dbPath = process.env.DB_PATH ?? join(here, 'german-learn.db');
export const db = new DatabaseSync(dbPath);

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

  CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    subtitle TEXT,
    minutes INTEGER,
    sort_order INTEGER NOT NULL,
    sections TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    type TEXT NOT NULL,
    prompt TEXT NOT NULL,
    options TEXT,
    answer TEXT NOT NULL,
    case_sensitive INTEGER NOT NULL DEFAULT 0,
    explanation TEXT,
    UNIQUE (lesson_id, position)
  );

  CREATE TABLE IF NOT EXISTS lesson_progress (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    best_correct INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    attempts INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    last_studied_at TEXT,
    PRIMARY KEY (user_id, lesson_id)
  );
`);

function readSeed(file) {
  return JSON.parse(readFileSync(join(here, 'data', file), 'utf8'));
}

export function seedWords() {
  const seed = readSeed('seed-words.json');
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

// 課程內容以 slug、題目以「第幾題」為準做更新,重開機不會重複新增,也不會弄丟學習紀錄。
export function seedGrammar() {
  const seed = readSeed('grammar-lessons.json');

  const upsertLesson = db.prepare(`
    INSERT INTO lessons (slug, title, subtitle, minutes, sort_order, sections)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      subtitle = excluded.subtitle,
      minutes = excluded.minutes,
      sort_order = excluded.sort_order,
      sections = excluded.sections
  `);
  const lessonIdOf = db.prepare('SELECT id FROM lessons WHERE slug = ?');
  const upsertExercise = db.prepare(`
    INSERT INTO exercises (lesson_id, position, type, prompt, options, answer, case_sensitive, explanation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(lesson_id, position) DO UPDATE SET
      type = excluded.type,
      prompt = excluded.prompt,
      options = excluded.options,
      answer = excluded.answer,
      case_sensitive = excluded.case_sensitive,
      explanation = excluded.explanation
  `);
  const dropExtraExercises = db.prepare('DELETE FROM exercises WHERE lesson_id = ? AND position >= ?');

  seed.forEach((lesson, index) => {
    upsertLesson.run(
      lesson.slug,
      lesson.title,
      lesson.subtitle ?? null,
      lesson.minutes ?? null,
      index,
      JSON.stringify(lesson.sections)
    );
    const lessonId = lessonIdOf.get(lesson.slug).id;

    lesson.exercises.forEach((ex, position) => {
      const answer = ex.type === 'choice' ? ex.answer : ex.answers;
      upsertExercise.run(
        lessonId,
        position,
        ex.type,
        ex.prompt,
        ex.options ? JSON.stringify(ex.options) : null,
        JSON.stringify(answer),
        ex.caseSensitive ? 1 : 0,
        ex.explanation ?? null
      );
    });
    dropExtraExercises.run(lessonId, lesson.exercises.length);
  });

  return seed.length;
}
