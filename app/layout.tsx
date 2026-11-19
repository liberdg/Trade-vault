import type { Metadata } from 'next'
import './globals.css'
import { AppShell } from '@/components/layout/AppShell'

export const metadata: Metadata = {
  title: 'SMRT Trading Analytics',
  description: 'Market intelligence and trading analytics',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className="bg-void min-h-screen">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
