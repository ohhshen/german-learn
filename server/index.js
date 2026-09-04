import express from 'express';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, seedWords } from './db.js';
import { schedule, today } from './srs.js';

const here = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

seedWords();

app.get('/api/health', (req, res) => {
  const words = db.prepare('SELECT COUNT(*) AS n FROM words').get().n;
  res.json({ ok: true, words });
});

app.get('/api/users', (req, res) => {
  res.json(db.prepare('SELECT id, name FROM users ORDER BY name').all());
});

app.post('/api/users', (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  if (!name) return res.status(400).json({ error: '請輸入名字' });
  if (name.length > 20) return res.status(400).json({ error: '名字請控制在 20 字以內' });

  const existing = db.prepare('SELECT id, name FROM users WHERE name = ?').get(name);
  if (existing) return res.json(existing);

  const { lastInsertRowid } = db
    .prepare('INSERT INTO users (name, created_at) VALUES (?, ?)')
    .run(name, new Date().toISOString());
  res.json({ id: Number(lastInsertRowid), name });
});

app.get('/api/session', (req, res) => {
  const userId = Number(req.query.userId);
  if (!userId) return res.status(400).json({ error: 'userId 必填' });
  const newLimit = Number(req.query.newLimit) || 10;
  const reviewLimit = Number(req.query.reviewLimit) || 50;

  const due = db
    .prepare(
      `SELECT w.*, r.ease, r.interval_days, r.repetitions, r.lapses, r.due_date
       FROM reviews r JOIN words w ON w.id = r.word_id
       WHERE r.user_id = ? AND r.due_date <= ?
       ORDER BY r.due_date, w.id
       LIMIT ?`
    )
    .all(userId, today(), reviewLimit);

  const fresh = db
    .prepare(
      `SELECT w.* FROM words w
       WHERE w.id NOT IN (SELECT word_id FROM reviews WHERE user_id = ?)
       ORDER BY w.id
       LIMIT ?`
    )
    .all(userId, newLimit);

  res.json({
    due: due.map((c) => ({ ...c, isNew: false })),
    fresh: fresh.map((c) => ({ ...c, isNew: true })),
  });
});

app.post('/api/review', (req, res) => {
  const userId = Number(req.body?.userId);
  const wordId = Number(req.body?.wordId);
  const rating = String(req.body?.rating ?? '');
  if (!userId || !wordId) return res.status(400).json({ error: 'userId 與 wordId 必填' });

  const current =
    db.prepare('SELECT * FROM reviews WHERE user_id = ? AND word_id = ?').get(userId, wordId) ??
    { ease: 2.5, interval_days: 0, repetitions: 0, lapses: 0 };

  let next;
  try {
    next = schedule(current, rating);
  } catch {
    return res.status(400).json({ error: '無效的評分' });
  }

  db.prepare(
    `INSERT INTO reviews (user_id, word_id, ease, interval_days, repetitions, lapses, due_date, last_reviewed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, word_id) DO UPDATE SET
       ease = excluded.ease,
       interval_days = excluded.interval_days,
       repetitions = excluded.repetitions,
       lapses = excluded.lapses,
       due_date = excluded.due_date,
       last_reviewed_at = excluded.last_reviewed_at`
  ).run(
    userId,
    wordId,
    next.ease,
    next.interval_days,
    next.repetitions,
    next.lapses,
    next.due_date,
    next.last_reviewed_at
  );

  res.json(next);
});

app.get('/api/stats', (req, res) => {
  const userId = Number(req.query.userId);
  if (!userId) return res.status(400).json({ error: 'userId 必填' });

  const totalWords = db.prepare('SELECT COUNT(*) AS n FROM words').get().n;
  const seen = db.prepare('SELECT COUNT(*) AS n FROM reviews WHERE user_id = ?').get(userId).n;
  const dueToday = db
    .prepare('SELECT COUNT(*) AS n FROM reviews WHERE user_id = ? AND due_date <= ?')
    .get(userId, today()).n;
  const learned = db
    .prepare('SELECT COUNT(*) AS n FROM reviews WHERE user_id = ? AND interval_days >= 21')
    .get(userId).n;

  res.json({ totalWords, seen, dueToday, learned, notStarted: totalWords - seen });
});

const dist = join(here, '..', 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/.*/, (req, res) => res.sendFile(join(dist, 'index.html')));
}

const port = process.env.PORT || 3001;
app.listen(port, '0.0.0.0', () => console.log(`German-learn API listening on port ${port}`));
