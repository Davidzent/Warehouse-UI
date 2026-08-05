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
        <label>
          Receipt id{' '}
          <input
            inputMode="numeric"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
          />
        </label>{' '}
        <button type="submit" disabled={busy || !lookupId}>
          {busy ? 'Loading…' : 'Load'}
        </button>
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
          <p>
            carrier {receipt.carrierReference ?? '—'} · notes {receipt.notes ?? '—'}
          </p>

          <table border={1} cellPadding={4}>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Location</th>
                <th>Received</th>
                <th>Damaged</th>
                <th>Good → stock</th>
              </tr>
            </thead>
            <tbody>
              {receipt.lines.map((line) => (
                <tr key={line.receiptLineId}>
                  <td>{line.sku}</td>
                  <td>{line.locationCode}</td>
                  <td>{line.quantityReceived}</td>
                  <td>{line.quantityDamaged}</td>
                  <td>{line.quantityReceived - line.quantityDamaged}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  )
}
