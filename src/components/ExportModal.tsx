import { useState, useMemo } from 'react'
import { Download, X, FileSpreadsheet, CheckCircle, Filter, Users } from 'lucide-react'

interface Atlet {
  id: number; nama_lengkap: string; no_ktp: string; tgl_lahir: string
  gender: string; cabor_nama_raw: string; kode_asal_daerah: string
  nama_asal_daerah: string; no_registrasi_koni: number|null
  status_registrasi: string; ukuran_kemeja: string|null
  ukuran_sepatu: string|null; nama_bank: string|null
  no_rekening: string|null; catatan_verifikasi: string|null
  tes_fisik_rating?: string|null
  tes_fisik_persen?: number|null
  tes_fisik_status?: string|null
  tes_fisik_kategori?: string|null
}

interface Props {
  data:               Atlet[]
  onClose:            () => void
  kontingen?:         string
  kodeWilayahPrefix?: string
  primaryColor?:      string
}

type StatusFilter = 'semua'|'Verified'|'Menunggu Admin'|'Ditolak Admin'|'Posted'

const STATUS_OPTS = [
  { value:'semua',          label:'Semua Status',    icon:'📋', color:'rgba(255,255,255,0.4)' },
  { value:'Verified',       label:'Verified',        icon:'✅', color:'#4ade80' },
  { value:'Menunggu Admin', label:'Menunggu Admin',  icon:'⏳', color:'#fbbf24' },
  { value:'Posted',         label:'Posted',          icon:'📌', color:'#60a5fa' },
  { value:'Ditolak Admin',  label:'Ditolak Admin',   icon:'❌', color:'#f87171' },
]

export function ExportModal({
  data,
  onClose,
  kontingen         = 'Kabupaten Bogor',
  kodeWilayahPrefix = '3201',
  primaryColor      = '#00ffaa',
}: Props) {
  const ACCENT = primaryColor

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Verified')
  const [caborFilter,  setCaborFilter]  = useState<string>('semua')
  const [isExporting,  setIsExporting]  = useState(false)
  const [done,         setDone]         = useState(false)

  const caborList = useMemo(()=>{
    const set = new Set(data.map(a=>a.cabor_nama_raw||'Belum Ditentukan'))
    return ['semua', ...Array.from(set).sort()]
  },[data])

  const previewData = useMemo(()=>{
    let filtered = [...data]
    if (statusFilter !== 'semua') filtered = filtered.filter(a=>a.status_registrasi===statusFilter)
    if (caborFilter  !== 'semua') filtered = filtered.filter(a=>(a.cabor_nama_raw||'Belum Ditentukan')===caborFilter)
    return filtered
  },[data, statusFilter, caborFilter])

  const perCabor = useMemo(()=>{
    const map: Record<string, number> = {}
    previewData.forEach(a=>{ const c=a.cabor_nama_raw||'Belum Ditentukan'; map[c]=(map[c]||0)+1 })
    return Object.entries(map).sort((a,b)=>b[1]-a[1])
  },[previewData])

  const hitungUmur = (tgl: string) => {
    if (!tgl) return 0
    return Math.floor((Date.now()-new Date(tgl).getTime())/(365.25*24*3600*1000))
  }

  const isLokal = (kode: string) => kode?.startsWith(kodeWilayahPrefix)

  async function handleExport() {
    if (previewData.length === 0) return
    setIsExporting(true)

    try {
      const XLSX = await import('xlsx')

      // ── Sheet 1: Data Atlet ──────────────────────────────────
      const rows = previewData.map((a, i) => ({
        'No':                i + 1,
        'Nama Lengkap':      a.nama_lengkap,
        'No KTP / NIK':      a.no_ktp || '',
        'Tgl Lahir':         a.tgl_lahir || '',
        'Usia':              a.tgl_lahir ? hitungUmur(a.tgl_lahir) : '',
        'Gender':            a.gender === 'L' ? 'Laki-laki' : a.gender === 'P' ? 'Perempuan' : '',
        'Cabang Olahraga':   a.cabor_nama_raw || '',
        'Asal Daerah':       a.nama_asal_daerah || '',
        'Kode Wilayah':      a.kode_asal_daerah || '',
        'Status Registrasi': a.status_registrasi || '',
        'No Reg KONI':       a.no_registrasi_koni || '',
        'Rating Tes Fisik':  a.tes_fisik_rating || 'Belum Tes',
        'Skor Tes Fisik (%)':a.tes_fisik_persen != null ? a.tes_fisik_persen : '',
        'Kategori Fisik':    a.tes_fisik_kategori || '',
        'Status Tes Fisik':  a.tes_fisik_status || '',
        'Ukuran Kemeja':     a.ukuran_kemeja || '',
        'Ukuran Sepatu':     a.ukuran_sepatu || '',
        'Bank':              a.nama_bank || '',
        'No Rekening':       a.no_rekening || '',
        'Catatan':           a.catatan_verifikasi || '',
      }))

      const ws1 = XLSX.utils.json_to_sheet(rows)
      ws1['!cols'] = [
        {wch:5},{wch:30},{wch:20},{wch:12},{wch:6},{wch:10},
        {wch:25},{wch:20},{wch:14},{wch:18},{wch:14},
        {wch:18},{wch:18},{wch:16},{wch:16},
        {wch:14},{wch:14},{wch:12},{wch:18},{wch:30},
      ]

      // ── Sheet 2: Rekap per Cabor ──────────────────────────────
      const rekapRows = perCabor.map(([cabor, total], i) => {
        const ac = previewData.filter(a=>(a.cabor_nama_raw||'Belum Ditentukan')===cabor)
        const sudahTes = ac.filter(a=>a.tes_fisik_rating).length
        const kritis   = ac.filter(a=>['🚨 KRITIS','🔴 SUB-PAR'].includes(a.tes_fisik_rating||'')).length
        return {
          'No':             i+1,
          'Cabor':          cabor,
          'Total':          total,
          'Putra':          ac.filter(a=>a.gender==='L').length,
          'Putri':          ac.filter(a=>a.gender==='P').length,
          'Lokal':          ac.filter(a=>isLokal(a.kode_asal_daerah)).length,
          'Non-Lokal':      ac.filter(a=>!isLokal(a.kode_asal_daerah)).length,
          'Sudah Tes Fisik':sudahTes,
          'Belum Tes Fisik':total-sudahTes,
          'Coverage (%)':   total>0?Math.round(sudahTes/total*100):0,
          'Kritis+Sub-Par': kritis,
        }
      })

      const ws2 = XLSX.utils.json_to_sheet(rekapRows)
      ws2['!cols'] = [{wch:5},{wch:30},{wch:8},{wch:8},{wch:8},{wch:8},{wch:10},{wch:16},{wch:16},{wch:12},{wch:14}]

      // ── Sheet 3: Summary ──────────────────────────────────────
      const totalSudahTes = previewData.filter(a=>a.tes_fisik_rating).length
      const summaryRows = [
        { 'Keterangan':'Kontingen',            'Nilai':kontingen },
        { 'Keterangan':'Tanggal Export',       'Nilai':new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'}) },
        { 'Keterangan':'Filter Status',        'Nilai':statusFilter },
        { 'Keterangan':'Filter Cabor',         'Nilai':caborFilter },
        { 'Keterangan':'Total Data Export',    'Nilai':previewData.length },
        { 'Keterangan':'Total Cabor',          'Nilai':perCabor.length },
        { 'Keterangan':'Putra',                'Nilai':previewData.filter(a=>a.gender==='L').length },
        { 'Keterangan':'Putri',                'Nilai':previewData.filter(a=>a.gender==='P').length },
        { 'Keterangan':'Atlet Lokal',          'Nilai':previewData.filter(a=>isLokal(a.kode_asal_daerah)).length },
        { 'Keterangan':'Atlet Non-Lokal',      'Nilai':previewData.filter(a=>!isLokal(a.kode_asal_daerah)).length },
        { 'Keterangan':'Sudah Tes Fisik',      'Nilai':totalSudahTes },
        { 'Keterangan':'Belum Tes Fisik',      'Nilai':previewData.length-totalSudahTes },
        { 'Keterangan':'Coverage Tes Fisik',   'Nilai':previewData.length>0?`${Math.round(totalSudahTes/previewData.length*100)}%`:'-' },
        { 'Keterangan':'Tes Fisik Kritis',     'Nilai':previewData.filter(a=>['🚨 KRITIS','🔴 SUB-PAR','🟡 NEEDS WORK'].includes(a.tes_fisik_rating||'')).length },
        { 'Keterangan':'Siap Tanding',         'Nilai':previewData.filter(a=>['⭐ ELITE','✅ READY'].includes(a.tes_fisik_rating||'')).length },
      ]
      const ws3 = XLSX.utils.json_to_sheet(summaryRows)
      ws3['!cols'] = [{wch:24},{wch:30}]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws1, 'Data Atlet')
      XLSX.utils.book_append_sheet(wb, ws2, 'Rekap Cabor')
      XLSX.utils.book_append_sheet(wb, ws3, 'Summary')

      const slug      = kontingen.replace(/[^a-zA-Z0-9]/g,'').slice(0,16)
      const statusStr = statusFilter === 'semua' ? 'Semua' : statusFilter.replace(' ','_')
      const caborStr  = caborFilter  === 'semua' ? 'SemuaCabor' : caborFilter.replace(/[^a-zA-Z0-9]/g,'_').slice(0,20)
      const dateStr   = new Date().toISOString().slice(0,10)
      XLSX.writeFile(wb, `Atlet${slug}_${statusStr}_${caborStr}_${dateStr}.xlsx`)

      setDone(true)
      setTimeout(()=>{ setDone(false); onClose() }, 1500)
    } catch (e) {
      console.error('[Export error]', e)
      alert('Gagal export. Pastikan package xlsx sudah terinstall.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{background:'rgba(0,0,0,0.7)',backdropFilter:'blur(6px)'}}>
      <div className="w-full max-w-[580px] rounded-2xl overflow-hidden"
        style={{background:'#040f12',border:`1px solid ${ACCENT}30`,boxShadow:'0 25px 60px rgba(0,0,0,0.8)'}}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b"
          style={{borderColor:`${ACCENT}18`,background:`${ACCENT}08`}}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{background:`${ACCENT}18`,border:`1px solid ${ACCENT}35`}}>
              <FileSpreadsheet size={20} style={{color:ACCENT}}/>
            </div>
            <div>
              <div className="text-white font-bold text-base">Export Data Atlet</div>
              <div className="text-[11px] mt-0.5" style={{color:'rgba(255,255,255,0.35)'}}>
                {kontingen} · Format Excel (.xlsx) · 3 sheet
              </div>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl transition-all"
            style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.4)'}}>
            <X size={16}/>
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Filter Status */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
              style={{color:'rgba(255,255,255,0.4)'}}>
              <Filter size={11}/> Filter Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTS.map(s=>(
                <button key={s.value} onClick={()=>setStatusFilter(s.value as StatusFilter)}
                  className="px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all"
                  style={{
                    background: statusFilter===s.value?`${s.color}18`:'rgba(255,255,255,0.03)',
                    border:     statusFilter===s.value?`1px solid ${s.color}35`:'1px solid rgba(255,255,255,0.07)',
                    color:      statusFilter===s.value?s.color:'rgba(255,255,255,0.4)',
                  }}>
                  <div>{s.icon} {s.label}</div>
                  <div className="text-[10px] mt-0.5 font-mono" style={{color:'rgba(255,255,255,0.3)'}}>
                    {s.value==='semua'
                      ? `${data.length} atlet`
                      : `${data.filter(a=>a.status_registrasi===s.value).length} atlet`
                    }
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Filter Cabor */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
              style={{color:'rgba(255,255,255,0.4)'}}>
              <Users size={11}/> Filter Cabor
            </label>
            <select value={caborFilter} onChange={e=>setCaborFilter(e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none appearance-none cursor-pointer"
              style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.8)'}}
              onFocus={e=>e.target.style.borderColor=ACCENT}
              onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}>
              {caborList.map(c=>(
                <option key={c} value={c} style={{background:'#040f12'}}>
                  {c==='semua'?`🏅 Semua Cabor (${data.length} atlet)`:c}
                </option>
              ))}
            </select>
          </div>

          {/* Preview */}
          <div className="rounded-xl p-4"
            style={{background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.07)'}}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-bold uppercase tracking-widest" style={{color:'rgba(255,255,255,0.4)'}}>
                Preview Export
              </div>
              <div className="text-xs font-bold" style={{color:ACCENT}}>{previewData.length} atlet</div>
            </div>

            {previewData.length === 0 ? (
              <div className="text-center py-4 text-xs" style={{color:'rgba(255,255,255,0.25)'}}>
                Tidak ada data dengan filter ini
              </div>
            ) : (
              <>
                {/* Stats bar */}
                <div className="flex gap-2 mb-3 flex-wrap">
                  {[
                    {l:'Putra',        v:previewData.filter(a=>a.gender==='L').length,                          c:'#60a5fa'},
                    {l:'Putri',        v:previewData.filter(a=>a.gender==='P').length,                          c:'#f472b6'},
                    {l:'Sudah Tes',    v:previewData.filter(a=>a.tes_fisik_rating).length,                      c:'#4ade80'},
                    {l:'Belum Tes',    v:previewData.filter(a=>!a.tes_fisik_rating).length,                     c:'#fbbf24'},
                    {l:'Tes Kritis',   v:previewData.filter(a=>['🚨 KRITIS','🔴 SUB-PAR'].includes(a.tes_fisik_rating||'')).length, c:'#f87171'},
                  ].map(s=>(
                    <div key={s.l} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                      style={{background:`${s.c}12`,border:`1px solid ${s.c}20`}}>
                      <span className="font-bold text-sm" style={{color:s.c}}>{s.v}</span>
                      <span className="text-[10px]" style={{color:'rgba(255,255,255,0.35)'}}>{s.l}</span>
                    </div>
                  ))}
                </div>

                {/* Top cabor preview */}
                {perCabor.length > 0 && (
                  <div className="space-y-1.5 max-h-[100px] overflow-y-auto"
                    style={{scrollbarWidth:'thin',scrollbarColor:`${ACCENT}20 transparent`}}>
                    {perCabor.map(([cabor, total])=>(
                      <div key={cabor} className="flex items-center gap-3 text-xs">
                        <span className="text-zinc-400 flex-1 truncate">{cabor}</span>
                        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                          <div className="h-full rounded-full"
                            style={{width:`${previewData.length>0?total/previewData.length*100:0}%`,background:ACCENT}}/>
                        </div>
                        <span className="font-bold w-8 text-right" style={{color:ACCENT}}>{total}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sheet info */}
                <div className="mt-3 pt-3 border-t flex gap-2 flex-wrap" style={{borderColor:'rgba(255,255,255,0.06)'}}>
                  {[
                    {l:'Sheet 1: Data Atlet',  sub:`${previewData.length} baris · 20 kolom`},
                    {l:'Sheet 2: Rekap Cabor', sub:`${perCabor.length} cabor + tes fisik`},
                    {l:'Sheet 3: Summary',     sub:'Ringkasan kesiapan tanding'},
                  ].map(s=>(
                    <div key={s.l} className="flex-1 min-w-[140px] rounded-lg px-2.5 py-1.5"
                      style={{background:`${ACCENT}0a`,border:`1px solid ${ACCENT}20`}}>
                      <div className="text-[10px] font-bold" style={{color:ACCENT}}>{s.l}</div>
                      <div className="text-[9px]" style={{color:'rgba(255,255,255,0.3)'}}>{s.sub}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
            style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.4)'}}>
            Batal
          </button>
          <button onClick={handleExport}
            disabled={isExporting||previewData.length===0||done}
            className="flex-[2] py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{
              background: done?'rgba(74,222,128,0.15)':`${ACCENT}18`,
              border:     `1px solid ${done?'rgba(74,222,128,0.4)':ACCENT+'55'}`,
              color:      done?'#4ade80':ACCENT,
            }}>
            {done
              ? <><CheckCircle size={16}/> Berhasil!</>
              : isExporting
              ? <><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{borderColor:`${ACCENT}30`,borderTopColor:ACCENT}}/> Exporting...</>
              : <><Download size={16}/> Export {previewData.length} Atlet ke Excel</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
