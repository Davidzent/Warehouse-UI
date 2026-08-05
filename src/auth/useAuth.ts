import { useCallback, useState } from 'react'
import { fetchDevToken } from '../api/receiving'
import type { Role } from '../api/types'
import { decodeToken, RECEIVING_ROLE } from './token'

export interface Session {
  token: string
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

  const signIn = useCallback(async (username: string, role: Role) => {
    setBusy(true)
    setError(null)
    try {
      const { token } = await fetchDevToken(username, role)
      const next = sessionFromToken(token)
      if (!next) throw new Error('The sign-in token could not be read')

      sessionStorage.setItem(STORAGE_KEY, token)
      setSession(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }, [])

  const signOut = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    setSession(null)
    setError(null)
  }, [])

  return { session, signIn, signOut, error, busy }
}

function restore(): Session | null {
  const token = sessionStorage.getItem(STORAGE_KEY)
  if (!token) return null

  const session = sessionFromToken(token)
  if (!session) sessionStorage.removeItem(STORAGE_KEY)
  return session
}

/** Only the token is stored; every other session field is derived from it. */
function sessionFromToken(token: string): Session | null {
  const claims = decodeToken(token)
  if (!claims || claims.expiresAt <= Date.now()) return null

  return {
    token,
    username: claims.subject,
    roles: claims.roles,
    canReceive: claims.roles.includes(RECEIVING_ROLE),
  }
}
