export type User = { id: number; name: string }

export type Card = {
  id: number
  german: string
  chinese: string
  pos: string | null
  category: string | null
  example_de: string | null
  example_zh: string | null
  isNew: boolean
}

export type Rating = 'again' | 'hard' | 'good' | 'easy'

export type Stats = {
  totalWords: number
  seen: number
  dueToday: number
  learned: number
  notStarted: number
  lessonsTotal: number
  lessonsDone: number
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? '連線失敗,請確認伺服器是否啟動')
  }
  return res.json()
}

export const api = {
  listUsers: () => request<User[]>('/api/users'),

  createUser: (name: string) =>
    request<User>('/api/users', { method: 'POST', body: JSON.stringify({ name }) }),

  getSession: (userId: number, newLimit = 10) =>
    request<{ due: Card[]; fresh: Card[] }>(
      `/api/session?userId=${userId}&newLimit=${newLimit}`
    ),

  review: (userId: number, wordId: number, rating: Rating) =>
    request<{ interval_days: number }>('/api/review', {
      method: 'POST',
      body: JSON.stringify({ userId, wordId, rating }),
    }),

  getStats: (userId: number) => request<Stats>(`/api/stats?userId=${userId}`),
}

export type GrammarSection =
  | { type: 'text'; heading?: string; body: string }
  | { type: 'tip'; heading?: string; body: string }
  | { type: 'examples'; heading?: string; items: { de: string; zh: string }[] }
  | { type: 'table'; heading?: string; headers: string[]; rows: string[][] }

export type LessonProgress = { correct: number; total: number; completedAt: string }

export type LessonSummary = {
  slug: string
  title: string
  subtitle: string | null
  minutes: number | null
  exerciseCount: number
  progress: LessonProgress | null
}

export type Exercise = {
  id: number
  type: 'choice' | 'fill'
  prompt: string
  options: string[] | null
}

export type Lesson = {
  slug: string
  title: string
  subtitle: string | null
  minutes: number | null
  sections: GrammarSection[]
  exercises: Exercise[]
}

export type AnswerResult = { correct: boolean; expected: string; explanation: string | null }

export const grammar = {
  listLessons: (userId: number) => request<LessonSummary[]>(`/api/grammar?userId=${userId}`),

  getLesson: (slug: string) => request<Lesson>(`/api/grammar/${slug}`),

  answer: (exerciseId: number, answer: number | string) =>
    request<AnswerResult>('/api/grammar/answer', {
      method: 'POST',
      body: JSON.stringify({ exerciseId, answer }),
    }),

  complete: (userId: number, slug: string, correct: number, total: number) =>
    request<LessonProgress>('/api/grammar/complete', {
      method: 'POST',
      body: JSON.stringify({ userId, slug, correct, total }),
    }),
}
