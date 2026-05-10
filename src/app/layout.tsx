import type { Metadata } from 'next'
import '@/globals.css'

export const metadata: Metadata = {
  title: 'PORPROV XV Jawa Barat 2026',
  description: 'Sistem Informasi Atlet PORPROV XV Jawa Barat 2026',
  manifest: '/manifest.json',
  themeColor: '#1B3A6B',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PORPROV XV',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  icons: {
    apple: '/logo-porprov.png',
  },
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
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="PORPROV XV" />
        <meta name="theme-color" content="#1B3A6B" />
      </head>
      <body>{children}</body>
    </html>
  )
}