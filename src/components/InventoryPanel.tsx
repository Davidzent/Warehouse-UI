import { useCallback, useEffect, useState } from 'react'
import { fetchInventory } from '../api/receiving'
import type { InventoryRow } from '../api/types'
import { useLatestRequest } from '../hooks/useLatestRequest'
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

  const beginRequest = useLatestRequest()

  const load = useCallback(() => {
    const isLatest = beginRequest()
    fetchInventory().then(
      (loaded) => {
        if (!isLatest()) return
        setRows(loaded)
        setError(null)
      },
      (failure) => {
        if (!isLatest()) return
        setRows(null)
        setError(failure)
      },
    )
  }, [beginRequest])

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
              <th>Location</th>
              <th className="num">On hand</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.inventoryId}>
                <td>
                  <span className="sku">{row.sku}</span>
                  <div className="disposition-note">{row.productDescription}</div>
                </td>
                <td className="sku">{row.locationCode}</td>
                <td className="num">{row.quantityOnHand}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
