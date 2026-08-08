import { useCallback, useRef } from 'react'

/**
 * Guards against out-of-order responses. Two clicks on Refresh race, and the
 * slower one settling last would otherwise overwrite the fresher data with
 * stale rows — silently, since both requests succeeded.
 *
 * Call before firing to take a ticket; the returned predicate reports whether
 * that request is still the newest one.
 */
export function useLatestRequest() {
  const latest = useRef(0)

  return useCallback(() => {
    const ticket = ++latest.current
    return () => ticket === latest.current
  }, [])
}
