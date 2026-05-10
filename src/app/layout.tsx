import type { Metadata } from 'next'
// @ts-ignore
import './globals.css'

export const metadata: Metadata = {
  title: 'PORPROV XV Jawa Barat 2026',
  description: 'Sistem Informasi Atlet PORPROV XV Jawa Barat 2026',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="PORPROV XV" />
        <meta name="theme-color" content="#1B3A6B" />
      </head>
      <body>{children}</body>
    </html>
  )
}