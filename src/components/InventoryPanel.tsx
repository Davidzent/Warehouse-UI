import { useCallback, useEffect, useState } from 'react'
import { fetchInventory } from '../api/receiving'
import type { InventoryRow } from '../api/types'
import { ErrorBanner } from './ErrorBanner'

interface InventoryPanelProps {
  /** Changes after a receipt is posted, which re-runs the fetch. */
  refreshKey: number
}

/** Current stock on hand, per product per location. */
export function InventoryPanel({ refreshKey }: InventoryPanelProps) {
  // null until the first response, so an empty warehouse is not mistaken for
  // one that is still loading.
  const [rows, setRows] = useState<InventoryRow[] | null>(null)
  const [error, setError] = useState<unknown>(null)

  const load = useCallback(() => {
    fetchInventory().then(
      (loaded) => {
        setRows(loaded)
        setError(null)
      },
      (failure) => {
        setRows(null)
        setError(failure)
      },
    )
  }, [])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  return (
    <section>
      <h2>
        Inventory <button onClick={load}>Refresh</button>
      </h2>
      <ErrorBanner error={error} />

      {!rows && !error && <p>Loading stock…</p>}
      {rows?.length === 0 && <p>Nothing in stock yet.</p>}

      {rows && rows.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Description</th>
              <th>Location</th>
              <th>On hand</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.inventoryId}>
                <td>{row.sku}</td>
                <td>{row.productDescription}</td>
                <td>{row.locationCode}</td>
                <td>{row.quantityOnHand}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
