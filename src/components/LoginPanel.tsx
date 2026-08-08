import { useState } from 'react'
import type { Role } from '../api/types'
import { COLD_START_NOTICE } from '../auth/useAuth'

interface LoginPanelProps {
  onSignIn: (username: string, role: Role) => void
  busy: boolean
  error: string | null
  /** A request is running long enough that silence would read as a broken demo. */
  waking: boolean
}

/**
 * Temporary sign-in against the dev token endpoint.
 */
export function LoginPanel({ onSignIn, busy, error, waking }: LoginPanelProps) {
  const [username, setUsername] = useState('david')
  const [role, setRole] = useState<Role>('CLERK')

  return (
    <section className="sign-in">
      <h2>Development sign-in</h2>

      <p className="notice">
        No password — this mints a test token from the API&apos;s development endpoint. The
        username you enter is recorded as the receiver on everything you post.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSignIn(username, role)
        }}
      >
        <div className="field">
          <label htmlFor="username">Username</label>
          <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="role">Role</label>
          <select id="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="CLERK">Clerk — may post receipts</option>
            <option value="VIEWER">Viewer — read only</option>
          </select>
        </div>

        <button type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {waking && (
        <p className="notice" role="status">
          {COLD_START_NOTICE}
        </p>
      )}

      {error && <p role="alert">{error}</p>}
    </section>
  )
}
