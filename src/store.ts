// 學習進度存在瀏覽器本機(localStorage)。同一台裝置上可以有多個使用者,
// 但不同裝置之間不會同步 —— 這是改成免費靜態網站後的取捨。
import type { LessonProgress, User } from './api'
import type { ReviewState } from './srs'

const KEY = 'german-learn:store'

type Store = {
  nextUserId: number
  users: User[]
  /** userId → 單字(以德文原字為鍵)→ 複習狀態 */
  reviews: Record<string, Record<string, ReviewState>>
  /** userId → 課程 slug → 練習成績 */
  lessons: Record<string, Record<string, LessonProgress>>
}

const EMPTY: Store = { nextUserId: 1, users: [], reviews: {}, lessons: {} }

export function load(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(EMPTY)
    return { ...structuredClone(EMPTY), ...(JSON.parse(raw) as Store) }
  } catch {
    // 隱私模式或被清空時,當作全新的資料
    return structuredClone(EMPTY)
  }
}

export function save(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    // 寫不進去就算了,至少這次操作在畫面上是正確的
  }
}

export function update<T>(fn: (store: Store) => T): T {
  const store = load()
  const result = fn(store)
  save(store)
  return result
}

export function reviewsOf(store: Store, userId: number) {
  return (store.reviews[userId] ??= {})
}

export function lessonsOf(store: Store, userId: number) {
  return (store.lessons[userId] ??= {})
}
