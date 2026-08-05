import { useState } from 'react'
import { fetchPurchaseOrder } from '../api/receiving'
import type { PurchaseOrderDetail } from '../api/types'
import { ErrorBanner } from './ErrorBanner'

interface PurchaseOrderPanelProps {
  purchaseOrder: PurchaseOrderDetail | null
  onLoaded: (po: PurchaseOrderDetail | null) => void
}

/**
 * Load a purchase order by id.
 */
export function PurchaseOrderPanel({ purchaseOrder, onLoaded }: PurchaseOrderPanelProps) {
  const [poId, setPoId] = useState('1000')
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  async function load(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onLoaded(await fetchPurchaseOrder(poId))
    } catch (err) {
      setError(err)
      onLoaded(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <h2>Purchase order</h2>
      <form onSubmit={load}>
        <label>
          PO id <input value={poId} onChange={(e) => setPoId(e.target.value)} />
        </label>{' '}
        <button type="submit" disabled={busy}>
          {busy ? 'Loading…' : 'Load'}
        </button>
      </form>

      <ErrorBanner error={error} />

      {busy && <p>Loading purchase order…</p>}
      {!purchaseOrder && !error && !busy && <p>Enter a purchase order id to look one up.</p>}

      {purchaseOrder && (
        <>
          <p>
            <strong>{purchaseOrder.poNumber}</strong> — {purchaseOrder.vendorName} — status{' '}
            <strong>{purchaseOrder.status}</strong>
            {!purchaseOrder.receivable && ' (not receivable)'}
          </p>
          <p>
            ordered {purchaseOrder.orderDate} · expected {purchaseOrder.expectedDate ?? '—'} ·
            created by {purchaseOrder.createdBy}
          </p>

          {purchaseOrder.lines.length === 0 && <p>This order has no lines.</p>}

          {purchaseOrder.lines.length > 0 && (
          <table border={1} cellPadding={4}>
            <thead>
              <tr>
                <th>#</th>
                <th>SKU</th>
                <th>Description</th>
                <th>Ordered</th>
                <th>Received</th>
                <th>Remaining</th>
                <th>Max now (110%)</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrder.lines.map((line) => (
                <tr key={line.poLineId}>
                  <td>{line.lineNumber}</td>
                  <td>{line.sku}</td>
                  <td>{line.productDescription}</td>
                  <td>{line.quantityOrdered}</td>
                  <td>{line.quantityReceived}</td>
                  <td>{line.remainingQuantity}</td>
                  <td>{line.maxReceivableNow}</td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </>
      )}
    </section>
  )
}
