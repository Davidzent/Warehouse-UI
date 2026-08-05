import { useState } from 'react'
import { useAuth } from './auth/useAuth'
import { LoginPanel } from './components/LoginPanel'
import { PurchaseOrderPanel } from './components/PurchaseOrderPanel'
import { ReceiptForm } from './components/ReceiptForm'
import { ReceiptPanel } from './components/ReceiptPanel'
import { LocationsPanel } from './components/LocationsPanel'
import { InventoryPanel } from './components/InventoryPanel'
import type { PurchaseOrderDetail } from './api/types'

/**
 * Inbound receiving screen.
 */
export default function App() {
  const { session, signIn, signOut, error: authError, busy } = useAuth()
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderDetail | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [postedReceiptId, setPostedReceiptId] = useState<number | null>(null)

  // Bump after a successful post so inventory refetches and the PO panel
  // remounts, reloading its running totals and status.
  function handlePosted(receiptId: number) {
    setRefreshKey((k) => k + 1)
    setPostedReceiptId(receiptId)
  }

  return (
    <main>
      <h1>Warehouse — Inbound Receiving</h1>

      <LoginPanel
        session={session}
        onSignIn={signIn}
        onSignOut={signOut}
        busy={busy}
        error={authError}
      />

      {session && (
        <>
          <PurchaseOrderPanel
            key={refreshKey}
            purchaseOrder={purchaseOrder}
            onLoaded={setPurchaseOrder}
          />

          <ReceiptForm
            purchaseOrder={purchaseOrder}
            canReceive={session.canReceive}
            onPosted={handlePosted}
          />

          <ReceiptPanel receiptId={postedReceiptId} />

          <InventoryPanel refreshKey={refreshKey} />

          <LocationsPanel />
        </>
      )}
    </main>
  )
}
