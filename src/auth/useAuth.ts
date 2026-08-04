import { useCallback, useState } from 'react'
import { fetchDevToken } from '../api/receiving'
import type { Role } from '../api/types'

export interface Session {
  token: string
  username: string
  role: Role
}

/**
 * Holds the session token.
 */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const signIn = useCallback(async (username: string, role: Role) => {
    setBusy(true)
    setError(null)
    try {
      const result = await fetchDevToken(username, role)
      setSession({ token: result.token, username: result.username, role: result.role })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }, [])

  const signOut = useCallback(() => {
    setSession(null)
    setError(null)
  }, [])

  return { session, signIn, signOut, error, busy }
}
