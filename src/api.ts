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
