import { useEffect, useState } from 'react'
import { api, type Stats, type User } from '../api'

const NEW_PER_SESSION = 10

export function Home({
  user,
  onStartReview,
  onOpenGrammar,
  onSwitchUser,
}: {
  user: User
  onStartReview: () => void
  onOpenGrammar: () => void
  onSwitchUser: () => void
}) {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    api.getStats(user.id).then(setStats).catch(() => setStats(null))
  }, [user.id])

  const pending = stats ? stats.dueToday + Math.min(stats.notStarted, NEW_PER_SESSION) : 0

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-12">
      <header className="flex items-baseline justify-between">
        <div>
          <p className="text-sm text-stone-500">Hallo,</p>
          <h1 className="text-2xl font-bold text-stone-900">{user.name}</h1>
        </div>
        <button onClick={onSwitchUser} className="text-sm text-stone-500 underline">
          換人
        </button>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <StatCard label="今天待複習" value={stats?.dueToday ?? '–'} highlight />
        <StatCard label="尚未學過" value={stats?.notStarted ?? '–'} />
        <StatCard label="已學過" value={stats?.seen ?? '–'} />
        <StatCard label="已熟記" value={stats?.learned ?? '–'} />
      </div>

      <button
        onClick={onStartReview}
        disabled={pending === 0}
        className="mt-8 rounded-2xl bg-amber-500 px-6 py-5 text-left text-lg font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:bg-stone-200 disabled:text-stone-400"
      >
        <span className="block">
          {pending > 0 ? `開始複習單字 · ${pending} 張` : '今天的單字複習完成了 🎉'}
        </span>
        <span className="mt-1 block text-sm font-normal opacity-80">
          每次最多加入 {NEW_PER_SESSION} 個新單字,依記憶曲線安排複習
        </span>
      </button>

      <button
        onClick={onOpenGrammar}
        className="mt-3 rounded-2xl border border-stone-200 bg-white px-6 py-5 text-left text-lg font-semibold text-stone-900 shadow-sm transition hover:border-amber-400 hover:shadow"
      >
        <span className="block">文法課程 📘</span>
        <span className="mt-1 block text-sm font-normal text-stone-500">
          {stats
            ? `A1 基礎文法 · 已完成 ${stats.lessonsDone}/${stats.lessonsTotal} 課`
            : 'A1 基礎文法,先讀說明再做練習'}
        </span>
      </button>
    </div>
  )
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: number | string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-4 ${
        highlight ? 'border-amber-200 bg-amber-50' : 'border-stone-200 bg-white'
      }`}
    >
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-stone-900">{value}</p>
    </div>
  )
}
