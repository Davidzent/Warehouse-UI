import { isApiError } from '../api/client'

/**
 * Renders an error from any source as something a clerk can act on. No status
 * codes and no server internals reach the screen.
 */
export function ErrorBanner({ error }: { error: unknown }) {
  if (!error) return null

  return (
    <div role="alert">
      <p>{messageFor(error)}</p>
    </div>
  )
}

function messageFor(error: unknown): string {
  if (!isApiError(error)) {
    return 'Could not reach the server. Check the connection and try again.'
  }

  switch (error.status) {
    // 403/404/409 details are written for people — "PO-1002 is CLOSED and cannot
    // accept receipts" beats anything generic. A 409 in particular is a normal
    // outcome of the business rules, not a fault, so it reads as a plain fact.
    case 403:
      return error.detail ?? 'Your role does not permit this action.'
    case 404:
      return error.detail ?? 'That record does not exist.'
    case 409:
      return error.detail ?? 'This delivery conflicts with the order as it stands.'
    case 500:
      return 'Something went wrong on our side. Wait a moment and try again.'
    default:
      return error.detail ?? 'The request could not be completed.'
  }
}
