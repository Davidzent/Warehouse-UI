import { useState } from 'react'
import { useAuth } from './auth/useAuth'
import { LoginPanel } from './components/LoginPanel'
import { PurchaseOrderPanel } from './components/PurchaseOrderPanel'
import { ReceiptForm } from './components/ReceiptForm'
import { ReceiptPanel } from './components/ReceiptPanel'
import { LocationsPanel } from './components/LocationsPanel'
import { InventoryPanel } from './components/InventoryPanel'
import { ThemeToggle } from './components/ThemeToggle'
import type { PurchaseOrderDetail } from './api/types'

/**
 * Inbound receiving screen.
 */
export default function App() {
  const { session, signIn, signOut, error: authError, busy, waking } = useAuth()
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
    <>
      <header className="topbar">
        <h1 className="brand">
          Warehouse <span>Receiving</span>
        </h1>

        <div className="topbar-actions">
          <ThemeToggle />

          {session && (
            <div className="session">
              <span>
                {session.username}{' '}
                {session.roles.map((role) => (
                  <span key={role} className="pill">
                    {role}
                  </span>
                ))}
              </span>
              <button onClick={signOut}>Sign out</button>
            </div>
          )}
        </div>
      </header>

      <div className="workspace">
        <div className="stack">
          {session ? (
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
            </>
          ) : (
            <LoginPanel onSignIn={signIn} busy={busy} error={authError} waking={waking} />
          )}
        </div>

        {session && (
          <aside className="stack">
            <InventoryPanel refreshKey={refreshKey} />
            <LocationsPanel />
          </aside>
        )}
      </div>
    </>
  )
}
