'use client'

import { useState } from 'react'
import { X, Copy, Check, Printer, Download } from 'lucide-react'

/**
 * Generates QR code via api.qrserver.com (free, no API key, returns PNG).
 * For production: install `qrcode` npm package and generate locally.
 */
export default function QrCodeDialog({
  url, title, accentColor = '#F59E0B', onClose,
}: {
  url: string
  title: string
  accentColor?: string
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  // QR via api.qrserver.com (free service, returns PNG image)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=20&data=${encodeURIComponent(url)}`

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      alert(`URL: ${url}`)
    }
  }

  const printQr = () => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`
      <!DOCTYPE html>
      <html><head><title>QR — ${title}</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 40px; }
        h1 { color: ${accentColor}; margin-bottom: 8px; }
        .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
        img { border: 4px solid ${accentColor}; padding: 16px; background: white; }
        .url { font-family: monospace; font-size: 11px; color: #666; margin-top: 16px; word-break: break-all; }
        .footer { margin-top: 32px; font-size: 10px; color: #aaa; }
        @media print { body { padding: 20px; } }
      </style>
      </head><body>
        <h1>${title}</h1>
        <div class="subtitle">PentaScore Live Display</div>
        <img src="${qrUrl}" width="400" height="400" alt="QR" />
        <div class="url">${url}</div>
        <div class="footer">Scan QR untuk pantau klasemen real-time · powered by PentaScore Indonesia</div>
      </body></html>
    `)
    w.document.close()
    setTimeout(() => w.print(), 500)
  }

  const downloadQr = async () => {
    try {
      const r = await fetch(qrUrl)
      const blob = await r.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `qr_${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (e) {
      alert('Download failed, klik kanan gambar QR untuk save manual')
    }
  }

  return (
    <div
      className="fixed inset-0 bg-slate-950/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-w-md w-full bg-slate-900 border rounded-xl shadow-2xl overflow-hidden"
        style={{ borderColor: `${accentColor}50` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: `${accentColor}30`, backgroundColor: `${accentColor}08` }}
        >
          <div className="min-w-0">
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: accentColor }}>
              QR Code
            </h3>
            <p className="text-xs text-slate-400 truncate">{title}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1 transition">
            <X size={16} />
          </button>
        </div>

        {/* QR */}
        <div className="p-6 text-center bg-white">
          <img
            src={qrUrl}
            alt="QR Code"
            width={280}
            height={280}
            className="mx-auto"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        {/* URL display */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-2 bg-slate-950/40 border border-slate-800 rounded px-3 py-2">
            <code className="flex-1 text-xs text-slate-300 truncate font-mono">{url}</code>
            <button
              onClick={copyUrl}
              className="p-1 text-slate-400 hover:text-white transition"
              title="Copy URL"
            >
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            </button>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={printQr}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded flex items-center justify-center gap-1.5 transition"
            >
              <Printer size={11} /> Print
            </button>
            <button
              onClick={downloadQr}
              className="px-3 py-2 text-xs font-bold rounded flex items-center justify-center gap-1.5 transition"
              style={{ backgroundColor: accentColor, color: '#1F2937' }}
            >
              <Download size={11} /> Download PNG
            </button>
          </div>

          <p className="text-[10px] text-slate-500 text-center">
            Scan QR pakai HP untuk akses klasemen live tanpa login
          </p>
        </div>
      </div>
    </div>
  )
}
