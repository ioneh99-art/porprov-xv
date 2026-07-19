'use client'
import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, UserPlus, Search } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { usePentathlonRealtime, RealtimeStatusBadge } from '@/hooks/usePentathlonRealtime'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface AtletLineup {
  id: number
  nama_lengkap: string
  gender: string
  kontingen_id: number
  kontingen_nama: string
  status_registrasi: string
  registered: boolean
}

export default function PentathlonLineupPage() {
  const [me, setMe] = useState<any>(null)
  const [atletList, setAtletList] = useState<AtletLineup[]>([])
  const [nomorIds, setNomorIds] = useState<{ L: number[]; P: number[] }>({ L: [], P: [] })
  const [genderFilter, setGenderFilter] = useState<'L' | 'P'>('L')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<number | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadData = useCallback(async () => {
    try {
      const meData = me ?? await fetch('/api/auth/me').then(r => r.json())
      if (!me) setMe(meData)
      const cabor_id = meData?.cabor_id
      if (!cabor_id) return

      const { data: nomorList } = await supabase
        .from('nomor_pertandingan')
        .select('id, nama, gender')
        .eq('cabor_id', cabor_id)

      const nomorByGender: { L: number[]; P: number[] } = { L: [], P: [] }
      nomorList?.forEach(n => {
        if (n.nama.includes('Relay')) return
        if (n.gender === 'L') nomorByGender.L.push(n.id)
        else if (n.gender === 'P') nomorByGender.P.push(n.id)
      })
      setNomorIds(nomorByGender)

      const { data: atlets } = await supabase
        .from('atlet')
        .select('id, nama_lengkap, gender, kontingen_id, status_registrasi, kontingen(nama)')
        .eq('cabor_id', cabor_id)
        .order('status_registrasi', { ascending: true })
        .order('nama_lengkap')

      const individualNomorIds = nomorList?.filter(n => n.nama.includes('Individual')).map(n => n.id) ?? []
      const { data: kualifikasi } = individualNomorIds.length > 0
        ? await supabase
            .from('kualifikasi_atlet')
            .select('atlet_id, nomor_id')
            .in('nomor_id', individualNomorIds)
            .neq('status', 'Dibatalkan')
        : { data: [] }

      const registeredSet = new Set(kualifikasi?.map(k => k.atlet_id) ?? [])

      setAtletList((atlets ?? []).map(a => ({
        id: a.id,
        nama_lengkap: a.nama_lengkap,
        gender: a.gender,
        kontingen_id: a.kontingen_id,
        kontingen_nama: (a.kontingen as any)?.nama ?? '-',
        status_registrasi: a.status_registrasi ?? 'Draft',
        registered: registeredSet.has(a.id),
      })))
    } catch (e: any) {
      showToast(`Error: ${e.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [me])

  useEffect(() => { loadData() }, [])

  const { realtimeStatus, lastUpdate } = usePentathlonRealtime({
    cabor_id: me?.cabor_id,
    tables: ['kualifikasi_atlet', 'atlet'],
    onUpdate: loadData,
  })

  const handleRegister = async (atlet: AtletLineup) => {
    if (!confirm(`Daftarkan ${atlet.nama_lengkap} ke 5 nomor Pentathlon (Individual + 4 disiplin)?`)) return
    setProcessing(atlet.id)
    try {
      const targetNomors = atlet.gender === 'L' ? nomorIds.L : nomorIds.P
      const inserts = targetNomors.map(nomor_id => ({
        nomor_id, atlet_id: atlet.id, kontingen_id: atlet.kontingen_id,
        status: 'Dikonfirmasi',
        didaftarkan_oleh: me.id, dikonfirmasi_oleh: me.id,
        dikonfirmasi_at: new Date().toISOString(),
      }))
      const res = await fetch('/api/operator/kualifikasi', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'upsert', rows: inserts }),
      })
      if (!res.ok) throw new Error((await res.json().catch(()=>({})))?.error || 'Gagal daftar')
      showToast(`✅ ${atlet.nama_lengkap} terdaftar di ${targetNomors.length} nomor`)
    } catch (e: any) {
      showToast(`Error: ${e.message}`, 'error')
    } finally {
      setProcessing(null)
    }
  }

  const handleUnregister = async (atlet: AtletLineup) => {
    if (!confirm(`Batalkan pendaftaran ${atlet.nama_lengkap}?`)) return
    setProcessing(atlet.id)
    try {
      const targetNomors = atlet.gender === 'L' ? nomorIds.L : nomorIds.P
      const res = await fetch('/api/operator/kualifikasi', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'update', match: { atlet_id: atlet.id, nomor_ids: targetNomors }, set: { status: 'Dibatalkan' } }),
      })
      if (!res.ok) throw new Error((await res.json().catch(()=>({})))?.error || 'Gagal batal')
      showToast(`❌ Pendaftaran dibatalkan`)
    } catch (e: any) {
      showToast(`Error: ${e.message}`, 'error')
    } finally {
      setProcessing(null)
    }
  }

  const handleRegisterAll = async () => {
    const unregistered = atletList.filter(a =>
      a.gender === genderFilter && !a.registered &&
      (statusFilter === 'all' || a.status_registrasi === statusFilter)
    )
    if (unregistered.length === 0) {
      showToast('Semua atlet sudah terdaftar')
      return
    }
    if (!confirm(`Daftarkan ${unregistered.length} atlet ${genderFilter === 'L' ? 'Putra' : 'Putri'} sekaligus?`)) return
    setLoading(true)
    try {
      const targetNomors = genderFilter === 'L' ? nomorIds.L : nomorIds.P
      const inserts: any[] = []
      unregistered.forEach(a => {
        targetNomors.forEach(nomor_id => {
          inserts.push({
            nomor_id, atlet_id: a.id, kontingen_id: a.kontingen_id,
            status: 'Dikonfirmasi',
            didaftarkan_oleh: me.id, dikonfirmasi_oleh: me.id,
            dikonfirmasi_at: new Date().toISOString(),
          })
        })
      })
      const res = await fetch('/api/operator/kualifikasi', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'upsert', rows: inserts }),
      })
      if (!res.ok) throw new Error((await res.json().catch(()=>({})))?.error || 'Gagal daftar')
      showToast(`✅ ${unregistered.length} atlet terdaftar (${inserts.length} entries)`)
    } catch (e: any) {
      showToast(`Error: ${e.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const filtered = atletList.filter(a => {
    if (a.gender !== genderFilter) return false
    if (statusFilter !== 'all' && a.status_registrasi !== statusFilter) return false
    if (search && !a.nama_lengkap.toLowerCase().includes(search.toLowerCase())
       && !a.kontingen_nama.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Lineup Atlet Pentathlon</h1>
          <p className="text-slate-500 text-xs mt-1">
            1 klik = daftar ke 5 nomor sekaligus (Individual + 4 disiplin). Realtime sync antar operator.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RealtimeStatusBadge status={realtimeStatus} lastUpdate={lastUpdate} />
          <button onClick={handleRegisterAll}
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-semibold text-xs px-4 py-2 rounded-lg transition-all">
            <UserPlus size={13} />
            Daftarkan Semua ({genderFilter === 'L' ? 'Putra' : 'Putri'})
          </button>
        </div>
      </div>

      {toast && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-xs ${
          toast.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>{toast.msg}</div>
      )}

      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2">
          {(['L', 'P'] as const).map(g => (
            <button key={g} onClick={() => setGenderFilter(g)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                genderFilter === g
                  ? g === 'L' ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                    : 'bg-pink-500/20 border border-pink-500/30 text-pink-400'
                  : 'bg-slate-800/40 text-slate-500 hover:text-slate-300'
              }`}>
              {g === 'L' ? '👨 Putra' : '👩 Putri'} ({atletList.filter(a => a.gender === g).length})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-yellow-500">
            <option value="all">Semua Status</option>
            <option value="Verified">Verified</option>
            <option value="Menunggu Admin">Menunggu Admin</option>
            <option value="Posted">Posted</option>
            <option value="Ditolak Admin">Ditolak Admin</option>
          </select>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" placeholder="Cari nama / kontingen..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-yellow-500 w-56" />
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left text-slate-500 text-[10px] uppercase tracking-wider font-medium px-5 py-3">Nama Atlet</th>
              <th className="text-left text-slate-500 text-[10px] uppercase tracking-wider font-medium px-4 py-3">Kontingen</th>
              <th className="text-center text-slate-500 text-[10px] uppercase tracking-wider font-medium px-4 py-3">Status Registrasi</th>
              <th className="text-center text-slate-500 text-[10px] uppercase tracking-wider font-medium px-4 py-3">Lineup</th>
              <th className="text-right text-slate-500 text-[10px] uppercase tracking-wider font-medium px-5 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-slate-600 text-xs">Tidak ada atlet</td></tr>
            ) : filtered.map(a => (
              <tr key={a.id} className={`border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors ${a.status_registrasi !== 'Verified' ? 'opacity-80' : ''}`}>
                <td className="px-5 py-3 text-slate-200 text-xs font-medium">{a.nama_lengkap}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{a.kontingen_nama}</td>
                <td className="px-4 py-3 text-center"><StatusBadge status={a.status_registrasi} /></td>
                <td className="px-4 py-3 text-center">
                  {a.registered ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      <CheckCircle size={11} />
                      Terdaftar
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[10px] bg-slate-700/50 text-slate-400 px-2.5 py-1 rounded-full">Belum</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  {a.registered ? (
                    <button onClick={() => handleUnregister(a)} disabled={processing === a.id}
                      className="text-red-400 hover:text-red-300 text-xs px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-all">
                      Batalkan
                    </button>
                  ) : (
                    <button onClick={() => handleRegister(a)} disabled={processing === a.id}
                      className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-900 font-semibold text-xs px-3 py-1.5 rounded-lg transition-all">
                      {processing === a.id
                        ? <div className="w-3 h-3 border border-slate-900 border-t-transparent rounded-full animate-spin" />
                        : <UserPlus size={11} />}
                      Daftarkan
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-slate-800 px-5 py-3 bg-slate-800/20 text-xs text-slate-500">
          {filtered.filter(a => a.registered).length} dari {filtered.length} atlet sudah terdaftar
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: any = {
    'Verified': { bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', label: '✓ Verified' },
    'Menunggu Admin': { bg: 'bg-amber-500/15 text-amber-400 border-amber-500/20', label: '⏳ Menunggu' },
    'Posted': { bg: 'bg-blue-500/15 text-blue-400 border-blue-500/20', label: '📤 Posted' },
    'Ditolak Admin': { bg: 'bg-red-500/15 text-red-400 border-red-500/20', label: '✗ Ditolak' },
    'Draft': { bg: 'bg-slate-500/15 text-slate-400 border-slate-500/20', label: 'Draft' },
  }
  const c = config[status] ?? config['Draft']
  return <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border ${c.bg}`}>{c.label}</span>
}
