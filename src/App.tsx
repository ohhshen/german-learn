import { useState } from 'react'
import type { User } from './api'
import { Home } from './components/Home'
import { ReviewSession } from './components/ReviewSession'
import { UserSelect } from './components/UserSelect'

const STORAGE_KEY = 'german-learn:user'

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(loadUser)
  const [reviewing, setReviewing] = useState(false)

  function selectUser(next: User | null) {
    setUser(next)
    setReviewing(false)
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // 隱私模式下無法寫入,忽略即可
    }
  }

  if (!user) return <UserSelect onSelect={selectUser} />
  if (reviewing) return <ReviewSession user={user} onExit={() => setReviewing(false)} />
  return (
    <Home
      user={user}
      onStart={() => setReviewing(true)}
      onSwitchUser={() => selectUser(null)}
    />
  )
}
