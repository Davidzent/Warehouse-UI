import { useState } from 'react'
import { useAuth } from './auth/useAuth'
import { LoginPanel } from './components/LoginPanel'
import { PurchaseOrderPanel } from './components/PurchaseOrderPanel'
import { ReceiptForm } from './components/ReceiptForm'
import { InventoryPanel } from './components/InventoryPanel'
import type { PurchaseOrderDetail } from './api/types'

/**
 * Inbound receiving screen.
 */
export default function App() {
  const { session, signIn, signOut, error: authError, busy } = useAuth()
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderDetail | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Bump after a successful post so inventory refetches and the PO panel
  // remounts, reloading its running totals and status.
  function handlePosted() {
    setRefreshKey((k) => k + 1)
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
            token={session.token}
            purchaseOrder={purchaseOrder}
            onLoaded={setPurchaseOrder}
          />

          <ReceiptForm
            token={session.token}
            purchaseOrder={purchaseOrder}
            canReceive={session.canReceive}
            onPosted={handlePosted}
          />

          <InventoryPanel token={session.token} refreshKey={refreshKey} />
        </>
      )}
    </main>
  )
}
