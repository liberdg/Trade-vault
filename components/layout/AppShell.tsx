'use client'
import { useEffect } from 'react'
import { useTradingStore } from '@/store/tradingStore'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { Toaster } from 'react-hot-toast'
import { DataProvenanceBanner } from './DataProvenanceBanner'

export function AppShell({ children }: { children: React.ReactNode }) {
  const loadAll = useTradingStore(s => s.loadAll)

  useEffect(() => {
    import('@/lib/seedData').then(m => m.seedDemoData()).then(() => loadAll())
  }, [loadAll])

  return (
    <div className="flex h-screen overflow-hidden bg-void bg-grid">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.04] blur-3xl"
          style={{ background: 'radial-gradient(circle, #00d4ff, transparent)' }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-[0.03] blur-3xl"
          style={{ background: 'radial-gradient(circle, #00ff88, transparent)' }} />
      </div>

      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto p-6 relative">
          <div className="mb-6">
            <DataProvenanceBanner />
          </div>
          {children}
        </main>
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0d1825',
            border: '1px solid rgba(0,212,255,0.2)',
            color: '#e0eaf4',
            fontFamily: 'Space Grotesk',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#00ff88', secondary: '#020408' } },
          error: { iconTheme: { primary: '#ff3355', secondary: '#020408' } },
        }}
      />
    </div>
  )
}
