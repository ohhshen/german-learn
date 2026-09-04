import { useEffect, useRef, useState } from 'react'
import { grammar, type AnswerResult, type GrammarSection, type Lesson, type User } from '../api'
import { speak } from '../speak'

type Mode = 'read' | 'practice' | 'done'

export function GrammarLesson({
  user,
  slug,
  onBack,
}: {
  user: User
  slug: string
  onBack: () => void
}) {
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<Mode>('read')
  const [index, setIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [input, setInput] = useState('')
  const [picked, setPicked] = useState<number | null>(null)
  const [result, setResult] = useState<AnswerResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    grammar
      .getLesson(slug)
      .then(setLesson)
      .catch((e) => setError((e as Error).message))
  }, [slug])

  const exercise = lesson?.exercises[index]
  const total = lesson?.exercises.length ?? 0

  useEffect(() => {
    if (mode === 'practice' && exercise?.type === 'fill') inputRef.current?.focus()
  }, [mode, exercise])

  function startPractice() {
    setMode('practice')
    setIndex(0)
    setCorrectCount(0)
    resetQuestion()
  }

  function resetQuestion() {
    setInput('')
    setPicked(null)
    setResult(null)
  }

  async function submit(answer: number | string) {
    if (!exercise || result) return
    if (typeof answer === 'number') setPicked(answer)
    try {
      const res = await grammar.answer(exercise.id, answer)
      setResult(res)
      if (res.correct) setCorrectCount((c) => c + 1)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  function next() {
    if (index + 1 < total) {
      setIndex((i) => i + 1)
      resetQuestion()
      return
    }
    setMode('done')
    grammar.complete(user.id, slug, correctCount, total).catch(() => {})
  }

  if (error) {
    return (
      <Centered>
        <p className="text-stone-600">{error}</p>
        <button onClick={onBack} className="mt-6 rounded-xl bg-stone-900 px-6 py-3 text-white">
          回課程列表
        </button>
      </Centered>
    )
  }

  if (!lesson) return <Centered>載入中…</Centered>

  if (mode === 'done') {
    const perfect = correctCount === total
    return (
      <Centered>
        <p className="text-5xl">{perfect ? '🎉' : '💪'}</p>
        <p className="mt-4 text-xl font-semibold text-stone-900">
          {perfect ? '全對!' : '這一課練完了'}
        </p>
        <p className="mt-1 text-stone-500">
          答對 {correctCount} / {total} 題
        </p>
        <div className="mt-8 flex w-full flex-col gap-2">
          <button
            onClick={startPractice}
            className="rounded-xl bg-amber-500 px-6 py-3 font-medium text-white transition hover:bg-amber-600"
          >
            再練一次
          </button>
          <button
            onClick={() => setMode('read')}
            className="rounded-xl border border-stone-200 bg-white px-6 py-3 font-medium text-stone-700"
          >
            回去看課文
          </button>
          <button onClick={onBack} className="px-6 py-3 text-sm text-stone-500">
            回課程列表
          </button>
        </div>
      </Centered>
    )
  }

  if (mode === 'practice' && exercise) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-8">
        <div className="flex items-center gap-4">
          <button onClick={() => setMode('read')} className="text-sm text-stone-500">
            ← 課文
          </button>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: `${(index / total) * 100}%` }}
            />
          </div>
          <span className="text-sm tabular-nums text-stone-500">
            {index + 1}/{total}
          </span>
        </div>

        <div className="mt-8 rounded-3xl border border-stone-200 bg-white px-6 py-8 shadow-sm">
          <p className="text-xl leading-relaxed font-medium text-stone-900">{exercise.prompt}</p>

          {exercise.type === 'choice' ? (
            <div className="mt-6 space-y-2">
              {exercise.options?.map((option, i) => (
                <button
                  key={option}
                  onClick={() => submit(i)}
                  disabled={result !== null}
                  className={`w-full rounded-xl border px-5 py-3 text-left text-lg transition ${optionStyle(
                    i,
                    picked,
                    result,
                    exercise.options?.[i] ?? ''
                  )}`}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!result && input.trim()) submit(input)
              }}
              className="mt-6 flex gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={result !== null}
                placeholder="填入答案"
                autoComplete="off"
                autoCapitalize="off"
                className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3 text-lg outline-none focus:border-amber-400 disabled:bg-stone-50"
              />
              {!result && (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="rounded-xl bg-stone-900 px-5 py-3 font-medium text-white disabled:opacity-40"
                >
                  送出
                </button>
              )}
            </form>
          )}

          {result && (
            <div
              className={`mt-6 rounded-2xl px-5 py-4 ${
                result.correct ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'
              }`}
            >
              <p className="font-semibold">
                {result.correct ? '✓ 答對了' : `✗ 正解:${result.expected}`}
              </p>
              {result.explanation && (
                <p className="mt-1 text-sm leading-relaxed opacity-80">{result.explanation}</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-6">
          {result && (
            <button
              onClick={next}
              autoFocus
              className="w-full rounded-2xl bg-amber-500 px-6 py-4 text-lg font-semibold text-white transition hover:bg-amber-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-200"
            >
              {index + 1 < total ? '下一題' : '看成績'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-8">
      <button onClick={onBack} className="self-start text-sm text-stone-500">
        ← 課程列表
      </button>

      <header className="mt-4">
        <h1 className="text-2xl font-bold text-stone-900">{lesson.title}</h1>
        {lesson.subtitle && <p className="mt-1 text-stone-500">{lesson.subtitle}</p>}
      </header>

      <div className="mt-6 space-y-5">
        {lesson.sections.map((section, i) => (
          <Section key={i} section={section} />
        ))}
      </div>

      <button
        onClick={startPractice}
        className="mt-8 mb-8 rounded-2xl bg-amber-500 px-6 py-5 text-lg font-semibold text-white shadow-sm transition hover:bg-amber-600"
      >
        開始練習 · {total} 題
      </button>
    </div>
  )
}

function Section({ section }: { section: GrammarSection }) {
  if (section.type === 'tip') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
        <p className="text-sm font-semibold text-amber-800">💡 小提醒</p>
        <p className="mt-1 leading-relaxed text-stone-700">{section.body}</p>
      </div>
    )
  }

  if (section.type === 'examples') {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white px-5 py-4">
        {section.heading && <h2 className="font-semibold text-stone-900">{section.heading}</h2>}
        <ul className="mt-3 space-y-3">
          {section.items.map((item) => (
            <li key={item.de}>
              <button
                onClick={() => speak(item.de)}
                className="text-left text-stone-800 underline decoration-stone-200 decoration-dotted underline-offset-4"
              >
                {item.de} 🔊
              </button>
              <p className="text-sm text-stone-400">{item.zh}</p>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (section.type === 'table') {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white px-5 py-4">
        {section.heading && <h2 className="font-semibold text-stone-900">{section.heading}</h2>}
        <div className="-mx-5 mt-3 overflow-x-auto px-5">
          <table className="w-full min-w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-stone-500">
                {section.headers.map((h) => (
                  <th key={h} className="py-2 pr-4 font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row) => (
                <tr key={row.join('|')} className="border-b border-stone-100 last:border-0">
                  {row.map((cell, i) => (
                    <td
                      key={i}
                      className={`py-2 pr-4 ${i === 0 ? 'whitespace-nowrap text-stone-500' : 'text-stone-800'}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-5 py-4">
      {section.heading && <h2 className="font-semibold text-stone-900">{section.heading}</h2>}
      <p className="mt-1 leading-relaxed text-stone-700">{section.body}</p>
    </div>
  )
}

// 作答後把正解標綠、選錯的那個標紅,其他維持原樣。
function optionStyle(
  i: number,
  picked: number | null,
  result: AnswerResult | null,
  label: string
) {
  if (!result) return 'border-stone-200 bg-white hover:border-amber-400'
  if (label === result.expected) return 'border-emerald-300 bg-emerald-50 text-emerald-900'
  if (i === picked) return 'border-rose-300 bg-rose-50 text-rose-900'
  return 'border-stone-200 bg-white text-stone-400'
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 text-center">
      {children}
    </div>
  )
}
