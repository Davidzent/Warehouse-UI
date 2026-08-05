import { useEffect, useMemo, useState } from 'react'
import { isApiError } from '../api/client'
import { fetchLocations, postReceipt } from '../api/receiving'
import type { Location, PoStatus, PurchaseOrderDetail, ReceiptResponse } from '../api/types'
import { ErrorBanner } from './ErrorBanner'

/** Per-line form state. Strings because inputs produce strings. */
interface LineEntry {
  receiveNow: string
  damaged: string
  locationId: string
}

type LineErrors = Partial<Record<keyof LineEntry, string>>

/**
 * Server field names to the inputs that produce them. `damagedWithinReceived`
 * is the @AssertTrue getter, not a field — without this alias the one error a
 * clerk hits most would land on no input at all.
 */
const FIELD_TO_INPUT: Record<string, keyof LineEntry> = {
  quantityReceived: 'receiveNow',
  quantityDamaged: 'damaged',
  damagedWithinReceived: 'damaged',
  locationId: 'locationId',
}

/**
 * `lines[n]` indexes the array as submitted, which is why the caller passes the
 * ids in that order. Anything unrecognised is surfaced rather than dropped.
 */
function mapFieldErrors(fieldErrors: Record<string, string>, submittedLineIds: number[]) {
  const lines: Record<number, LineErrors> = {}
  const form: string[] = []

  for (const [key, message] of Object.entries(fieldErrors)) {
    const match = /^lines\[(\d+)\]\.(.+)$/.exec(key)
    const poLineId = match ? submittedLineIds[Number(match[1])] : undefined
    const input = match ? FIELD_TO_INPUT[match[2]] : undefined

    if (poLineId !== undefined && input) {
      lines[poLineId] = { ...lines[poLineId], [input]: message }
    } else {
      form.push(message)
    }
  }
  return { lines, form }
}

const emptyLine = (): LineEntry => ({ receiveNow: '0', damaged: '0', locationId: '' })

/**
 * A wheel over a focused number input edits it. Scrolling to reach the submit
 * button would then silently change what was received, and the server cannot
 * tell a mis-scroll from a real count — so drop focus and let the page scroll.
 */
function blurOnWheel(event: React.WheelEvent<HTMLInputElement>) {
  event.currentTarget.blur()
}

/**
 * Damaged units still count as received — they physically arrived, and the PO's
 * running total is gross — but only received minus damaged becomes usable stock.
 */
function quantities(entry: LineEntry | undefined) {
  const received = Number(entry?.receiveNow) || 0
  const damaged = Number(entry?.damaged) || 0
  return { received, damaged, good: received - damaged }
}

function notReceivableReason(status: PoStatus): string {
  switch (status) {
    case 'CANCELLED':
      return 'it was cancelled'
    case 'CLOSED':
      return 'every ordered line has already been received in full'
    default:
      return `its status is ${status}`
  }
}

interface ReceiptFormProps {
  purchaseOrder: PurchaseOrderDetail | null
  canReceive: boolean
  onPosted?: (receiptId: number) => void
}

/**
 * Record a delivery against the loaded purchase order.
 */
export function ReceiptForm({ purchaseOrder, canReceive, onPosted }: ReceiptFormProps) {
  const [entries, setEntries] = useState<Record<number, LineEntry>>({})
  const [locations, setLocations] = useState<Location[]>([])
  const [carrierReference, setCarrierReference] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [lineErrors, setLineErrors] = useState<Record<number, LineErrors>>({})
  const [formErrors, setFormErrors] = useState<string[]>([])
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
    setLineErrors({})
    setFormErrors([])
  }

  function update(poLineId: number, field: keyof LineEntry, value: string) {
    setEntries((prev) => ({
      ...prev,
      [poLineId]: { ...(prev[poLineId] ?? emptyLine()), [field]: value },
    }))

    // The server's verdict on this field is stale the moment it is edited.
    setLineErrors((prev) => {
      if (!prev[poLineId]?.[field]) return prev
      const { [field]: _cleared, ...rest } = prev[poLineId]
      return { ...prev, [poLineId]: rest }
    })
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
    setLineErrors({})
    setFormErrors([])

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
      onPosted?.(response.receiptId)
    } catch (err) {
      if (isApiError(err) && err.fieldErrors) {
        const mapped = mapFieldErrors(
          err.fieldErrors,
          lines.map((line) => line.poLineId),
        )
        setLineErrors(mapped.lines)
        setFormErrors(mapped.form)
      } else {
        setError(err)
      }
    } finally {
      setBusy(false)
    }
  }

  if (!purchaseOrder) return null

  // The header flag is the only gate. Lines on a closed order still report
  // headroom under the 110% cap — PO-1002 says 1 — and that is arithmetic,
  // not permission.
  if (!purchaseOrder.receivable) {
    return (
      <section>
        <h2>Record receipt</h2>
        <p>
          <strong>{purchaseOrder.poNumber}</strong> cannot accept deliveries because{' '}
          {notReceivableReason(purchaseOrder.status)}.
        </p>
      </section>
    )
  }

  const canSubmit = canReceive && problems.length === 0 && !busy

  return (
    <section>
      <h2>Record receipt</h2>

      <form onSubmit={submit}>
        <table>
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

              // Column headers do not name a form control, so each one carries
              // its own line context — three unlabelled number boxes per row are
              // indistinguishable to a screen reader otherwise.
              const forLine = `line ${line.lineNumber}, ${line.sku}`

              const errors = lineErrors[line.poLineId] ?? {}
              const errId = (field: keyof LineEntry) => `err-${field}-${line.poLineId}`
              const describe = (field: keyof LineEntry, ...base: string[]) =>
                [...base, errors[field] && errId(field)].filter(Boolean).join(' ') || undefined
              return (
                <tr key={line.poLineId}>
                  <td>{line.lineNumber}</td>
                  <td>{line.sku}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={entry.receiveNow}
                      aria-label={`Receive now, ${forLine}`}
                      onWheel={blurOnWheel}
                      aria-invalid={!!errors.receiveNow}
                      aria-describedby={describe('receiveNow', capId, goodId)}
                      onChange={(e) => update(line.poLineId, 'receiveNow', e.target.value)}
                    />
                    {errors.receiveNow && (
                      <p id={errId('receiveNow')} role="alert">
                        {errors.receiveNow}
                      </p>
                    )}
                    <div id={capId} className="hint">
                      {overExpected ? (
                        <strong className="warn">
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
                      aria-label={`Damaged, ${forLine}`}
                      onWheel={blurOnWheel}
                      aria-invalid={!!errors.damaged}
                      aria-describedby={describe('damaged', goodId)}
                      onChange={(e) => update(line.poLineId, 'damaged', e.target.value)}
                    />
                    {errors.damaged && (
                      <p id={errId('damaged')} role="alert">
                        {errors.damaged}
                      </p>
                    )}
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
                      aria-label={`Put-away location, ${forLine}`}
                      aria-invalid={!!errors.locationId}
                      aria-describedby={describe('locationId')}
                      onChange={(e) => update(line.poLineId, 'locationId', e.target.value)}
                    >
                      <option value="">—</option>
                      {locations.map((loc) => (
                        <option key={loc.locationId} value={loc.locationId}>
                          {loc.locationCode} ({loc.locationType})
                        </option>
                      ))}
                    </select>
                    {errors.locationId && (
                      <p id={errId('locationId')} role="alert">
                        {errors.locationId}
                      </p>
                    )}
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

        {[...problems, ...formErrors].map((problem) => (
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
