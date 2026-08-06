import { useState } from 'react'
import type { Role } from '../api/types'

interface LoginPanelProps {
  onSignIn: (username: string, role: Role) => void
  busy: boolean
  error: string | null
}

/**
 * Temporary sign-in against the dev token endpoint.
 */
export function LoginPanel({ onSignIn, busy, error }: LoginPanelProps) {
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

      {error && <p role="alert">{error}</p>}
    </section>
  )
}
