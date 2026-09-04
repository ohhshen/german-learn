// SM-2 間隔重複排程(原本跑在伺服器,改成純前端後搬到瀏覽器裡)
import type { Rating } from './api'

export type ReviewState = {
  ease: number
  interval: number
  reps: number
  lapses: number
  due: string
  lastReviewed: string | null
}

const QUALITY: Record<Rating, number> = { again: 0, hard: 3, good: 4, easy: 5 }
const MIN_EASE = 1.3

export function today() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function freshState(): ReviewState {
  return { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: today(), lastReviewed: null }
}

export function schedule(card: ReviewState, rating: Rating): ReviewState {
  const q = QUALITY[rating]
  let { ease, interval, reps, lapses } = card

  if (q < 3) {
    reps = 0
    interval = 0
    lapses += 1
  } else {
    if (reps === 0) interval = 1
    else if (reps === 1) interval = 6
    else interval = Math.round(interval * ease)
    if (rating === 'easy') interval = Math.round(interval * 1.3)
    reps += 1
  }

  ease = Math.max(MIN_EASE, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))

  return {
    ease: Number(ease.toFixed(2)),
    interval,
    reps,
    lapses,
    due: addDays(interval),
    lastReviewed: new Date().toISOString(),
  }
}
