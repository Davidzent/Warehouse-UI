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
  const [rows, setRows] = useState<InventoryRow[]>([])
  const [error, setError] = useState<unknown>(null)

  const load = useCallback(() => {
    fetchInventory().then(setRows).catch(setError)
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
      <table border={1} cellPadding={4}>
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
    </section>
  )
}
