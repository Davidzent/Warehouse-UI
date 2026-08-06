import { useCallback, useEffect, useState } from 'react'
import { fetchReceipt } from '../api/receiving'
import type { ReceiptDetail } from '../api/types'
import { ErrorBanner } from './ErrorBanner'

interface ReceiptPanelProps {
  /** Set after a successful post, so the confirmation opens on its own. */
  receiptId: number | null
}

/** Look up a recorded receipt — the only way back to one, since there is no list route. */
export function ReceiptPanel({ receiptId }: ReceiptPanelProps) {
  const [lookupId, setLookupId] = useState('')
  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  // Settles only inside the promise callbacks, so the auto-load effect below
  // never sets state synchronously.
  const show = useCallback(
    (id: string | number) =>
      fetchReceipt(id).then(
        (loaded) => {
          setReceipt(loaded)
          setError(null)
        },
        (failure) => {
          setReceipt(null)
          setError(failure)
        },
      ),
    [],
  )

  // Adjust the visible id during render rather than syncing it from an effect.
  const [shownReceiptId, setShownReceiptId] = useState<number | null>(null)
  if (receiptId !== null && receiptId !== shownReceiptId) {
    setShownReceiptId(receiptId)
    setLookupId(String(receiptId))
    setBusy(true)
  }

  useEffect(() => {
    if (receiptId !== null) show(receiptId).finally(() => setBusy(false))
  }, [receiptId, show])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    show(lookupId).finally(() => setBusy(false))
  }

  return (
    <section>
      <h2>Receipt</h2>

      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="receipt-id">Receipt id</label>
          <input
            id="receipt-id"
            inputMode="numeric"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
          />
          <button type="submit" disabled={busy || !lookupId}>
            {busy ? 'Loading…' : 'Load receipt'}
          </button>
        </div>
      </form>

      <ErrorBanner error={error} />

      {busy && <p>Loading receipt…</p>}
      {!receipt && !error && !busy && <p>No receipt loaded.</p>}

      {receipt && (
        <>
          <p>
            Receipt <strong>#{receipt.receiptId}</strong> against PO{' '}
            {receipt.purchaseOrderId} · recorded by {receipt.receivedBy} on{' '}
            {new Date(receipt.receivedAt).toLocaleString()}
          </p>
          <p className="meta">
            carrier {receipt.carrierReference ?? '—'} · notes {receipt.notes ?? '—'}
          </p>

          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Location</th>
                <th className="num">Received</th>
                <th className="num">Damaged</th>
                <th className="num">To stock</th>
              </tr>
            </thead>
            <tbody>
              {receipt.lines.map((line) => (
                <tr key={line.receiptLineId}>
                  <td className="sku">{line.sku}</td>
                  <td className="sku">{line.locationCode}</td>
                  <td className="num">{line.quantityReceived}</td>
                  <td className="num">{line.quantityDamaged}</td>
                  <td className="num">{line.quantityReceived - line.quantityDamaged}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  )
}
