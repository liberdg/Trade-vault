'use client'
import { useEffect } from 'react'
import { useTradingStore } from '@/store/tradingStore'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { Toaster } from 'react-hot-toast'

export function AppShell({ children }: { children: React.ReactNode }) {
  const loadAll = useTradingStore(s => s.loadAll)

  useEffect(() => {
    loadAll()
  }, [loadAll])

  return (
    <div className="flex h-screen overflow-hidden bg-void">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="relative flex-1 overflow-auto px-4 py-5 sm:px-5 lg:px-6">
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
