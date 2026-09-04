import { useEffect, useState } from 'react'
import { grammar, type LessonSummary, type User } from '../api'

export function GrammarList({
  user,
  onOpen,
  onBack,
}: {
  user: User
  onOpen: (slug: string) => void
  onBack: () => void
}) {
  const [lessons, setLessons] = useState<LessonSummary[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    grammar
      .listLessons(user.id)
      .then(setLessons)
      .catch((e) => setError((e as Error).message))
  }, [user.id])

  const done = lessons?.filter((l) => l.progress).length ?? 0

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-8">
      <button onClick={onBack} className="self-start text-sm text-stone-500">
        ← 回首頁
      </button>

      <header className="mt-4">
        <h1 className="text-2xl font-bold text-stone-900">文法課程</h1>
        <p className="mt-1 text-stone-500">
          A1 基礎文法 · 每課先讀說明再做練習
          {lessons && ` · 已完成 ${done}/${lessons.length} 課`}
        </p>
      </header>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
      {!lessons && !error && <p className="mt-6 text-stone-400">載入中…</p>}

      <div className="mt-6 space-y-3 pb-8">
        {lessons?.map((lesson, index) => (
          <button
            key={lesson.slug}
            onClick={() => onOpen(lesson.slug)}
            className="flex w-full items-start gap-4 rounded-2xl border border-stone-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-amber-400 hover:shadow"
          >
            <span
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                lesson.progress ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-500'
              }`}
            >
              {lesson.progress ? '✓' : index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-stone-900">{lesson.title}</span>
              {lesson.subtitle && (
                <span className="mt-0.5 block text-sm text-stone-500">{lesson.subtitle}</span>
              )}
              <span className="mt-2 block text-xs text-stone-400">
                {lesson.minutes ? `約 ${lesson.minutes} 分鐘 · ` : ''}
                {lesson.exerciseCount} 題練習
                {lesson.progress && ` · 最佳成績 ${lesson.progress.correct}/${lesson.progress.total}`}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
