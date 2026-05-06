import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PORPROV XV Jawa Barat 2026',
  description: 'Sistem Manajemen Atlet PORPROV XV',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-slate-950 text-white antialiased">{children}</body>
    </html>
  )
}