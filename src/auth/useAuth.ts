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

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const signIn = useCallback(async (username: string, role: Role) => {
    setBusy(true)
    setError(null)
    try {
      const { token } = await fetchDevToken(username, role)
      const claims = decodeToken(token)
      if (!claims) throw new Error('The sign-in token could not be read')

      setSession({
        token,
        username: claims.subject,
        roles: claims.roles,
        canReceive: claims.roles.includes(RECEIVING_ROLE),
      })
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
