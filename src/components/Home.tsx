import { useEffect, useState } from 'react'
import { api, type Stats, type User } from '../api'

const NEW_PER_SESSION = 10

export function Home({
  user,
  onStart,
  onSwitchUser,
}: {
  user: User
  onStart: () => void
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
        onClick={onStart}
        disabled={pending === 0}
        className="mt-8 rounded-2xl bg-amber-500 px-6 py-5 text-lg font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:bg-stone-200 disabled:text-stone-400"
      >
        {pending > 0 ? `開始複習 · ${pending} 張` : '今天的複習完成了 🎉'}
      </button>

      <p className="mt-4 text-center text-sm text-stone-400">
        每次最多加入 {NEW_PER_SESSION} 個新單字,並依記憶曲線安排複習
      </p>
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
