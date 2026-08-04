import { isApiError } from '../api/client'

/**
 * Renders an error from any source.
 */
export function ErrorBanner({ error }: { error: unknown }) {
  if (!error) return null

  if (!isApiError(error)) {
    return (
      <div role="alert">
        <strong>Error</strong>
        <p>{error instanceof Error ? error.message : String(error)}</p>
      </div>
    )
  }

  return (
    <div role="alert">
      <strong>
        {error.status} {error.title ?? ''}
      </strong>
      <p>{error.detail}</p>

      {error.fieldErrors && (
        <ul>
          {Object.entries(error.fieldErrors).map(([field, message]) => (
            <li key={field}>
              <code>{field}</code>: {message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
