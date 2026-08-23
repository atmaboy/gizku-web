'use client'

import { useEffect, useState } from 'react'

/**
 * Reads the logged-in state written by the app (nl_token/nl_user in
 * localStorage) after mount. `hydrated` stays false until that read has
 * happened, so callers can render the same guest-state markup the server
 * sent and only switch over post-hydration — avoiding a hydration mismatch.
 */
export function useAuthState() {
  const [hydrated, setHydrated] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [username, setUsername] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('nl_token')
    const raw = localStorage.getItem('nl_user')
    if (token && raw) {
      try {
        const user = JSON.parse(raw) as { username?: string; name?: string }
        const name = user.username ?? user.name ?? ''
        if (name) { setIsLoggedIn(true); setUsername(name) }
      } catch { /* malformed JSON */ }
    }
    setHydrated(true)
  }, [])

  return { hydrated, isLoggedIn, username }
}
