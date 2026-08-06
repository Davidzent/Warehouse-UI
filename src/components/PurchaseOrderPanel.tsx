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
        <div className="field">
          <label htmlFor="po-id">PO id</label>
          <input
            id="po-id"
            inputMode="numeric"
            value={poId}
            onChange={(e) => setPoId(e.target.value)}
          />
          <button type="submit" disabled={busy}>
            {busy ? 'Loading…' : 'Load order'}
          </button>
        </div>
      </form>

      <ErrorBanner error={error} />

      {busy && <p>Loading purchase order…</p>}
      {!purchaseOrder && !error && !busy && <p>Enter a purchase order id to look one up.</p>}

      {purchaseOrder && (
        <>
          <p>
            <strong>{purchaseOrder.poNumber}</strong> — {purchaseOrder.vendorName}{' '}
            <span className={`pill pill-${purchaseOrder.status.toLowerCase()}`}>
              {purchaseOrder.status.replace('_', ' ')}
            </span>
          </p>
          <p className="meta">
            ordered {purchaseOrder.orderDate} · expected {purchaseOrder.expectedDate ?? '—'} ·
            created by {purchaseOrder.createdBy}
          </p>

          {purchaseOrder.lines.length === 0 && <p>This order has no lines.</p>}

          {purchaseOrder.lines.length > 0 && (
          <table>
            <thead>
              <tr>
                <th className="num">#</th>
                <th>SKU</th>
                <th>Description</th>
                <th className="num">Ordered</th>
                <th className="num">Received</th>
                <th className="num">Remaining</th>
                <th className="num">Max now</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrder.lines.map((line) => (
                <tr key={line.poLineId}>
                  <td className="num">{line.lineNumber}</td>
                  <td className="sku">{line.sku}</td>
                  <td>{line.productDescription}</td>
                  <td className="num">{line.quantityOrdered}</td>
                  <td className="num">{line.quantityReceived}</td>
                  <td className="num">{line.remainingQuantity}</td>
                  <td className="num">{line.maxReceivableNow}</td>
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
