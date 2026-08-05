/**
 * One function per API endpoint.
 */
import { request } from './client'
import type {
  DevTokenResponse,
  InventoryRow,
  Location,
  PurchaseOrderDetail,
  ReceiptRequest,
  ReceiptResponse,
  Role,
} from './types'

/**
 * DEV ONLY. Mints a token without checking a password
 */
export function fetchDevToken(username: string, role: Role) {
  return request<DevTokenResponse>('/api/auth/dev-token', {
    method: 'POST',
    body: { username, role },
  })
}

export function fetchPurchaseOrder(poId: string | number) {
  return request<PurchaseOrderDetail>(`/api/purchase-orders/${poId}`)
}

export function fetchLocations() {
  return request<Location[]>('/api/locations')
}

export function fetchInventory() {
  return request<InventoryRow[]>('/api/inventory')
}

/**
 * Note what ReceiptRequest deliberately cannot express: no receiptId, no
 * receivedBy, no receivedAt.
 */
export function postReceipt(body: ReceiptRequest) {
  return request<ReceiptResponse>('/api/receipts', {
    method: 'POST',
    body,
  })
}
