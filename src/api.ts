// 純前端版:單字與文法內容打包在網頁裡,進度存瀏覽器本機。
// 介面刻意維持和先前的伺服器版一致,畫面元件不需要知道資料從哪來。
import rawWords from './data/words.json'
import rawLessons from './data/grammar-lessons.json'
import { freshState, schedule, today, type ReviewState } from './srs'
import { lessonsOf, load, reviewsOf, update } from './store'

export type User = { id: number; name: string }

export type Card = {
  id: string
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
  id: string
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

type RawWord = {
  german: string
  chinese: string
  pos?: string
  category?: string
  example_de?: string
  example_zh?: string
}

type RawExercise = {
  type: 'choice' | 'fill'
  prompt: string
  options?: string[]
  answer?: number
  answers?: string[]
  caseSensitive?: boolean
  explanation?: string
}

type RawLesson = {
  slug: string
  title: string
  subtitle?: string
  minutes?: number
  sections: GrammarSection[]
  exercises: RawExercise[]
}

const WORDS = rawWords as RawWord[]
const LESSONS = rawLessons as RawLesson[]

// 題目編號用「課程 slug + 第幾題」,加課或改內容都不會影響已存的成績。
const exerciseId = (slug: string, position: number) => `${slug}#${position}`

function findExercise(id: string): { lesson: RawLesson; exercise: RawExercise } | null {
  const [slug, position] = id.split('#')
  const lesson = LESSONS.find((l) => l.slug === slug)
  const exercise = lesson?.exercises[Number(position)]
  return lesson && exercise ? { lesson, exercise } : null
}

const UMLAUTS: Record<string, string> = {
  ä: 'ae',
  ö: 'oe',
  ü: 'ue',
  Ä: 'Ae',
  Ö: 'Oe',
  Ü: 'Ue',
  ß: 'ss',
}

// 沒有德文鍵盤的人會打 "Brueder",要和 "Brüder" 視為同一個答案。
function normalizeAnswer(text: string, caseSensitive: boolean) {
  const trimmed = String(text ?? '')
    .trim()
    .replace(/[äöüÄÖÜß]/g, (c) => UMLAUTS[c])
    .replace(/\s+/g, ' ')
    .replace(/[.!?,;:。,!?]+$/u, '')
  return caseSensitive ? trimmed : trimmed.toLowerCase()
}

function toCard(word: RawWord, isNew: boolean): Card {
  return {
    id: word.german,
    german: word.german,
    chinese: word.chinese,
    pos: word.pos ?? null,
    category: word.category ?? null,
    example_de: word.example_de ?? null,
    example_zh: word.example_zh ?? null,
    isNew,
  }
}

function isDue(state: ReviewState) {
  return state.due <= today()
}

export const api = {
  async listUsers(): Promise<User[]> {
    return load().users.slice().sort((a, b) => a.name.localeCompare(b.name))
  },

  async createUser(name: string): Promise<User> {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('請輸入名字')
    if (trimmed.length > 20) throw new Error('名字請控制在 20 字以內')

    return update((store) => {
      const existing = store.users.find((u) => u.name === trimmed)
      if (existing) return existing
      const user = { id: store.nextUserId++, name: trimmed }
      store.users.push(user)
      return user
    })
  },

  async getSession(userId: number, newLimit = 10, reviewLimit = 50) {
    const reviews = reviewsOf(load(), userId)

    const due = WORDS.filter((w) => reviews[w.german] && isDue(reviews[w.german]))
      .sort((a, b) => reviews[a.german].due.localeCompare(reviews[b.german].due))
      .slice(0, reviewLimit)
      .map((w) => toCard(w, false))

    const fresh = WORDS.filter((w) => !reviews[w.german])
      .slice(0, newLimit)
      .map((w) => toCard(w, true))

    return { due, fresh }
  },

  async review(userId: number, wordId: string, rating: Rating) {
    return update((store) => {
      const reviews = reviewsOf(store, userId)
      const next = schedule(reviews[wordId] ?? freshState(), rating)
      reviews[wordId] = next
      return { interval_days: next.interval }
    })
  },

  async getStats(userId: number): Promise<Stats> {
    const store = load()
    const reviews = reviewsOf(store, userId)
    const progress = lessonsOf(store, userId)
    const states = Object.values(reviews)

    return {
      totalWords: WORDS.length,
      seen: states.length,
      dueToday: states.filter(isDue).length,
      learned: states.filter((s) => s.interval >= 21).length,
      notStarted: WORDS.length - states.length,
      lessonsTotal: LESSONS.length,
      lessonsDone: Object.keys(progress).length,
    }
  },
}

export const grammar = {
  async listLessons(userId: number): Promise<LessonSummary[]> {
    const progress = lessonsOf(load(), userId)
    return LESSONS.map((lesson) => ({
      slug: lesson.slug,
      title: lesson.title,
      subtitle: lesson.subtitle ?? null,
      minutes: lesson.minutes ?? null,
      exerciseCount: lesson.exercises.length,
      progress: progress[lesson.slug] ?? null,
    }))
  },

  async getLesson(slug: string): Promise<Lesson> {
    const lesson = LESSONS.find((l) => l.slug === slug)
    if (!lesson) throw new Error('找不到這一課')

    return {
      slug: lesson.slug,
      title: lesson.title,
      subtitle: lesson.subtitle ?? null,
      minutes: lesson.minutes ?? null,
      sections: lesson.sections,
      exercises: lesson.exercises.map((ex, position) => ({
        id: exerciseId(lesson.slug, position),
        type: ex.type,
        prompt: ex.prompt,
        options: ex.options ?? null,
      })),
    }
  },

  async answer(id: string, answer: number | string): Promise<AnswerResult> {
    const found = findExercise(id)
    if (!found) throw new Error('找不到這一題')
    const { exercise } = found
    const explanation = exercise.explanation ?? null

    if (exercise.type === 'choice') {
      const options = exercise.options ?? []
      return {
        correct: Number(answer) === exercise.answer,
        expected: options[exercise.answer ?? 0],
        explanation,
      }
    }

    const accepted = exercise.answers ?? []
    const caseSensitive = exercise.caseSensitive === true
    const mine = normalizeAnswer(String(answer), caseSensitive)
    return {
      correct: mine.length > 0 && accepted.some((a) => normalizeAnswer(a, caseSensitive) === mine),
      expected: accepted[0],
      explanation,
    }
  },

  async complete(userId: number, slug: string, correct: number, total: number) {
    return update((store) => {
      const progress = lessonsOf(store, userId)
      const previous = progress[slug]
      const next: LessonProgress = {
        correct: Math.max(previous?.correct ?? 0, correct),
        total,
        completedAt: previous?.completedAt ?? new Date().toISOString(),
      }
      progress[slug] = next
      return next
    })
  },
}
