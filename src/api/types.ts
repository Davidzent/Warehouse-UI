/**
 * The API contract, mirrored from the backend's response records.
 */

/** Matches the PoStatus enum. A union, not `string`, so typos fail to compile. */
export type PoStatus = 'OPEN' | 'PARTIALLY_RECEIVED' | 'CLOSED' | 'CANCELLED'

export type Role = 'CLERK' | 'VIEWER'

export interface DevTokenResponse {
  token: string
  username: string
  role: Role
  expiresAt: string
}

export interface PurchaseOrderLine {
  poLineId: number
  lineNumber: number
  productId: number
  sku: string
  productDescription: string
  quantityOrdered: number
  quantityReceived: number
  remainingQuantity: number
  maxReceivableNow: number
}

export interface PurchaseOrderDetail {
  poId: number
  poNumber: string
  vendorCode: string | null
  vendorName: string | null
  status: PoStatus
  receivable: boolean
  orderDate: string
  expectedDate: string | null
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
  lines: PurchaseOrderLine[]
}

export interface Location {
  locationId: number
  locationCode: string
  locationType: 'DOCK' | 'STORAGE' | 'QUARANTINE'
}

export interface InventoryRow {
  inventoryId: number
  productId: number
  locationId: number
  quantityOnHand: number
  updatedAt: string
  sku: string
  productDescription: string
  locationCode: string
}

/** What the client is allowed to send — deliberately narrow. */
export interface ReceiptLineRequest {
  poLineId: number
  quantityReceived: number
  quantityDamaged: number
  locationId: number
}

export interface ReceiptRequest {
  purchaseOrderId: number
  carrierReference: string | null
  notes: string | null
  lines: ReceiptLineRequest[]
}

export interface ReceiptResponseLine {
  poLineId: number
  sku: string
  quantityReceived: number
  quantityDamaged: number
  goodQuantity: number
  locationId: number
}

export interface ReceiptResponse {
  receiptId: number
  purchaseOrderId: number
  purchaseOrderStatusAfter: PoStatus
  receivedBy: string
  receivedAt: string
  lines: ReceiptResponseLine[]
}

/** RFC 7807 ProblemDetail, as returned by ApiExceptionHandler. */
export interface ProblemDetail {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  fieldErrors?: Record<string, string>
}
