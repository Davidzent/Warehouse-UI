import { useEffect, useMemo, useState } from 'react'
import { fetchLocations, postReceipt } from '../api/receiving'
import type { Location, PurchaseOrderDetail, ReceiptResponse } from '../api/types'
import { ErrorBanner } from './ErrorBanner'

/** Per-line form state. Strings because inputs produce strings. */
interface LineEntry {
  receiveNow: string
  damaged: string
  locationId: string
}

const emptyLine = (): LineEntry => ({ receiveNow: '0', damaged: '0', locationId: '' })

/**
 * Damaged units still count as received — they physically arrived, and the PO's
 * running total is gross — but only received minus damaged becomes usable stock.
 */
function quantities(entry: LineEntry | undefined) {
  const received = Number(entry?.receiveNow) || 0
  const damaged = Number(entry?.damaged) || 0
  return { received, damaged, good: received - damaged }
}

interface ReceiptFormProps {
  purchaseOrder: PurchaseOrderDetail | null
  canReceive: boolean
  onPosted?: () => void
}

/**
 * Record a delivery against the loaded purchase order.
 */
export function ReceiptForm({ purchaseOrder, canReceive, onPosted }: ReceiptFormProps) {
  const [entries, setEntries] = useState<Record<number, LineEntry>>({})
  const [locations, setLocations] = useState<Location[]>([])
  const [carrierReference, setCarrierReference] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [result, setResult] = useState<ReceiptResponse | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchLocations().then(setLocations).catch(setError)
  }, [])

  // Reset the line inputs when a different PO loads. Compared by identity, not
  // poId: re-posting refetches the same order and its quantities must clear too.
  const [loadedPo, setLoadedPo] = useState<PurchaseOrderDetail | null>(null)
  if (purchaseOrder && purchaseOrder !== loadedPo) {
    setLoadedPo(purchaseOrder)
    const next: Record<number, LineEntry> = {}
    for (const line of purchaseOrder.lines) next[line.poLineId] = emptyLine()
    setEntries(next)
    setResult(null)
    setError(null)
  }

  function update(poLineId: number, field: keyof LineEntry, value: string) {
    setEntries((prev) => ({
      ...prev,
      [poLineId]: { ...(prev[poLineId] ?? emptyLine()), [field]: value },
    }))
  }

  const problems = useMemo(() => {
    if (!purchaseOrder) return []
    const found: string[] = []
    let anyQuantity = false

    for (const line of purchaseOrder.lines) {
      const entry = entries[line.poLineId]
      if (!entry) continue
      const { received, damaged } = quantities(entry)
      if (received > 0) anyQuantity = true
      if (damaged > received) {
        found.push(`Line ${line.lineNumber}: damaged (${damaged}) exceeds received (${received})`)
      }
      if (received > line.maxReceivableNow) {
        found.push(
          `Line ${line.lineNumber}: ${received} exceeds the 110% cap (max ${line.maxReceivableNow})`,
        )
      }
      if (received > 0 && !entry.locationId) {
        found.push(`Line ${line.lineNumber}: choose a put-away location`)
      }
    }
    if (!anyQuantity) found.push('Enter a quantity on at least one line')
    return found
  }, [entries, purchaseOrder])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!purchaseOrder) return
    setBusy(true)
    setError(null)
    setResult(null)

    const lines = purchaseOrder.lines
      .filter((line) => Number(entries[line.poLineId]?.receiveNow) > 0)
      .map((line) => ({
        poLineId: line.poLineId,
        quantityReceived: Number(entries[line.poLineId].receiveNow),
        quantityDamaged: Number(entries[line.poLineId].damaged) || 0,
        locationId: Number(entries[line.poLineId].locationId),
      }))

    try {
      const response = await postReceipt({
        purchaseOrderId: purchaseOrder.poId,
        carrierReference: carrierReference || null,
        notes: null,
        lines,
      })
      setResult(response)
      onPosted?.()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  if (!purchaseOrder) return null

  const canSubmit = canReceive && problems.length === 0 && !busy

  return (
    <section>
      <h2>Record receipt</h2>

      <form onSubmit={submit}>
        <table border={1} cellPadding={4}>
          <thead>
            <tr>
              <th>#</th>
              <th>SKU</th>
              <th>Receive now</th>
              <th>Damaged</th>
              <th>Good → stock</th>
              <th>Put-away location</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrder.lines.map((line) => {
              const entry = entries[line.poLineId] ?? emptyLine()
              const { received, damaged, good } = quantities(entry)
              const goodId = `good-${line.poLineId}`
              const capId = `cap-${line.poLineId}`

              // remainingQuantity is what is still expected; maxReceivableNow is
              // the headroom under the 110% cap. Between the two is a legitimate
              // over-shipment, so it warns; past the cap the problems list errors.
              const overExpected = received > line.remainingQuantity
              return (
                <tr key={line.poLineId}>
                  <td>{line.lineNumber}</td>
                  <td>{line.sku}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={entry.receiveNow}
                      aria-describedby={`${capId} ${goodId}`}
                      onChange={(e) => update(line.poLineId, 'receiveNow', e.target.value)}
                    />
                    <div id={capId}>
                      {overExpected ? (
                        <strong>
                          {received - line.remainingQuantity} over the {line.remainingQuantity}{' '}
                          expected · max {line.maxReceivableNow}
                        </strong>
                      ) : (
                        <>
                          {line.remainingQuantity} expected · max {line.maxReceivableNow}
                        </>
                      )}
                    </div>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={entry.damaged}
                      aria-describedby={goodId}
                      onChange={(e) => update(line.poLineId, 'damaged', e.target.value)}
                    />
                  </td>
                  <td id={goodId}>
                    {received === 0 || good < 0 ? (
                      '—'
                    ) : (
                      <>
                        <strong>{good}</strong>
                        {damaged > 0 && ` (${received} received − ${damaged} damaged)`}
                      </>
                    )}
                  </td>
                  <td>
                    <select
                      value={entry.locationId}
                      onChange={(e) => update(line.poLineId, 'locationId', e.target.value)}
                    >
                      <option value="">—</option>
                      {locations.map((loc) => (
                        <option key={loc.locationId} value={loc.locationId}>
                          {loc.locationCode} ({loc.locationType})
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <p>
          <label>
            Carrier ref{' '}
            <input
              value={carrierReference}
              onChange={(e) => setCarrierReference(e.target.value)}
            />
          </label>
        </p>

        {problems.map((problem) => (
          <p key={problem} role="alert">
            {problem}
          </p>
        ))}
        {canReceive ? (
          <button type="submit" disabled={!canSubmit}>
            {busy ? 'Posting…' : 'Post receipt'}
          </button>
        ) : (
          <p>Your role does not permit posting receipts.</p>
        )}
      </form>

      <ErrorBanner error={error} />

      {result && (
        <p>
          Receipt #{result.receiptId} posted by {result.receivedBy}. PO is now{' '}
          <strong>{result.purchaseOrderStatusAfter}</strong>.{' '}
          {result.lines.reduce((sum, l) => sum + l.goodQuantity, 0)} good unit(s) added to
          inventory.
        </p>
      )}
    </section>
  )
}
