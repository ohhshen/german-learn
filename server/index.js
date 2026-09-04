import express from 'express';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, seedWords, seedGrammar } from './db.js';
import { checkAnswer } from './grammar.js';
import { schedule, today } from './srs.js';

const here = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

seedWords();
seedGrammar();

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

  const lessonsTotal = db.prepare('SELECT COUNT(*) AS n FROM lessons').get().n;
  const lessonsDone = db
    .prepare('SELECT COUNT(*) AS n FROM lesson_progress WHERE user_id = ? AND completed_at IS NOT NULL')
    .get(userId).n;

  res.json({
    totalWords,
    seen,
    dueToday,
    learned,
    notStarted: totalWords - seen,
    lessonsTotal,
    lessonsDone,
  });
});

app.get('/api/grammar', (req, res) => {
  const userId = Number(req.query.userId) || 0;
  const rows = db
    .prepare(
      `SELECT l.slug, l.title, l.subtitle, l.minutes,
              (SELECT COUNT(*) FROM exercises e WHERE e.lesson_id = l.id) AS exercise_count,
              p.best_correct, p.total, p.completed_at
       FROM lessons l
       LEFT JOIN lesson_progress p ON p.lesson_id = l.id AND p.user_id = ?
       ORDER BY l.sort_order`
    )
    .all(userId);

  res.json(
    rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      subtitle: r.subtitle,
      minutes: r.minutes,
      exerciseCount: r.exercise_count,
      progress: r.completed_at
        ? { correct: r.best_correct, total: r.total, completedAt: r.completed_at }
        : null,
    }))
  );
});

app.get('/api/grammar/:slug', (req, res) => {
  const lesson = db.prepare('SELECT * FROM lessons WHERE slug = ?').get(req.params.slug);
  if (!lesson) return res.status(404).json({ error: '找不到這一課' });

  // 答案留在伺服器端,前端拿到的題目不含解答。
  const exercises = db
    .prepare('SELECT id, type, prompt, options FROM exercises WHERE lesson_id = ? ORDER BY position')
    .all(lesson.id)
    .map((e) => ({
      id: e.id,
      type: e.type,
      prompt: e.prompt,
      options: e.options ? JSON.parse(e.options) : null,
    }));

  res.json({
    slug: lesson.slug,
    title: lesson.title,
    subtitle: lesson.subtitle,
    minutes: lesson.minutes,
    sections: JSON.parse(lesson.sections),
    exercises,
  });
});

app.post('/api/grammar/answer', (req, res) => {
  const exerciseId = Number(req.body?.exerciseId);
  if (!exerciseId) return res.status(400).json({ error: 'exerciseId 必填' });

  const row = db.prepare('SELECT * FROM exercises WHERE id = ?').get(exerciseId);
  if (!row) return res.status(404).json({ error: '找不到這一題' });

  res.json(checkAnswer(row, req.body?.answer));
});

app.post('/api/grammar/complete', (req, res) => {
  const userId = Number(req.body?.userId);
  const slug = String(req.body?.slug ?? '');
  const correct = Number(req.body?.correct);
  const total = Number(req.body?.total);
  if (!userId || !slug) return res.status(400).json({ error: 'userId 與 slug 必填' });
  if (!Number.isInteger(correct) || !Number.isInteger(total) || total <= 0 || correct < 0 || correct > total) {
    return res.status(400).json({ error: '成績數字不正確' });
  }

  const lesson = db.prepare('SELECT id FROM lessons WHERE slug = ?').get(slug);
  if (!lesson) return res.status(404).json({ error: '找不到這一課' });

  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO lesson_progress (user_id, lesson_id, best_correct, total, attempts, completed_at, last_studied_at)
     VALUES (?, ?, ?, ?, 1, ?, ?)
     ON CONFLICT(user_id, lesson_id) DO UPDATE SET
       best_correct = MAX(best_correct, excluded.best_correct),
       total = excluded.total,
       attempts = attempts + 1,
       completed_at = COALESCE(completed_at, excluded.completed_at),
       last_studied_at = excluded.last_studied_at`
  ).run(userId, lesson.id, correct, total, now, now);

  const saved = db
    .prepare('SELECT best_correct, total, attempts, completed_at FROM lesson_progress WHERE user_id = ? AND lesson_id = ?')
    .get(userId, lesson.id);

  res.json({
    correct: saved.best_correct,
    total: saved.total,
    attempts: saved.attempts,
    completedAt: saved.completed_at,
  });
});

const dist = join(here, '..', 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/.*/, (req, res) => res.sendFile(join(dist, 'index.html')));
}

const port = process.env.PORT || 3001;
app.listen(port, '0.0.0.0', () => console.log(`German-learn API listening on port ${port}`));
