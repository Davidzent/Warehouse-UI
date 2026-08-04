import { useEffect, useMemo, useState } from 'react'
import { fetchLocations, postReceipt } from '../api/receiving'
import type {
  Location,
  PurchaseOrderDetail,
  ReceiptResponse,
  Role,
} from '../api/types'
import { ErrorBanner } from './ErrorBanner'

/** Per-line form state. Strings because inputs produce strings. */
interface LineEntry {
  receiveNow: string
  damaged: string
  locationId: string
}

const emptyLine = (): LineEntry => ({ receiveNow: '0', damaged: '0', locationId: '' })

interface ReceiptFormProps {
  token: string
  purchaseOrder: PurchaseOrderDetail | null
  role: Role
  onPosted?: () => void
}

/**
 * Record a delivery against the loaded purchase order.
 */
export function ReceiptForm({ token, purchaseOrder, role, onPosted }: ReceiptFormProps) {
  const [entries, setEntries] = useState<Record<number, LineEntry>>({})
  const [locations, setLocations] = useState<Location[]>([])
  const [carrierReference, setCarrierReference] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [result, setResult] = useState<ReceiptResponse | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchLocations(token).then(setLocations).catch(setError)
  }, [token])

  // Reset the inputs whenever a different PO is loaded. Keyed on object
  // identity, not poId: re-posting refetches the same order and the consumed
  // quantities have to clear too. Adjusting during render rather than in an
  // effect keeps the previous order's numbers from painting for a frame.
  // `locations` and the carrier reference survive — they outlive one order.
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
      const received = Number(entry.receiveNow) || 0
      const damaged = Number(entry.damaged) || 0
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
      const response = await postReceipt(
        {
          purchaseOrderId: purchaseOrder.poId,
          carrierReference: carrierReference || null,
          notes: null,
          lines,
        },
        token,
      )
      setResult(response)
      onPosted?.()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  if (!purchaseOrder) return null

  const canSubmit = role === 'CLERK' && problems.length === 0 && !busy

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
              <th>Put-away location</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrder.lines.map((line) => {
              const entry = entries[line.poLineId] ?? emptyLine()
              return (
                <tr key={line.poLineId}>
                  <td>{line.lineNumber}</td>
                  <td>{line.sku}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={entry.receiveNow}
                      onChange={(e) => update(line.poLineId, 'receiveNow', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={entry.damaged}
                      onChange={(e) => update(line.poLineId, 'damaged', e.target.value)}
                    />
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
        {role === 'CLERK' ? (
          <button type="submit" disabled={!canSubmit}>
            {busy ? 'Posting…' : 'Post receipt'}
          </button>
        ) : (
          <p>Signed in as VIEWER — posting is a clerk action.</p>
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
