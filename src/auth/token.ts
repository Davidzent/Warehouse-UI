/**
 * The roles claim that guards POST /api/receipts. The dev-token endpoint takes
 * "CLERK" and mints this instead, so the role that was asked for and the role
 * that authorises are different strings — gate on the one in the token.
 */
export const RECEIVING_ROLE = 'WAREHOUSE_CLERK'

export interface TokenClaims {
  subject: string
  roles: string[]
  expiresAt: number
}

/**
 * Read, never verified — the signature is the server's business. These claims
 * only decide what the UI offers; every request is authorised again server-side.
 */
export function decodeToken(token: string): TokenClaims | null {
  const payload = token.split('.')[1]
  if (!payload) return null

  try {
    const claims: unknown = JSON.parse(decodeSegment(payload))
    if (typeof claims !== 'object' || claims === null) return null

    const { sub, roles, exp } = claims as { sub?: unknown; roles?: unknown; exp?: unknown }
    if (typeof sub !== 'string' || typeof exp !== 'number') return null

    return {
      subject: sub,
      roles: Array.isArray(roles) ? roles.filter((r) => typeof r === 'string') : [],
      expiresAt: exp * 1000, // exp counts seconds; the rest of the app works in millis
    }
  } catch {
    return null
  }
}

function decodeSegment(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
  // Via bytes rather than atob's output directly, so a non-ASCII username survives.
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
}
