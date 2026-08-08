import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useLatestRequest } from './useLatestRequest'

/** A promise whose settle time this test controls, so ordering is not a race. */
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe('useLatestRequest', () => {
  it('treats a lone request as current', async () => {
    const { result } = renderHook(() => useLatestRequest())

    expect(result.current()()).toBe(true)
  })

  it('invalidates a ticket as soon as a newer one is taken', () => {
    const { result } = renderHook(() => useLatestRequest())

    const first = result.current()
    const second = result.current()

    expect(first()).toBe(false)
    expect(second()).toBe(true)
  })

  it('keeps only the newest of several in flight', () => {
    const { result } = renderHook(() => useLatestRequest())

    const tickets = [result.current(), result.current(), result.current()]

    expect(tickets.map((t) => t())).toEqual([false, false, true])
  })

  it('drops a slow response that a newer request already superseded', async () => {
    const { result } = renderHook(() => useLatestRequest())
    const written: string[] = []

    const slow = deferred<string>()
    const isFirstCurrent = result.current()
    const first = slow.promise.then((v) => {
      if (isFirstCurrent()) written.push(v)
    })

    const fast = deferred<string>()
    const isSecondCurrent = result.current()
    const second = fast.promise.then((v) => {
      if (isSecondCurrent()) written.push(v)
    })

    // The newer request answers first; the older one lands afterwards.
    fast.resolve('FRESH')
    await second
    slow.resolve('STALE')
    await first

    expect(written).toEqual(['FRESH'])
  })

  /**
   * The bug this hook exists for. If this ever matches the test above, the
   * guard has stopped doing anything and the one above is passing for free.
   */
  it('control: without the guard the stale response overwrites the fresh one', async () => {
    const written: string[] = []

    const slow = deferred<string>()
    const first = slow.promise.then((v) => void written.push(v))
    const fast = deferred<string>()
    const second = fast.promise.then((v) => void written.push(v))

    fast.resolve('FRESH')
    await second
    slow.resolve('STALE')
    await first

    expect(written).toEqual(['FRESH', 'STALE'])
    expect(written.at(-1)).toBe('STALE')
  })
})
