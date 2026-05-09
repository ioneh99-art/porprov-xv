'use client'
import { useEffect, useRef, useState } from 'react'
import { Search, Printer, Download, Filter, CreditCard, Loader2, CheckCircle } from 'lucide-react'

export default function KartuAtletPage() {
  const [kontingens, setKontingens] = useState<any[]>([])
  const [atletList, setAtletList] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [selectedKontingen, setSelectedKontingen] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({})
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/master/kontingens').then(r => r.json()).then(setKontingens)
  }, [])

  useEffect(() => {
    if (selectedKontingen) loadAtlet()
    else { setAtletList([]); setFiltered([]) }
  }, [selectedKontingen])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      atletList.filter(a =>
        a.nama_lengkap?.toLowerCase().includes(q) ||
        a.no_ktp?.includes(q)
      )
    )
  }, [search, atletList])

  const loadAtlet = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/export/kartu?kontingen_id=${selectedKontingen}`)
      const data = await res.json()
      setAtletList(Array.isArray(data) ? data : [])
      setFiltered(Array.isArray(data) ? data : [])
      setSelected(new Set())
    } finally {
      setLoading(false)
    }
  }

  const generateQR = async (atlet: any): Promise<string> => {
    if (qrCodes[atlet.no_ktp]) return qrCodes[atlet.no_ktp]
    const QRCode = await import('qrcode')
    const data = JSON.stringify({
      id: atlet.id,
      nik: atlet.no_ktp,
      nama: atlet.nama_lengkap,
      kontingen: atlet.kontingen?.nama,
      cabor: atlet.cabang_olahraga?.nama,
      event: 'PORPROV XV Jabar 2026',
    })
    const qr = await QRCode.default.toDataURL(data, {
      width: 120,
      margin: 1,
      color: { dark: '#1B3A6B', light: '#FFFFFF' }
    })
    setQrCodes(prev => ({ ...prev, [atlet.no_ktp]: qr }))
    return qr
  }

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(a => a.id)))
    }
  }

  const handlePrint = async () => {
    setPrinting(true)
    try {
      const atletToCetak = filtered.filter(a => selected.has(a.id))
      if (atletToCetak.length === 0) {
        alert('Pilih atlet yang akan dicetak dulu!')
        return
      }

      // Generate semua QR code dulu
      for (const atlet of atletToCetak) {
        await generateQR(atlet)
      }

      // Beri waktu untuk render
      await new Promise(r => setTimeout(r, 500))

      // Print
      const printContent = printRef.current?.innerHTML
      if (!printContent) return

      const printWindow = window.open('', '_blank')
      if (!printWindow) return

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Kartu Atlet PORPROV XV</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; background: white; }
            .kartu-grid {
              display: grid;
              grid-template-columns: repeat(3, 85.6mm);
              gap: 5mm;
              padding: 10mm;
            }
            .kartu {
              width: 85.6mm;
              height: 54mm;
              border: 1px solid #ccc;
              border-radius: 4mm;
              overflow: hidden;
              background: white;
              page-break-inside: avoid;
            }
            .kartu-header {
              background: #1B3A6B;
              color: white;
              padding: 2mm 3mm;
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            .kartu-header-title { font-size: 5pt; font-weight: bold; }
            .kartu-header-sub { font-size: 4pt; opacity: 0.8; }
            .kartu-header-event { font-size: 4pt; text-align: right; }
            .kartu-body {
              display: flex;
              padding: 2mm;
              gap: 2mm;
              height: calc(100% - 12mm - 7mm);
            }
            .kartu-foto {
              width: 18mm;
              height: 22mm;
              background: #f0f0f0;
              border: 1px solid #ddd;
              border-radius: 1mm;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              overflow: hidden;
            }
            .kartu-foto img { width: 100%; height: 100%; object-fit: cover; }
            .kartu-foto-placeholder {
              font-size: 18pt;
              color: #aaa;
            }
            .kartu-info { flex: 1; }
            .kartu-nama {
              font-size: 6.5pt;
              font-weight: bold;
              color: #1B3A6B;
              margin-bottom: 1mm;
              line-height: 1.2;
            }
            .kartu-row {
              font-size: 5pt;
              color: #444;
              margin-bottom: 0.5mm;
              display: flex;
              gap: 1mm;
            }
            .kartu-label { color: #888; width: 14mm; flex-shrink: 0; }
            .kartu-value { font-weight: 500; }
            .kartu-cabor {
              background: #E8F0FE;
              color: #1B3A6B;
              font-size: 5pt;
              font-weight: bold;
              padding: 0.5mm 2mm;
              border-radius: 1mm;
              margin-top: 1mm;
              display: inline-block;
            }
            .kartu-qr {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: flex-end;
              width: 16mm;
              flex-shrink: 0;
            }
            .kartu-qr img { width: 14mm; height: 14mm; }
            .kartu-qr-label { font-size: 3.5pt; color: #888; margin-top: 0.5mm; }
            .kartu-footer {
              background: #f5f5f5;
              border-top: 1px solid #eee;
              padding: 1mm 3mm;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .kartu-nik { font-size: 5pt; color: #666; font-family: monospace; }
            .kartu-status {
              font-size: 4.5pt;
              font-weight: bold;
              padding: 0.5mm 2mm;
              border-radius: 1mm;
            }
            .status-posted { background: #DBEAFE; color: #1D4ED8; }
            .status-verified { background: #D1FAE5; color: #065F46; }
            .status-other { background: #FEF3C7; color: #92400E; }
            @media print {
              @page { size: A4; margin: 0; }
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
        </html>
      `)

      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 800)

    } finally {
      setPrinting(false)
    }
  }

  const hitungUsia = (tglLahir: string | null): string => {
    if (!tglLahir) return '-'
    const today = new Date()
    const lahir = new Date(tglLahir)
    const usia = today.getFullYear() - lahir.getFullYear()
    return `${usia} tahun`
  }

  const formatTgl = (tgl: string | null): string => {
    if (!tgl) return '-'
    return new Date(tgl).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric'
    })
  }

  const atletTerpilih = filtered.filter(a => selected.has(a.id))

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-lg font-semibold text-white">Cetak Kartu Atlet</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Generate dan cetak kartu identitas atlet dengan QR code
          </p>
        </div>
        <button onClick={handlePrint}
          disabled={printing || selected.size === 0}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs px-5 py-2.5 rounded-xl transition-all font-semibold">
          {printing
            ? <><Loader2 size={13} className="animate-spin" /> Menyiapkan...</>
            : <><Printer size={13} /> Cetak {selected.size > 0 ? `(${selected.size})` : ''} Kartu</>}
        </button>
      </div>

      {/* Filter */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
              Kontingen <span className="text-red-400">*</span>
            </label>
            <select value={selectedKontingen}
              onChange={e => setSelectedKontingen(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-all">
              <option value="">-- Pilih Kontingen --</option>
              {kontingens.map((k: any) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
              Cari Atlet
            </label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="text" placeholder="Nama atau NIK..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all" />
            </div>
          </div>
        </div>
      </div>

      {/* List Atlet */}
      {selectedKontingen && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-5">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={selectAll}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all
                  ${selected.size === filtered.length && filtered.length > 0
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-slate-600'}`}>
                  {selected.size === filtered.length && filtered.length > 0 && (
                    <CheckCircle size={10} className="text-white" />
                  )}
                </div>
                Pilih Semua
              </button>
              <span className="text-slate-600 text-xs">|</span>
              <span className="text-slate-400 text-xs">{filtered.length} atlet</span>
              {selected.size > 0 && (
                <span className="text-blue-400 text-xs font-medium">
                  · {selected.size} dipilih
                </span>
              )}
            </div>
            {loading && <Loader2 size={14} className="text-blue-400 animate-spin" />}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-600 text-sm">
              Tidak ada atlet ditemukan
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-slate-900">
                  <tr className="border-b border-slate-800">
                    {['', 'NIK', 'Nama', 'L/P', 'Cabor', 'Status'].map(h => (
                      <th key={h} className="text-left text-slate-500 text-[10px] uppercase tracking-wider font-medium px-4 py-2">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => (
                    <tr key={a.id}
                      onClick={() => toggleSelect(a.id)}
                      className={`border-b border-slate-800/40 cursor-pointer transition-colors
                        ${selected.has(a.id) ? 'bg-blue-500/10' : 'hover:bg-slate-800/20'}`}>
                      <td className="px-4 py-2.5">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all
                          ${selected.has(a.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-600'}`}>
                          {selected.has(a.id) && <CheckCircle size={10} className="text-white" />}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs font-mono">{a.no_ktp}</td>
                      <td className="px-4 py-2.5 text-slate-200 text-xs font-medium">{a.nama_lengkap}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full
                          ${a.gender === 'L' ? 'bg-blue-500/10 text-blue-400' : 'bg-pink-500/10 text-pink-400'}`}>
                          {a.gender === 'L' ? 'Putra' : 'Putri'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs">{a.cabang_olahraga?.nama ?? '-'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full
                          ${a.status_registrasi === 'Posted' ? 'bg-blue-500/10 text-blue-400' :
                            a.status_registrasi === 'Verified' ? 'bg-emerald-500/10 text-emerald-400' :
                            'bg-slate-700 text-slate-400'}`}>
                          {a.status_registrasi}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Preview Kartu */}
      {atletTerpilih.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <div className="text-white text-sm font-medium">
              Preview Kartu ({atletTerpilih.length} kartu)
            </div>
            <div className="text-slate-500 text-xs mt-0.5">
              Ukuran kartu: 85.6 × 54mm (standar kartu kredit)
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-4">
              {atletTerpilih.slice(0, 6).map(a => (
                <KartuPreview
                  key={a.id}
                  atlet={a}
                  onQRGenerated={(nik, qr) => setQrCodes(prev => ({ ...prev, [nik]: qr }))}
                  qrCode={qrCodes[a.no_ktp]}
                />
              ))}
            </div>
            {atletTerpilih.length > 6 && (
              <div className="text-center text-slate-500 text-xs mt-4">
                + {atletTerpilih.length - 6} kartu lainnya akan dicetak
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden print area */}
      <div ref={printRef} style={{ display: 'none' }}>
        <div className="kartu-grid">
          {atletTerpilih.map(a => (
            <div key={a.id} className="kartu">
              <div className="kartu-header">
                <div>
                  <div className="kartu-header-title">PORPROV XV JAWA BARAT 2026</div>
                  <div className="kartu-header-sub">{a.kontingen?.nama}</div>
                </div>
                <div className="kartu-header-event">
                  <div>7 - 20 Nov 2026</div>
                  <div>{a.status_kontingen || 'Atlet'}</div>
                </div>
              </div>
              <div className="kartu-body">
                <div className="kartu-foto">
                  {a.foto_url
                    ? <img src={a.foto_url} alt={a.nama_lengkap} />
                    : <span className="kartu-foto-placeholder">👤</span>}
                </div>
                <div className="kartu-info">
                  <div className="kartu-nama">{a.nama_lengkap}</div>
                  <div className="kartu-row">
                    <span className="kartu-label">Tgl Lahir</span>
                    <span className="kartu-value">
                      {a.tgl_lahir ? new Date(a.tgl_lahir).toLocaleDateString('id-ID') : '-'}
                    </span>
                  </div>
                  <div className="kartu-row">
                    <span className="kartu-label">Gender</span>
                    <span className="kartu-value">{a.gender === 'L' ? 'Putra' : 'Putri'}</span>
                  </div>
                  <div className="kartu-row">
                    <span className="kartu-label">No HP</span>
                    <span className="kartu-value">{a.telepon || '-'}</span>
                  </div>
                  <span className="kartu-cabor">{a.cabang_olahraga?.nama || '-'}</span>
                </div>
                <div className="kartu-qr">
                  {qrCodes[a.no_ktp] && (
                    <img src={qrCodes[a.no_ktp]} alt="QR Code" />
                  )}
                  <span className="kartu-qr-label">Scan untuk verifikasi</span>
                </div>
              </div>
              <div className="kartu-footer">
                <span className="kartu-nik">NIK: {a.no_ktp}</span>
                <span className={`kartu-status ${
                  a.status_registrasi === 'Posted' ? 'status-posted' :
                  a.status_registrasi === 'Verified' ? 'status-verified' :
                  'status-other'}`}>
                  {a.status_registrasi}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Komponen preview kartu
function KartuPreview({ atlet, onQRGenerated, qrCode }: {
  atlet: any
  onQRGenerated: (nik: string, qr: string) => void
  qrCode?: string
}) {
  useEffect(() => {
    if (!qrCode) generateQR()
  }, [])

  const generateQR = async () => {
    const QRCode = await import('qrcode')
    const data = JSON.stringify({
      id: atlet.id,
      nik: atlet.no_ktp,
      nama: atlet.nama_lengkap,
      kontingen: atlet.kontingen?.nama,
      cabor: atlet.cabang_olahraga?.nama,
      event: 'PORPROV XV Jabar 2026',
    })
    const qr = await QRCode.default.toDataURL(data, {
      width: 80, margin: 1,
      color: { dark: '#1B3A6B', light: '#FFFFFF' }
    })
    onQRGenerated(atlet.no_ktp, qr)
  }

  return (
    <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-800/50"
      style={{ aspectRatio: '85.6/54' }}>
      {/* Header kartu */}
      <div className="px-3 py-1.5 flex items-center justify-between"
        style={{ background: '#1B3A6B' }}>
        <div>
          <div className="text-white text-[8px] font-bold">PORPROV XV JAWA BARAT 2026</div>
          <div className="text-blue-200 text-[7px]">{atlet.kontingen?.nama}</div>
        </div>
        <div className="text-right">
          <div className="text-blue-200 text-[7px]">7-20 Nov 2026</div>
          <div className="text-white text-[7px] font-medium">{atlet.status_kontingen || 'Atlet'}</div>
        </div>
      </div>

      {/* Body kartu */}
      <div className="flex gap-2 p-2 bg-white flex-1">
        {/* Foto */}
        <div className="w-12 h-14 bg-slate-100 border border-slate-200 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
          {atlet.foto_url
            ? <img src={atlet.foto_url} alt="" className="w-full h-full object-cover" />
            : <span className="text-2xl">👤</span>}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-bold text-slate-800 leading-tight mb-1 truncate">
            {atlet.nama_lengkap}
          </div>
          <div className="text-[7px] text-slate-500 space-y-0.5">
            <div>{atlet.tgl_lahir ? new Date(atlet.tgl_lahir).toLocaleDateString('id-ID') : '-'}</div>
            <div>{atlet.gender === 'L' ? 'Putra' : 'Putri'}</div>
            <div className="text-[7px] font-bold text-blue-700 bg-blue-50 px-1 py-0.5 rounded inline-block mt-1">
              {atlet.cabang_olahraga?.nama || '-'}
            </div>
          </div>
        </div>

        {/* QR */}
        <div className="flex flex-col items-center justify-end flex-shrink-0">
          {qrCode
            ? <img src={qrCode} alt="QR" className="w-10 h-10" />
            : <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              </div>}
          <div className="text-[6px] text-slate-400 mt-0.5">Scan</div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-2 py-1 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <span className="text-[7px] text-slate-500 font-mono">{atlet.no_ktp}</span>
        <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded
          ${atlet.status_registrasi === 'Posted' ? 'bg-blue-100 text-blue-700' :
            atlet.status_registrasi === 'Verified' ? 'bg-green-100 text-green-700' :
            'bg-yellow-100 text-yellow-700'}`}>
          {atlet.status_registrasi}
        </span>
      </div>
    </div>
  )
}