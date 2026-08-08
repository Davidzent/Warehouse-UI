import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { InventoryRow } from '../api/types'
import { InventoryPanel } from './InventoryPanel'

vi.mock('../api/receiving', () => ({ fetchInventory: vi.fn() }))
const { fetchInventory } = await import('../api/receiving')
const mockFetch = vi.mocked(fetchInventory)

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

// Description differs from the SKU on purpose: the panel renders both, so
// reusing one string would match twice and fail the query, not the assertion.
const row = (sku: string, quantityOnHand: number): InventoryRow[] => [
  {
    inventoryId: 1,
    productId: 10,
    locationId: 20,
    quantityOnHand,
    updatedAt: '2026-01-01T00:00:00Z',
    sku,
    productDescription: `description for ${sku}`,
    locationCode: 'A-01',
  },
]

describe('InventoryPanel', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('renders the rows it loads on mount', async () => {
    mockFetch.mockResolvedValue(row('SKU-1', 7))

    render(<InventoryPanel refreshKey={0} />)
    await act(async () => {})

    expect(screen.getByText('SKU-1')).toBeDefined()
    expect(screen.getByText('7')).toBeDefined()
  })

  /**
   * Two refreshes race and the first answers last. The panel must still show
   * the newer rows — this is the regression the request guard exists for.
   */
  it('does not let a slow first response overwrite a newer one', async () => {
    const slow = deferred<InventoryRow[]>()
    const fast = deferred<InventoryRow[]>()
    mockFetch.mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise)

    render(<InventoryPanel refreshKey={0} />)
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))
    expect(mockFetch).toHaveBeenCalledTimes(2)

    await act(async () => {
      fast.resolve(row('FRESH', 999))
    })
    await act(async () => {
      slow.resolve(row('STALE', 111))
    })

    expect(screen.getByText('FRESH')).toBeDefined()
    expect(screen.queryByText('STALE')).toBeNull()
    expect(screen.getByText('999')).toBeDefined()
  })

  it('refetches when refreshKey changes', async () => {
    mockFetch.mockResolvedValue(row('SKU-1', 1))

    const { rerender } = render(<InventoryPanel refreshKey={0} />)
    await act(async () => {})
    rerender(<InventoryPanel refreshKey={1} />)
    await act(async () => {})

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('shows a message instead of an empty table when nothing is in stock', async () => {
    mockFetch.mockResolvedValue([])

    render(<InventoryPanel refreshKey={0} />)
    await act(async () => {})

    expect(screen.getByText(/nothing in stock yet/i)).toBeDefined()
  })

  it('surfaces a failure rather than rendering stale rows', async () => {
    mockFetch.mockRejectedValue(new Error('network down'))

    render(<InventoryPanel refreshKey={0} />)
    await act(async () => {})

    expect(screen.getByRole('alert')).toBeDefined()
  })
})
