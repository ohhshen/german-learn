import { useEffect, useState } from 'react'
import { api, type User } from '../api'

export function UserSelect({ onSelect }: { onSelect: (user: User) => void }) {
  const [users, setUsers] = useState<User[]>([])
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .listUsers()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    try {
      onSelect(await api.createUser(name.trim()))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-stone-900">Deutsch lernen</h1>
      <p className="mt-2 text-stone-500">德文單字複習 · 選擇你的名字開始</p>

      {loading ? (
        <p className="mt-8 text-stone-400">載入中…</p>
      ) : (
        <div className="mt-8 space-y-2">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => onSelect(user)}
              className="w-full rounded-xl border border-stone-200 bg-white px-5 py-4 text-left text-lg font-medium text-stone-800 shadow-sm transition hover:border-amber-400 hover:shadow"
            >
              {user.name}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleCreate} className="mt-6 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="新增名字"
          maxLength={20}
          className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-amber-400"
        />
        <button
          type="submit"
          className="rounded-xl bg-stone-900 px-5 py-3 font-medium text-white transition hover:bg-stone-700 disabled:opacity-40"
          disabled={!name.trim()}
        >
          加入
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  )
}
