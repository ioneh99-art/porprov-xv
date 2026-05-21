'use client'
// src/app/konida/atlet/kabbogor/page.tsx
// Terminal Verifikasi Atlet Kab. Bogor — Hierarki Cabor (Zinc & Emerald Theme)

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { 
  Search, ShieldAlert, CheckCircle, Clock, 
  X, User, MapPin, CreditCard, Shirt, AlertTriangle, 
  Download, FileCheck, XCircle, ChevronRight, Loader2,
  ChevronDown, Activity, Users, Award
} from 'lucide-react'

// ── INISIALISASI SUPABASE ────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// ── TYPESCRIPT INTERFACES ────────────────────────────────
interface Atlet {
  id: number;
  nama_lengkap: string;
  no_ktp: string;
  tgl_lahir: string;
  gender: string;
  cabor_nama_raw: string;
  kode_asal_daerah: string;
  nama_asal_daerah: string;
  no_registrasi_koni: number | null;
  status_registrasi: string;
  ukuran_kemeja: string;
  ukuran_sepatu: string;
  nama_bank: string;
  no_rekening: string;
  catatan_verifikasi?: string;
}

// ── HELPER FUNCTIONS ─────────────────────────────────────
const hitungUmur = (tgl_lahir: string) => {
  if (!tgl_lahir) return 0
  const diff = Date.now() - new Date(tgl_lahir).getTime()
  return Math.abs(new Date(diff).getUTCFullYear() - 1970)
}

const isCabutan = (kode: string) => {
  if (!kode) return false
  return kode !== '3201' // 3201 = KTP Kab. Bogor
}

const STATUS_CFG: Record<string, { bg: string, text: string, border: string, icon: any }> = {
  'Verified':       { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', icon: CheckCircle },
  'Menunggu Admin': { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20',   icon: Clock },
  'Ditolak Admin':  { bg: 'bg-rose-500/10',    text: 'text-rose-400',    border: 'border-rose-500/20',    icon: XCircle },
  'Draft':          { bg: 'bg-zinc-800',       text: 'text-zinc-400',    border: 'border-zinc-700',       icon: User },
}

// ── MAIN COMPONENT ───────────────────────────────────────
export default function PageAtletKabBogor() {
  const [data, setData] = useState<Atlet[]>([])
  const [loading, setLoading] = useState(true)
  
  const [search, setSearch] = useState('')
  const [expandedCabor, setExpandedCabor] = useState<string | null>(null)
  const [selectedAtlet, setSelectedAtlet] = useState<Atlet | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  // Fetch Data dari Tabel 'atlet'
  useEffect(() => {
    async function fetchAtlet() {
      try {
        const { data: atletData, error } = await supabase
          .from('atlet')
          .select('*')
          .order('created_at', { ascending: false })
          
        if (error) throw error
        if (atletData) setData(atletData as Atlet[])
      } catch (error) {
        console.error("Error fetching atlet:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchAtlet()
  }, [])

  // Kalkulasi & Grouping Data
  const { summary, groupedCabors } = useMemo(() => {
    let sum = { total: 0, verified: 0, pending: 0, ditolak: 0, cabutan: 0 }
    let caborMap: Record<string, Atlet[]> = {}

    data.forEach(a => {
      // Global Summary
      sum.total++
      if (a.status_registrasi === 'Verified') sum.verified++
      if (a.status_registrasi === 'Menunggu Admin') sum.pending++
      if (a.status_registrasi === 'Ditolak Admin') sum.ditolak++
      if (isCabutan(a.kode_asal_daerah)) sum.cabutan++

      // Grouping per Cabor
      const cabor = a.cabor_nama_raw || 'Belum Ditentukan'
      if (!caborMap[cabor]) caborMap[cabor] = []
      caborMap[cabor].push(a)
    })

    // Formatting untuk UI
    let caborList = Object.keys(caborMap).map(caborName => {
      const atletList = caborMap[caborName]
      return {
        nama: caborName,
        total: atletList.length,
        verified: atletList.filter(a => a.status_registrasi === 'Verified').length,
        pending: atletList.filter(a => a.status_registrasi === 'Menunggu Admin').length,
        ditolak: atletList.filter(a => a.status_registrasi === 'Ditolak Admin').length,
        atlet: atletList
      }
    }).sort((a, b) => b.total - a.total) // Urutkan dari pendaftar terbanyak

    // Fitur Search Cabor
    if (search) {
      caborList = caborList.filter(c => c.nama.toLowerCase().includes(search.toLowerCase()))
    }

    return { summary: sum, groupedCabors: caborList }
  }, [data, search])

  // Aksi Verifikasi: Update Database & State UI
  const handleVerify = async (id: number, status: string) => {
    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from('atlet')
        .update({ 
          status_registrasi: status, 
          catatan_verifikasi: status === 'Ditolak Admin' ? rejectNote : null 
        })
        .eq('id', id)

      if (error) throw error

      setData(prev => prev.map(a => a.id === id ? { ...a, status_registrasi: status, catatan_verifikasi: rejectNote } : a))
      setSelectedAtlet(null)
      setRejectNote('')
    } catch (error) {
      alert("Gagal mengupdate status atlet.")
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 font-sans flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a15_1px,transparent_1px),linear-gradient(to_bottom,#27272a15_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"/>

      {/* ── HEADER ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-xl border-b border-zinc-800 p-6">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <ShieldAlert className="text-emerald-500" size={28}/> Terminal Audit Atlet
            </h1>
            <p className="text-xs text-zinc-500 font-mono mt-1">Verifikasi Pendaftaran Kontingen Kabupaten Bogor</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-bold transition-colors">
            <Download size={14} className="text-emerald-400"/> Export Data (KONI Format)
          </button>
        </div>
      </div>

      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto relative z-10 space-y-6">
        
        {/* ── BAGIAN 1: DASHBOARD ANALISA & RESUME (TOP KPI) ── */}
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2 text-zinc-100 font-bold"><Users size={18} className="text-emerald-500"/> Total Registrasi Atlet</div>
              <span className="font-mono text-3xl font-light text-white">{summary.total}</span>
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-zinc-500 mb-2 uppercase font-mono font-bold">
                <span>Progress Verifikasi</span>
                <span className="text-emerald-400">{summary.total > 0 ? Math.round((summary.verified / summary.total) * 100) : 0}%</span>
              </div>
              <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${summary.total > 0 ? (summary.verified / summary.total) * 100 : 0}%` }}/>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-center shadow-lg">
            <div className="text-[11px] text-zinc-500 uppercase tracking-widest font-mono mb-2 flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400"/> Data Valid</div>
            <div className="text-4xl font-light text-white">{summary.verified}</div>
            <div className="mt-2 text-xs text-zinc-500 font-mono">Siap diterbitkan ID</div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-center shadow-lg">
            <div className="text-[11px] text-zinc-500 uppercase tracking-widest font-mono mb-2 flex items-center gap-2"><Clock size={14} className="text-amber-500"/> Menunggu Audit</div>
            <div className="text-4xl font-light text-amber-500">{summary.pending}</div>
            <div className="mt-2 text-xs text-zinc-500 font-mono">Perlu tindakan admin</div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-center shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-1 bg-rose-500/50"/>
            <div className="text-[11px] text-zinc-500 uppercase tracking-widest font-mono mb-2 flex items-center gap-2"><AlertTriangle size={14} className="text-rose-500"/> Anomali NIK</div>
            <div className="text-4xl font-light text-rose-500">{summary.cabutan}</div>
            <div className="mt-2 text-[10px] text-rose-400 font-bold uppercase tracking-wider bg-rose-500/10 px-2 py-1 rounded inline-block w-max">Atlet Cabutan / Luar</div>
          </div>
        </div>

        {/* ── BAGIAN 2: LIST DATA PER CABOR (ACCORDION) ─────── */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="text-emerald-500" size={20}/> Klasifikasi Cabor
            </h2>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
              <input 
                type="text" placeholder="Cari Cabor..." value={search} onChange={e=>setSearch(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-200 focus:border-emerald-500 outline-none font-mono transition-colors w-64"
              />
            </div>
          </div>

          {loading ? (
             <div className="py-20 flex flex-col items-center justify-center text-emerald-500">
               <Loader2 className="w-8 h-8 animate-spin mb-4" />
               <p className="font-mono text-sm tracking-widest uppercase">Menganalisa Data...</p>
             </div>
          ) : (
            <div className="space-y-3">
              {groupedCabors.map((cabor) => {
                const isExpanded = expandedCabor === cabor.nama
                return (
                  <div key={cabor.nama} className={`rounded-xl border transition-all duration-300 ${isExpanded ? 'border-emerald-500/50 bg-zinc-900/80 shadow-[0_0_20px_rgba(16,185,129,0.05)]' : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-600'}`}>
                    
                    {/* ACCORDION HEADER (Resume per Cabor) */}
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer select-none"
                      onClick={() => setExpandedCabor(isExpanded ? null : cabor.nama)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${cabor.pending > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                          <Activity size={18}/>
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-zinc-100">{cabor.nama}</h3>
                          <div className="text-xs text-zinc-500 font-mono mt-0.5">{cabor.total} Atlet Terdaftar</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="flex gap-3">
                          <span className="flex items-center gap-1.5 text-xs font-mono bg-zinc-900 px-2 py-1 rounded border border-zinc-800 text-emerald-400">
                            <CheckCircle size={12}/> {cabor.verified} Valid
                          </span>
                          {cabor.pending > 0 && (
                            <span className="flex items-center gap-1.5 text-xs font-mono bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 text-amber-400">
                              <Clock size={12}/> {cabor.pending} Pending
                            </span>
                          )}
                          {cabor.ditolak > 0 && (
                            <span className="flex items-center gap-1.5 text-xs font-mono bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20 text-rose-400">
                              <XCircle size={12}/> {cabor.ditolak} Ditolak
                            </span>
                          )}
                        </div>
                        <ChevronDown size={18} className={`text-zinc-500 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-emerald-400' : ''}`}/>
                      </div>
                    </div>

                    {/* ACCORDION BODY (Detail Tabel Atlet) */}
                    {isExpanded && (
                      <div className="border-t border-zinc-800/50 bg-zinc-950 p-4">
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar border border-zinc-800/50 rounded-lg">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-zinc-900 sticky top-0 z-10 text-[9px] uppercase tracking-widest text-zinc-500 shadow-sm border-b border-zinc-800">
                                <th className="p-3 font-bold w-12 text-center">ID</th>
                                <th className="p-3 font-bold">Profil & NIK</th>
                                <th className="p-3 font-bold">Demografi & Usia</th>
                                <th className="p-3 font-bold">Status</th>
                                <th className="p-3 font-bold text-center">Tindakan</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                              {cabor.atlet.map(a => {
                                const umur = hitungUmur(a.tgl_lahir)
                                const isCab = isCabutan(a.kode_asal_daerah)
                                const st = STATUS_CFG[a.status_registrasi] || STATUS_CFG['Draft']
                                const StatusIcon = st.icon

                                return (
                                  <tr key={a.id} className="hover:bg-zinc-800/30 transition-colors">
                                    <td className="p-3 text-center text-[11px] font-mono text-zinc-600">{a.id}</td>
                                    <td className="p-3">
                                      <div className="font-bold text-sm text-zinc-200">{a.nama_lengkap}</div>
                                      <div className="text-[10px] font-mono text-zinc-500 mt-1">{a.no_ktp}</div>
                                    </td>
                                    <td className="p-3">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[11px] font-bold ${umur > 30 ? 'text-amber-500' : 'text-zinc-300'}`}>{umur} Tahun</span>
                                        <span className="text-[9px] font-mono text-zinc-500">({a.gender || '-'})</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        {isCab ? (
                                          <span className="flex items-center gap-1 text-[9px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                                            <MapPin size={8}/> {a.nama_asal_daerah || 'Luar Daerah'}
                                          </span>
                                        ) : (
                                          <span className="text-[9px] font-bold text-zinc-500">Lokal KBR</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border ${st.bg} ${st.text} ${st.border}`}>
                                        <StatusIcon size={10}/> {a.status_registrasi}
                                      </div>
                                    </td>
                                    <td className="p-3 text-center">
                                      <button onClick={()=>setSelectedAtlet(a)} className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:border-emerald-500 hover:text-emerald-400 rounded-md text-[10px] font-bold transition-all text-zinc-400 mx-auto">
                                        Buka Dossier
                                      </button>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                  </div>
                )
              })}
              
              {groupedCabors.length === 0 && (
                <div className="p-10 text-center text-zinc-600 font-mono text-sm border border-dashed border-zinc-800 rounded-xl">Cabor tidak ditemukan.</div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── THE DOSSIER (Slide-out Drawer Tetap Dipertahankan) ── */}
      <div className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity duration-300 ${selectedAtlet ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={()=>setSelectedAtlet(null)}/>
      
      <div className={`fixed top-0 right-0 h-full w-full max-w-[500px] bg-[#09090b] border-l border-zinc-800 z-50 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${selectedAtlet ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedAtlet && (
          <>
            <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-900/50">
              <div>
                <div className="text-[10px] text-emerald-500 font-mono mb-1 uppercase tracking-widest">Dossier Intelijen</div>
                <h2 className="text-xl font-bold text-white">{selectedAtlet.nama_lengkap}</h2>
              </div>
              <button onClick={()=>setSelectedAtlet(null)} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors">
                <X size={18}/>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {selectedAtlet.status_registrasi === 'Menunggu Admin' && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3 items-start">
                  <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5"/>
                  <div>
                    <div className="text-sm font-bold text-amber-500 mb-1">Menunggu Verifikasi Pusat</div>
                    <div className="text-xs text-amber-500/70">Pastikan NIK KTP dan dokumen fisik sesuai.</div>
                  </div>
                </div>
              )}
              {selectedAtlet.catatan_verifikasi && (
                 <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex gap-3 items-start">
                   <XCircle size={18} className="text-rose-500 flex-shrink-0 mt-0.5"/>
                   <div>
                     <div className="text-sm font-bold text-rose-500 mb-1">Histori Penolakan</div>
                     <div className="text-xs text-rose-400/80 font-mono">"{selectedAtlet.catatan_verifikasi}"</div>
                   </div>
                 </div>
              )}

              {/* Data Kependudukan */}
              <div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3 border-b border-zinc-800 pb-2"><User size={14}/> Profil Kependudukan</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                    <div className="text-[9px] text-zinc-500 uppercase mb-1">Nomor Induk KTP</div>
                    <div className="text-sm font-mono font-bold text-zinc-200">{selectedAtlet.no_ktp || '-'}</div>
                  </div>
                  <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                    <div className="text-[9px] text-zinc-500 uppercase mb-1">Asal Daerah</div>
                    <div className={`text-sm font-bold ${isCabutan(selectedAtlet.kode_asal_daerah)?'text-rose-400':'text-zinc-200'}`}>{selectedAtlet.nama_asal_daerah || '-'}</div>
                  </div>
                  <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                    <div className="text-[9px] text-zinc-500 uppercase mb-1">Cabor & Gender</div>
                    <div className="text-sm font-bold text-zinc-200">{selectedAtlet.cabor_nama_raw || '-'} ({selectedAtlet.gender || '-'})</div>
                  </div>
                  <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                    <div className="text-[9px] text-zinc-500 uppercase mb-1">Usia</div>
                    <div className="text-sm font-bold text-zinc-200">{hitungUmur(selectedAtlet.tgl_lahir)} Tahun</div>
                  </div>
                </div>
              </div>

              {/* Approval Action */}
              {selectedAtlet.status_registrasi !== 'Verified' && (
                <div className="mt-8 border-t border-zinc-800 pt-6">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2 block">Catatan Penolakan (Opsional)</label>
                  <textarea 
                    value={rejectNote} onChange={e=>setRejectNote(e.target.value)} placeholder="Misal: KTP buram..." disabled={isUpdating}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 focus:border-rose-500 outline-none resize-none h-20 mb-4 disabled:opacity-50"
                  />
                  <div className="flex gap-3">
                    <button onClick={()=>handleVerify(selectedAtlet.id, 'Ditolak Admin')} disabled={isUpdating} className="flex-1 py-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 font-bold text-sm hover:bg-rose-500 hover:text-white transition-all disabled:opacity-50">
                      {isUpdating ? '...' : '❌ REJECT'}
                    </button>
                    <button onClick={()=>handleVerify(selectedAtlet.id, 'Verified')} disabled={isUpdating} className="flex-[2] py-3 rounded-lg bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                      {isUpdating ? <Loader2 className="animate-spin" size={18}/> : <FileCheck size={18}/>} 
                      {isUpdating ? 'MEMPROSES...' : 'APPROVE VALID'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 4px; }
      `}</style>
    </div>
  )
}