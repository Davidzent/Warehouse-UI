import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import type { Location, PurchaseOrderDetail, PurchaseOrderLine } from '../api/types'
import { ReceiptForm } from './ReceiptForm'

vi.mock('../api/receiving', () => ({
  fetchLocations: vi.fn(),
  postReceipt: vi.fn(),
}))
const { fetchLocations, postReceipt } = await import('../api/receiving')
const mockLocations = vi.mocked(fetchLocations)
const mockPost = vi.mocked(postReceipt)

const LOCATIONS: Location[] = [
  { locationId: 101, locationCode: 'A-01-01', locationType: 'STORAGE' },
  { locationId: 103, locationCode: 'QC-HOLD', locationType: 'QUARANTINE' },
]

/** Ordered 50, none received yet, so the 110% cap leaves 55 receivable. */
function line(overrides: Partial<PurchaseOrderLine> = {}): PurchaseOrderLine {
  return {
    poLineId: 2000,
    lineNumber: 1,
    productId: 10,
    sku: 'SKU-BOLT-M8',
    productDescription: 'Hex bolt M8',
    quantityOrdered: 50,
    quantityReceived: 0,
    remainingQuantity: 50,
    maxReceivableNow: 55,
    ...overrides,
  }
}

function purchaseOrder(overrides: Partial<PurchaseOrderDetail> = {}): PurchaseOrderDetail {
  return {
    poId: 1000,
    poNumber: 'PO-1000',
    vendorCode: 'ACME',
    vendorName: 'Acme Industrial Supply',
    status: 'OPEN',
    receivable: true,
    orderDate: '2026-01-01',
    expectedDate: '2026-01-08',
    createdAt: '2026-01-01T00:00:00Z',
    createdBy: 'seed',
    updatedAt: '2026-01-01T00:00:00Z',
    updatedBy: 'seed',
    lines: [line()],
    ...overrides,
  }
}

async function renderForm(po: PurchaseOrderDetail = purchaseOrder(), canReceive = true) {
  const onPosted = vi.fn()
  const view = render(<ReceiptForm purchaseOrder={po} canReceive={canReceive} onPosted={onPosted} />)
  await act(async () => {}) // let fetchLocations settle
  return { ...view, onPosted }
}

const receiveInput = (n = 1) => screen.getAllByLabelText(/^Receive now,/i)[n - 1]
const damagedInput = (n = 1) => screen.getAllByLabelText(/^Damaged,/i)[n - 1]
const locationSelect = (n = 1) => screen.getAllByLabelText(/^Put-away location,/i)[n - 1]
const submitButton = () => screen.getByRole('button', { name: /post receipt/i })

async function enter(field: HTMLElement, value: string) {
  await act(async () => {
    fireEvent.change(field, { target: { value } })
  })
}

beforeEach(() => {
  mockLocations.mockReset()
  mockPost.mockReset()
  mockLocations.mockResolvedValue(LOCATIONS)
})

describe('ReceiptForm — what actually becomes stock', () => {
  /** The rule people get wrong: damaged units arrived, but never reach inventory. */
  it('subtracts damaged units from what goes to stock', async () => {
    await renderForm()
    await enter(receiveInput(), '10')
    await enter(damagedInput(), '4')

    expect(screen.getByText('6')).toBeDefined()
    expect(screen.getByText('10 received − 4 damaged')).toBeDefined()
  })

  it('says all units are good when none are damaged', async () => {
    await renderForm()
    await enter(receiveInput(), '10')

    expect(screen.getByText('all 10 good')).toBeDefined()
  })

  it('shows nothing reaching stock when every unit is damaged', async () => {
    await renderForm()
    await enter(receiveInput(), '5')
    await enter(damagedInput(), '5')

    expect(screen.getByText('0')).toBeDefined()
    expect(screen.getByText('5 received − 5 damaged')).toBeDefined()
  })
})

describe('ReceiptForm — refusing what the server would reject', () => {
  it('blocks a delivery with more damaged than received', async () => {
    await renderForm()
    await enter(receiveInput(), '3')
    await enter(damagedInput(), '4')

    expect(screen.getByText(/damaged \(4\) exceeds received \(3\)/i)).toBeDefined()
    expect(submitButton()).toHaveProperty('disabled', true)
  })

  it('blocks a quantity past the 110% cap', async () => {
    await renderForm()
    await enter(receiveInput(), '56') // cap is 55
    await enter(locationSelect(), '101')

    expect(screen.getByText(/56 exceeds the 110% cap \(max 55\)/i)).toBeDefined()
    expect(submitButton()).toHaveProperty('disabled', true)
  })

  /**
   * Between remaining and the cap is a legitimate over-shipment. Warning about
   * it while still allowing the post is the whole point of the two numbers.
   */
  it('allows an over-shipment that is still inside the cap', async () => {
    await renderForm()
    await enter(receiveInput(), '52') // over the 50 expected, under the 55 cap
    await enter(locationSelect(), '101')

    expect(screen.getByText(/2 over the 50 expected/i)).toBeDefined()
    expect(screen.queryByText(/exceeds the 110% cap/i)).toBeNull()
    expect(submitButton()).toHaveProperty('disabled', false)
  })

  it('requires a put-away location once a quantity is entered', async () => {
    await renderForm()
    await enter(receiveInput(), '5')

    expect(screen.getByText(/choose a put-away location/i)).toBeDefined()
    expect(submitButton()).toHaveProperty('disabled', true)
  })

  it('refuses an empty receipt', async () => {
    await renderForm()

    expect(screen.getByText(/enter a quantity on at least one line/i)).toBeDefined()
    expect(submitButton()).toHaveProperty('disabled', true)
  })

  it('offers no form at all when the order cannot accept deliveries', async () => {
    await renderForm(purchaseOrder({ receivable: false, status: 'CLOSED' }))

    expect(screen.getByText(/every ordered line has already been received in full/i)).toBeDefined()
    expect(screen.queryByRole('button', { name: /post receipt/i })).toBeNull()
  })

  it('hides the submit control from a viewer', async () => {
    await renderForm(purchaseOrder(), false)

    expect(screen.queryByRole('button', { name: /post receipt/i })).toBeNull()
    expect(screen.getByText(/your role does not permit posting receipts/i)).toBeDefined()
  })
})

describe('ReceiptForm — what it sends', () => {
  const twoLines = purchaseOrder({
    lines: [line(), line({ poLineId: 2001, lineNumber: 2, sku: 'SKU-NUT-M8' })],
  })

  it('sends only the lines that actually received something', async () => {
    mockPost.mockResolvedValue({
      receiptId: 5001,
      purchaseOrderId: 1000,
      purchaseOrderStatusAfter: 'PARTIALLY_RECEIVED',
      receivedBy: 'david',
      receivedAt: '2026-01-02T00:00:00Z',
      lines: [],
    })
    await renderForm(twoLines)

    await enter(receiveInput(2), '7')
    await enter(damagedInput(2), '2')
    await enter(locationSelect(2), '103')
    await act(async () => {
      fireEvent.click(submitButton())
    })

    expect(mockPost).toHaveBeenCalledTimes(1)
    const body = mockPost.mock.calls[0][0]
    expect(body.purchaseOrderId).toBe(1000)
    expect(body.lines).toEqual([
      { poLineId: 2001, quantityReceived: 7, quantityDamaged: 2, locationId: 103 },
    ])
  })

  it('reports the receipt id upward so the other panels refresh', async () => {
    mockPost.mockResolvedValue({
      receiptId: 5002,
      purchaseOrderId: 1000,
      purchaseOrderStatusAfter: 'CLOSED',
      receivedBy: 'david',
      receivedAt: '2026-01-02T00:00:00Z',
      lines: [{ poLineId: 2000, sku: 'SKU-BOLT-M8', quantityReceived: 5, quantityDamaged: 1, goodQuantity: 4, locationId: 101 }],
    })
    const { onPosted } = await renderForm()

    await enter(receiveInput(), '5')
    await enter(damagedInput(), '1')
    await enter(locationSelect(), '101')
    await act(async () => {
      fireEvent.click(submitButton())
    })

    expect(onPosted).toHaveBeenCalledWith(5002)
    expect(screen.getByText(/4 good unit\(s\) added to inventory/i)).toBeDefined()
  })
})

describe('ReceiptForm — server field errors', () => {
  /**
   * damagedWithinReceived is an @AssertTrue getter name, not a field. Without the
   * alias the one error a clerk hits most would render against no input at all.
   */
  it('lands the damagedWithinReceived error on the damaged input', async () => {
    mockPost.mockRejectedValue(
      new ApiError({
        status: 400,
        title: 'Validation Error',
        detail: 'Request validation failed',
        fieldErrors: { 'lines[0].damagedWithinReceived': 'damaged must not exceed received' },
      }),
    )
    await renderForm()

    await enter(receiveInput(), '5')
    await enter(locationSelect(), '101')
    await act(async () => {
      fireEvent.click(submitButton())
    })

    expect(damagedInput().getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText(/damaged must not exceed received/i)).toBeDefined()
  })

  it('surfaces an unrecognised field error rather than dropping it', async () => {
    mockPost.mockRejectedValue(
      new ApiError({
        status: 400,
        detail: 'Request validation failed',
        fieldErrors: { somethingUnmapped: 'the server disliked this' },
      }),
    )
    await renderForm()

    await enter(receiveInput(), '5')
    await enter(locationSelect(), '101')
    await act(async () => {
      fireEvent.click(submitButton())
    })

    expect(screen.getByText(/the server disliked this/i)).toBeDefined()
  })

  it('clears a field error as soon as that field is edited', async () => {
    mockPost.mockRejectedValue(
      new ApiError({
        status: 400,
        detail: 'Request validation failed',
        fieldErrors: { 'lines[0].quantityReceived': 'quantityReceived must be at least 1' },
      }),
    )
    await renderForm()

    await enter(receiveInput(), '5')
    await enter(locationSelect(), '101')
    await act(async () => {
      fireEvent.click(submitButton())
    })
    expect(screen.getByText(/quantityReceived must be at least 1/i)).toBeDefined()

    await enter(receiveInput(), '6')

    expect(screen.queryByText(/quantityReceived must be at least 1/i)).toBeNull()
  })
})
