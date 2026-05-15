'use client'
import { useEffect, useState } from 'react'
import autoTable from 'jspdf-autotable'
import { Download, FileText, Users, Filter, Loader2 } from 'lucide-react'

export default function LaporanPage() {
  const [kontingens, setKontingens] = useState<any[]>([])
  const [selectedKontingen, setSelectedKontingen] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [preview, setPreview] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetch('/api/master/kontingens').then(r => r.json()).then(setKontingens)
  }, [])

  const loadPreview = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedKontingen) params.set('kontingen_id', selectedKontingen)
      if (selectedStatus) params.set('status', selectedStatus)
      const res = await fetch(`/api/export/atlet?${params}`)
      const data = await res.json()
      setPreview(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPreview()
  }, [selectedKontingen, selectedStatus])

  const exportPDF = async () => {
    setExporting(true)
    try {
      const jsPDF = (await import('jspdf')).default
      

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      // Header
      const kontigenNama = selectedKontingen
        ? kontingens.find(k => k.id.toString() === selectedKontingen)?.nama ?? 'Semua Kontingen'
        : 'Semua Kontingen'
      const statusLabel = selectedStatus || 'Semua Status'

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('LAPORAN DATA ATLET', 148, 15, { align: 'center' })
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('PORPROV XV JAWA BARAT 2026', 148, 22, { align: 'center' })

      doc.setFontSize(9)
      doc.text(`Kontingen: ${kontigenNama}`, 14, 32)
      doc.text(`Status: ${statusLabel}`, 14, 37)
      doc.text(`Total Atlet: ${preview.length}`, 14, 42)
      doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric'
      })}`, 200, 32, { align: 'right' })

      // Hitung statistik
      const putra = preview.filter(a => a.gender === 'L').length
      const putri = preview.filter(a => a.gender === 'P').length
      doc.text(`Putra: ${putra} | Putri: ${putri}`, 200, 37, { align: 'right' })

      // Tabel
      autoTable(doc, {
        startY: 48,
        head: [[
          'No', 'NIK', 'Nama Lengkap', 'L/P', 'Tgl Lahir',
          'Cabor', 'Kontingen', 'Status', 'No HP'
        ]],
        body: preview.map((a, i) => [
          i + 1,
          a.no_ktp,
          a.nama_lengkap,
          a.gender === 'L' ? 'L' : 'P',
          a.tgl_lahir ? new Date(a.tgl_lahir).toLocaleDateString('id-ID') : '-',
          a.cabang_olahraga?.nama ?? '-',
          a.kontingen?.nama ?? '-',
          a.status_registrasi ?? '-',
          a.telepon ?? '-',
        ]),
        styles: {
          fontSize: 7,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [27, 58, 107],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 7,
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 32 },
          2: { cellWidth: 45 },
          3: { cellWidth: 8, halign: 'center' },
          4: { cellWidth: 22, halign: 'center' },
          5: { cellWidth: 30 },
          6: { cellWidth: 30 },
          7: { cellWidth: 28 },
          8: { cellWidth: 25 },
        },
        margin: { left: 14, right: 14 },
      })

      // Footer
      // Mengakses method dari object internal jsPDF dan bypass TS dengan 'any'
      const pageCount = (doc as any).internal.getNumberOfPages()  
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setTextColor(150)
        doc.text(
          `Halaman ${i} dari ${pageCount} | Sistem Informasi Atlet PORPROV XV Jawa Barat 2026`,
          148, doc.internal.pageSize.height - 8,
          { align: 'center' }
        )
      }

      // Download
      const filename = `Laporan_Atlet_${kontigenNama.replace(/\./g, '').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`
      doc.save(filename)
    } catch (e: any) {
      alert('Gagal export PDF: ' + e.message)
    } finally {
      setExporting(false)
    }
  }

  const exportExcel = async () => {
    setExporting(true)
    try {
      const XLSX = await import('xlsx')

      const kontigenNama = selectedKontingen
        ? kontingens.find(k => k.id.toString() === selectedKontingen)?.nama ?? 'Semua'
        : 'Semua'

      const wsData = [
        ['LAPORAN DATA ATLET PORPROV XV JAWA BARAT 2026'],
        [`Kontingen: ${kontigenNama} | Status: ${selectedStatus || 'Semua'} | Total: ${preview.length} atlet`],
        [],
        [
          'No', 'NIK', 'Nama Lengkap', 'Jenis Kelamin', 'Tempat Lahir',
          'Tanggal Lahir', 'Cabor', 'Kontingen', 'Status', 'No HP', 'Email',
          'Alamat', 'Kota/Kab', 'Bank', 'No Rekening', 'NPWP',
          'BPJS Kesehatan', 'Ukuran Kemeja', 'Ukuran Celana', 'Ukuran Sepatu'
        ],
        ...preview.map((a, i) => [
          i + 1,
          a.no_ktp,
          a.nama_lengkap,
          a.gender === 'L' ? 'Putra' : 'Putri',
          a.tempat_lahir ?? '',
          a.tgl_lahir ? new Date(a.tgl_lahir).toLocaleDateString('id-ID') : '',
          a.cabang_olahraga?.nama ?? '',
          a.kontingen?.nama ?? '',
          a.status_registrasi ?? '',
          a.telepon ?? '',
          a.email ?? '',
          a.alamat ?? '',
          a.kota_kab ?? '',
          a.nama_bank ?? '',
          a.no_rekening ?? '',
          a.npwp ?? '',
          a.no_bpjs_kesehatan ?? '',
          a.ukuran_kemeja ?? '',
          a.ukuran_celana ?? '',
          a.ukuran_sepatu ?? '',
        ])
      ]

      const ws = XLSX.utils.aoa_to_sheet(wsData)
      ws['!cols'] = [
        {wch:4}, {wch:18}, {wch:30}, {wch:12}, {wch:15},
        {wch:12}, {wch:20}, {wch:20}, {wch:18}, {wch:15},
        {wch:25}, {wch:35}, {wch:18}, {wch:12}, {wch:18},
        {wch:16}, {wch:16}, {wch:12}, {wch:12}, {wch:12},
      ]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Data Atlet')

      const filename = `Laporan_Atlet_${kontigenNama.replace(/\./g, '').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.xlsx`
      XLSX.writeFile(wb, filename)
    } catch (e: any) {
      alert('Gagal export Excel: ' + e.message)
    } finally {
      setExporting(false)
    }
  }

  const stats = {
    total: preview.length,
    putra: preview.filter(a => a.gender === 'L').length,
    putri: preview.filter(a => a.gender === 'P').length,
    draft: preview.filter(a => a.status_registrasi === 'Draft').length,
    verified: preview.filter(a => a.status_registrasi === 'Verified').length,
    posted: preview.filter(a => a.status_registrasi === 'Posted').length,
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-lg font-semibold text-white">Laporan & Export Data</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Export laporan atlet dalam format PDF atau Excel
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} disabled={exporting || preview.length === 0}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs px-4 py-2.5 rounded-xl transition-all font-semibold">
            {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Export Excel
          </button>
          <button onClick={exportPDF} disabled={exporting || preview.length === 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs px-4 py-2.5 rounded-xl transition-all font-semibold">
            {exporting ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
            Export PDF
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={14} className="text-slate-400" />
          <span className="text-white text-sm font-medium">Filter Laporan</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
              Kontingen
            </label>
            <select value={selectedKontingen}
              onChange={e => setSelectedKontingen(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-all">
              <option value="">Semua Kontingen</option>
              {kontingens.map((k: any) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-1.5">
              Status Registrasi
            </label>
            <select value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-all">
              <option value="">Semua Status</option>
              <option value="Draft">Draft</option>
              <option value="Menunggu Cabor">Menunggu Cabor</option>
              <option value="Menunggu Admin">Menunggu Admin</option>
              <option value="Verified">Verified</option>
              <option value="Posted">Posted</option>
              <option value="Ditolak Cabor">Ditolak Cabor</option>
              <option value="Ditolak Admin">Ditolak Admin</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-6 gap-3 mb-5">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'Putra', value: stats.putra, color: 'text-blue-400' },
          { label: 'Putri', value: stats.putri, color: 'text-pink-400' },
          { label: 'Draft', value: stats.draft, color: 'text-slate-400' },
          { label: 'Verified', value: stats.verified, color: 'text-emerald-400' },
          { label: 'Posted', value: stats.posted, color: 'text-blue-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-slate-600 text-xs mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Preview Tabel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-slate-400" />
            <span className="text-white text-sm font-medium">
              Preview Data ({preview.length} atlet)
            </span>
          </div>
          {loading && <Loader2 size={14} className="text-blue-400 animate-spin" />}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : preview.length === 0 ? (
          <div className="text-center py-16 text-slate-600 text-sm">
            Tidak ada data
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0">
                <tr className="border-b border-slate-800 bg-slate-900">
                  {['No', 'NIK', 'Nama Lengkap', 'L/P', 'Cabor', 'Kontingen', 'Status', 'No HP'].map(h => (
                    <th key={h} className="text-left text-slate-500 text-[10px] uppercase tracking-wider font-medium px-4 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((a, i) => (
                  <tr key={a.id} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs font-mono">{a.no_ktp}</td>
                    <td className="px-4 py-2.5 text-slate-200 text-xs font-medium">{a.nama_lengkap}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium
                        ${a.gender === 'L'
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-pink-500/10 text-pink-400'}`}>
                        {a.gender === 'L' ? 'Putra' : 'Putri'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{a.cabang_olahraga?.nama ?? '-'}</td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{a.kontingen?.nama ?? '-'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium
                        ${a.status_registrasi === 'Posted' ? 'bg-blue-500/10 text-blue-400' :
                          a.status_registrasi === 'Verified' ? 'bg-emerald-500/10 text-emerald-400' :
                          a.status_registrasi?.includes('Ditolak') ? 'bg-red-500/10 text-red-400' :
                          a.status_registrasi?.includes('Menunggu') ? 'bg-amber-500/10 text-amber-400' :
                          'bg-slate-700 text-slate-400'}`}>
                        {a.status_registrasi ?? '-'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{a.telepon ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}