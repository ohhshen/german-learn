import { useCallback, useEffect, useState } from 'react'
import { api, type Card, type Rating, type User } from '../api'
import { speak } from '../speak'

const RATINGS: { rating: Rating; label: string; hint: string; className: string }[] = [
  { rating: 'again', label: '忘記了', hint: '1', className: 'bg-rose-500 hover:bg-rose-600' },
  { rating: 'hard', label: '有點難', hint: '2', className: 'bg-orange-400 hover:bg-orange-500' },
  { rating: 'good', label: '記得', hint: '3', className: 'bg-emerald-500 hover:bg-emerald-600' },
  { rating: 'easy', label: '太簡單', hint: '4', className: 'bg-sky-500 hover:bg-sky-600' },
]

export function ReviewSession({ user, onExit }: { user: User; onExit: () => void }) {
  const [queue, setQueue] = useState<Card[] | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState(0)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    api.getSession(user.id).then(({ due, fresh }) => {
      const cards = [...due, ...fresh]
      setQueue(cards)
      setTotal(cards.length)
    })
  }, [user.id])

  const card = queue?.[0]

  const reveal = useCallback(() => {
    if (card) {
      setRevealed(true)
      speak(card.german)
    }
  }, [card])

  const rate = useCallback(
    (rating: Rating) => {
      if (!card) return
      api.review(user.id, card.id, rating).catch(() => {})
      setQueue((q) => {
        if (!q) return q
        const [first, ...rest] = q
        return rating === 'again' ? [...rest, first] : rest
      })
      if (rating !== 'again') setDone((d) => d + 1)
      setRevealed(false)
    },
    [card, user.id]
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!revealed && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault()
        reveal()
        return
      }
      if (revealed) {
        const match = RATINGS.find((r) => r.hint === e.key)
        if (match) rate(match.rating)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [revealed, reveal, rate])

  if (!queue) return <Centered>載入中…</Centered>

  if (!card) {
    return (
      <Centered>
        <p className="text-5xl">🎉</p>
        <p className="mt-4 text-xl font-semibold text-stone-900">這輪複習完成!</p>
        <p className="mt-1 text-stone-500">今天複習了 {done} 個單字</p>
        <button
          onClick={onExit}
          className="mt-8 rounded-xl bg-stone-900 px-6 py-3 font-medium text-white"
        >
          回到首頁
        </button>
      </Centered>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-8">
      <div className="flex items-center gap-4">
        <button onClick={onExit} className="text-sm text-stone-500">
          ← 離開
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full rounded-full bg-amber-500 transition-all"
            style={{ width: `${total ? (done / total) * 100 : 0}%` }}
          />
        </div>
        <span className="text-sm tabular-nums text-stone-500">
          {done}/{total}
        </span>
      </div>

      <button
        onClick={revealed ? undefined : reveal}
        className="mt-6 flex flex-1 cursor-pointer flex-col items-center justify-center rounded-3xl border border-stone-200 bg-white px-6 py-12 text-center shadow-sm sm:max-h-[560px]"
      >
        {card.isNew && (
          <span className="mb-4 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
            新單字
          </span>
        )}
        <p className="text-4xl font-bold tracking-tight text-stone-900">{card.german}</p>
        {card.category && <p className="mt-3 text-sm text-stone-400">{card.category}</p>}

        {revealed ? (
          <div className="mt-8 w-full border-t border-stone-100 pt-6">
            <p className="text-2xl font-semibold text-stone-800">{card.chinese}</p>
            {card.example_de && (
              <div className="mt-6 space-y-1">
                <p className="text-stone-700">{card.example_de}</p>
                <p className="text-sm text-stone-400">{card.example_zh}</p>
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                speak(card.example_de ?? card.german)
              }}
              className="mt-6 rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600"
            >
              🔊 再聽一次
            </button>
          </div>
        ) : (
          <p className="mt-10 text-sm text-stone-400">點一下看答案(空白鍵)</p>
        )}
      </button>

      <div className="mt-6 min-h-[64px]">
        {revealed && (
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map((r) => (
              <button
                key={r.rating}
                onClick={() => rate(r.rating)}
                className={`rounded-xl py-4 text-sm font-semibold text-white transition ${r.className}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 text-center">
      {children}
    </div>
  )
}
