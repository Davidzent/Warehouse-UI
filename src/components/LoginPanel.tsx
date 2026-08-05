import { useState } from 'react'
import type { Role } from '../api/types'
import type { Session } from '../auth/useAuth'

interface LoginPanelProps {
  session: Session | null
  onSignIn: (username: string, role: Role) => void
  onSignOut: () => void
  busy: boolean
  error: string | null
}

/**
 * Temporary sign-in against the dev token endpoint.
 */
export function LoginPanel({ session, onSignIn, onSignOut, busy, error }: LoginPanelProps) {
  const [username, setUsername] = useState('david')
  const [role, setRole] = useState<Role>('CLERK')

  if (session) {
    return (
      <section>
        <h2>Session</h2>
        <p>
          Signed in as <strong>{session.username}</strong> ({session.roles.join(', ')})
        </p>
        <button onClick={onSignOut}>Sign out</button>
      </section>
    )
  }

  return (
    <section>
      <h2>Sign in (dev token)</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSignIn(username, role)
        }}
      >
        <label>
          Username{' '}
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>{' '}
        <label>
          Role{' '}
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="CLERK">CLERK — may post receipts</option>
            <option value="VIEWER">VIEWER — read only</option>
          </select>
        </label>{' '}
        <button type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Get token'}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
