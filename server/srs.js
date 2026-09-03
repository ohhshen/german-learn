const QUALITY = { again: 0, hard: 3, good: 4, easy: 5 };
const MIN_EASE = 1.3;

export function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// SM-2: returns the next scheduling state for a card given how well it was recalled.
export function schedule(card, rating) {
  const q = QUALITY[rating];
  if (q === undefined) throw new Error(`unknown rating: ${rating}`);

  let { ease, interval_days: interval, repetitions, lapses } = card;

  if (q < 3) {
    repetitions = 0;
    interval = 0;
    lapses += 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * ease);
    if (rating === 'easy') interval = Math.round(interval * 1.3);
    repetitions += 1;
  }

  ease = Math.max(MIN_EASE, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  return {
    ease: Number(ease.toFixed(2)),
    interval_days: interval,
    repetitions,
    lapses,
    due_date: addDays(interval),
    last_reviewed_at: new Date().toISOString(),
  };
}
