import { useState } from 'react'
import type { User } from './api'
import { GrammarLesson } from './components/GrammarLesson'
import { GrammarList } from './components/GrammarList'
import { Home } from './components/Home'
import { ReviewSession } from './components/ReviewSession'
import { UserSelect } from './components/UserSelect'

const STORAGE_KEY = 'german-learn:user'

type View =
  | { name: 'home' }
  | { name: 'review' }
  | { name: 'grammar' }
  | { name: 'lesson'; slug: string }

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
  const [view, setView] = useState<View>({ name: 'home' })

  function selectUser(next: User | null) {
    setUser(next)
    setView({ name: 'home' })
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // 隱私模式下無法寫入,忽略即可
    }
  }

  if (!user) return <UserSelect onSelect={selectUser} />

  switch (view.name) {
    case 'review':
      return <ReviewSession user={user} onExit={() => setView({ name: 'home' })} />
    case 'grammar':
      return (
        <GrammarList
          user={user}
          onOpen={(slug) => setView({ name: 'lesson', slug })}
          onBack={() => setView({ name: 'home' })}
        />
      )
    case 'lesson':
      return (
        <GrammarLesson
          key={view.slug}
          user={user}
          slug={view.slug}
          onBack={() => setView({ name: 'grammar' })}
        />
      )
    default:
      return (
        <Home
          user={user}
          onStartReview={() => setView({ name: 'review' })}
          onOpenGrammar={() => setView({ name: 'grammar' })}
          onSwitchUser={() => selectUser(null)}
        />
      )
  }
}
