import { useCallback, useEffect, useState } from 'react'
import { setAuthToken, setUnauthorizedHandler } from '../api/client'
import { fetchDevToken } from '../api/receiving'
import type { Role } from '../api/types'
import { decodeToken, RECEIVING_ROLE } from './token'

/** Who is signed in and what they may do. The token itself stays in the client. */
export interface Session {
  username: string
  roles: string[]
  canReceive: boolean
}

// sessionStorage, not localStorage: this is an HS256 token signed with a secret
// the dev endpoint hands to anyone, so it should die with the tab rather than
// sit on disk between browser sessions.
const STORAGE_KEY = 'warehouse.token'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(restore)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const endSession = useCallback((message: string | null) => {
    sessionStorage.removeItem(STORAGE_KEY)
    setAuthToken(null)
    setSession(null)
    setError(message)
  }, [])

  const signIn = useCallback(async (username: string, role: Role) => {
    setBusy(true)
    setError(null)
    try {
      const { token } = await fetchDevToken(username, role)
      const next = sessionFromToken(token)
      if (!next) throw new Error('The sign-in token could not be read')

      sessionStorage.setItem(STORAGE_KEY, token)
      setAuthToken(token)
      setSession(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }, [])

  const signOut = useCallback(() => endSession(null), [endSession])

  useEffect(() => {
    setUnauthorizedHandler(() => endSession('Your session is no longer valid. Sign in again.'))
    return () => setUnauthorizedHandler(null)
  }, [endSession])

  return { session, signIn, signOut, error, busy }
}

/**
 * Runs during the first render, so the token reaches the client before any
 * child effect fires a request.
 */
function restore(): Session | null {
  const token = sessionStorage.getItem(STORAGE_KEY)
  if (!token) return null

  const session = sessionFromToken(token)
  if (!session) {
    sessionStorage.removeItem(STORAGE_KEY)
    return null
  }

  setAuthToken(token)
  return session
}

/** Only the token is stored; every session field is derived from its claims. */
function sessionFromToken(token: string): Session | null {
  const claims = decodeToken(token)
  if (!claims || claims.expiresAt <= Date.now()) return null

  return {
    username: claims.subject,
    roles: claims.roles,
    canReceive: claims.roles.includes(RECEIVING_ROLE),
  }
}
