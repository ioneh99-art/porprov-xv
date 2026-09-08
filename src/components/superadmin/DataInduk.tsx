'use client'
// src/components/superadmin/DataInduk.tsx
// Klasemen Medali & Master Cabor — dipindah dari profil Kab. Bandung.
//
// Alasan pemindahan: keduanya BUKAN data kontingen. Klasemen memuat perolehan
// medali 27 kontingen se-Jawa Barat, dan Master Cabor adalah daftar induk yang
// dipakai seluruh aplikasi — mengubah satu nama cabor mengubahnya untuk semua
// kontingen sekaligus. Tidak ada kepentingan Kab. Bandung di sini.

import { useState, useEffect } from 'react'
import {
  Medal, Layers, Save, RefreshCw, Search, Plus, Check, X, Loader2,
  Info, Edit3, ToggleLeft, ToggleRight,
} from 'lucide-react'

const ACCENT = '#ef4444'

function Spinner({ size=16, color=ACCENT }: { size?: number; color?: string }) {
  return <Loader2 size={size} className="animate-spin" style={{ color }} />
}
function Card({ children, className='' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.03] ${className}`}>{children}</div>
  )
}
function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-4 border-b border-white/[0.07]">{children}</div>
}
function LoadingSkel() {
  return (
    <div className="space-y-2 p-5">
      {[0,1,2,3,4].map(i => (
        <div key={i} className="h-10 rounded-lg bg-white/[0.04] animate-pulse" />
      ))}
    </div>
  )
}

type KlasemenRow = { id: number; kontingen_id: number; emas: number; perak: number; perunggu: number; total: number; kontingen: { id: number; nama: string } }

function KlasemenTab() {
  const [rows,    setRows]    = useState<KlasemenRow[]>([])
  const [edits,   setEdits]   = useState<Record<number, {emas:number;perak:number;perunggu:number}>>({})
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [err,     setErr]     = useState('')

  async function load() {
    setLoading(true); setErr('')
    try {
      const res = await fetch('/api/admin/data-gateway?module=klasemen')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRows(data); setEdits({})
    } catch(e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  function setField(id: number, field: 'emas'|'perak'|'perunggu', val: number) {
    const row = rows.find(r => r.id === id)
    if (!row) return
    setEdits(prev => ({
      ...prev,
      [id]: {
        emas:     field==='emas'     ? val : (prev[id]?.emas     ?? row.emas),
        perak:    field==='perak'    ? val : (prev[id]?.perak    ?? row.perak),
        perunggu: field==='perunggu' ? val : (prev[id]?.perunggu ?? row.perunggu),
      }
    }))
  }

  function getVal(row: KlasemenRow, field: 'emas'|'perak'|'perunggu') {
    return edits[row.id]?.[field] ?? row[field]
  }

  function getTotal(row: KlasemenRow) {
    const e = edits[row.id]?.emas     ?? row.emas
    const p = edits[row.id]?.perak    ?? row.perak
    const b = edits[row.id]?.perunggu ?? row.perunggu
    return e + p + b
  }

  const hasChanges = Object.keys(edits).length > 0

  async function saveAll() {
    setSaving(true); setErr(''); setSaved(false)
    try {
      const payload = rows.map(r => ({
        id:           r.id,
        kontingen_id: r.kontingen_id,
        emas:         edits[r.id]?.emas     ?? r.emas,
        perak:        edits[r.id]?.perak    ?? r.perak,
        perunggu:     edits[r.id]?.perunggu ?? r.perunggu,
      }))
      const res = await fetch('/api/admin/data-gateway', {
        method: 'PATCH',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ module:'klasemen', data: payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSaved(true); await load()
      setTimeout(() => setSaved(false), 3000)
    } catch(e: any) { setErr(e.message) }
    finally { setSaving(false) }
  }

  // Sort by total emas desc
  const sorted = [...rows].sort((a, b) => {
    const ae = edits[a.id]?.emas ?? a.emas, be = edits[b.id]?.emas ?? b.emas
    const ap = edits[a.id]?.perak ?? a.perak, bp = edits[b.id]?.perak ?? b.perak
    return be - ae || bp - ap
  })

  if (loading) return <LoadingSkel/>

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Klasemen Medali Global</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">Edit langsung — klik sel angka untuk mengubah. Perubahan disimpan massal.</p>
        </div>
        <div className="flex items-center gap-2">
          {err && <span className="text-[11px] text-red-400 bg-red-500/10 px-3 py-1.5 rounded-xl">{err}</span>}
          {saved && <span className="text-[11px] text-green-400 bg-green-500/10 px-3 py-1.5 rounded-xl">✓ Tersimpan</span>}
          {hasChanges && <span className="text-[11px] text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl">{Object.keys(edits).length} baris diubah</span>}
          <button onClick={load} className="p-2 rounded-xl hover:bg-white/5 transition-colors" title="Refresh">
            <RefreshCw size={14} className="text-zinc-400"/>
          </button>
          <button onClick={saveAll} disabled={saving || !hasChanges}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 transition-all"
            style={{ background: hasChanges?'rgba(74,222,128,0.15)':'rgba(255,255,255,0.04)', border:`1px solid ${hasChanges?'rgba(74,222,128,0.35)':'rgba(255,255,255,0.1)'}`, color: hasChanges?'#22d3ee':'rgba(255,255,255,0.3)' }}>
            {saving ? <><Spinner size={14} color="#22d3ee"/> Menyimpan...</> : <><Save size={14}/> Simpan Semua</>}
          </button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto" style={{ scrollbarWidth:'thin', scrollbarColor:`${ACCENT}25 transparent` }}>
          <table className="w-full border-collapse">
            <thead>
              <tr className="sticky top-0 z-10" style={{ background:'rgba(2,10,20,0.98)', borderBottom:'2px solid rgba(255,255,255,0.08)' }}>
                <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-widest text-zinc-500 w-10">#</th>
                <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-widest text-zinc-500">Kontingen</th>
                {[{l:'Emas',c:'#fbbf24'},{l:'Perak',c:'#94a3b8'},{l:'Perunggu',c:'#d97706'}].map(m => (
                  <th key={m.l} className="px-3 py-3 text-center text-[9px] font-bold uppercase tracking-widest w-28" style={{ color:m.c }}>{m.l}</th>
                ))}
                <th className="px-3 py-3 text-center text-[9px] font-bold uppercase tracking-widest text-zinc-500 w-20">Total</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, idx) => {
                const changed = !!edits[row.id]
                return (
                  <tr key={row.id} className="border-b transition-colors"
                    style={{ borderColor:'rgba(255,255,255,0.04)', background: changed?'rgba(251,191,36,0.04)':undefined }}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.02)'}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=changed?'rgba(251,191,36,0.04)':'transparent'}>
                    <td className="px-4 py-2.5 text-[11px] font-mono text-zinc-600">{idx+1}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {changed && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"/>}
                        <span className="text-sm text-zinc-200 font-medium">{(row.kontingen as any)?.nama || `Kontingen ${row.kontingen_id}`}</span>
                      </div>
                    </td>
                    {(['emas','perak','perunggu'] as const).map(field => {
                      const medalColor = field==='emas'?'#fbbf24':field==='perak'?'#94a3b8':'#d97706'
                      return (
                        <td key={field} className="px-3 py-2.5 text-center">
                          <input
                            type="number" min="0" max="999"
                            value={getVal(row, field)}
                            onChange={e => setField(row.id, field, Math.max(0, parseInt(e.target.value)||0))}
                            className="w-16 text-center text-sm font-bold rounded-lg px-2 py-1.5 outline-none transition-all focus:ring-1"
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              border: `1px solid ${edits[row.id]?.[field] !== undefined ? `${medalColor}50` : 'rgba(255,255,255,0.1)'}`,
                              color: medalColor,
                              // @ts-ignore
                              '--ring-color': `${medalColor}50`,
                            }}
                          />
                        </td>
                      )
                    })}
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-sm font-black text-white">{getTotal(row)}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t flex items-center gap-2" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
          <Info size={12} className="text-zinc-600"/>
          <span className="text-[10px] text-zinc-600">Total dihitung otomatis (Emas + Perak + Perunggu). Klik "Simpan Semua" untuk menyimpan seluruh perubahan ke database.</span>
        </div>
      </Card>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// TAB 3: MASTER CABOR
// ════════════════════════════════════════════════════════
type CaborRow = { id: number; nama: string; is_active: boolean }

function CaborTab() {
  const [cabors,     setCabors]     = useState<CaborRow[]>([])
  const [loading,    setLoading]    = useState(true)
  const [editingId,  setEditingId]  = useState<number|null>(null)
  const [editNama,   setEditNama]   = useState('')
  const [newNama,    setNewNama]    = useState('')
  const [addingNew,  setAddingNew]  = useState(false)
  const [saving,     setSaving]     = useState<number|string|null>(null)
  const [filter,     setFilter]     = useState<'all'|'active'|'inactive'>('all')
  const [search,     setSearch]     = useState('')
  const [err,        setErr]        = useState('')

  async function load() {
    setLoading(true); setErr('')
    try {
      const res  = await fetch('/api/admin/data-gateway?module=cabor')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCabors(data)
    } catch(e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  async function toggleActive(id: number, current: boolean) {
    setSaving(id)
    try {
      const res = await fetch('/api/admin/data-gateway', {
        method: 'PATCH',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ module:'cabor', data:{ id, is_active:!current } }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setCabors(prev => prev.map(c => c.id===id ? {...c, is_active:!current} : c))
    } catch(e: any) { setErr(e.message) }
    finally { setSaving(null) }
  }

  async function saveEdit(id: number) {
    if (!editNama.trim()) return
    setSaving(id)
    try {
      const res = await fetch('/api/admin/data-gateway', {
        method: 'PATCH',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ module:'cabor', data:{ id, nama:editNama.trim() } }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setCabors(prev => prev.map(c => c.id===id ? {...c, nama:editNama.trim()} : c))
      setEditingId(null)
    } catch(e: any) { setErr(e.message) }
    finally { setSaving(null) }
  }

  async function addCabor() {
    if (!newNama.trim()) return
    setSaving('new')
    try {
      const res = await fetch('/api/admin/data-gateway', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ module:'cabor', data:{ nama:newNama.trim() } }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setNewNama(''); setAddingNew(false); await load()
    } catch(e: any) { setErr(e.message) }
    finally { setSaving(null) }
  }

  const filtered = cabors.filter(c => {
    const matchFilter = filter==='all' || (filter==='active' && c.is_active) || (filter==='inactive' && !c.is_active)
    const matchSearch = !search || c.nama.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  if (loading) return <LoadingSkel/>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold text-white">Master Cabang Olahraga</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">{cabors.filter(c=>c.is_active).length} aktif · {cabors.filter(c=>!c.is_active).length} nonaktif</p>
        </div>
        <div className="flex items-center gap-2">
          {err && <span className="text-[11px] text-red-400 bg-red-500/10 px-3 py-1.5 rounded-xl">{err}</span>}
          <input
            value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Cari cabor..."
            className="text-xs px-3 py-2 rounded-xl outline-none"
            style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.7)', width:180 }}
          />
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor:'rgba(255,255,255,0.1)' }}>
            {(['all','active','inactive'] as const).map(f => (
              <button key={f} onClick={()=>setFilter(f)}
                className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors"
                style={{ background: filter===f?'rgba(255,255,255,0.1)':'transparent', color: filter===f?'white':'rgba(255,255,255,0.35)' }}>
                {f==='all'?'Semua':f==='active'?'Aktif':'Nonaktif'}
              </button>
            ))}
          </div>
          <button onClick={() => setAddingNew(v=>!v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
            style={{ background:`${ACCENT}15`, border:`1px solid ${ACCENT}30`, color:ACCENT }}>
            <Plus size={13}/> Tambah Cabor
          </button>
          <button onClick={load} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <RefreshCw size={14} className="text-zinc-400"/>
          </button>
        </div>
      </div>

      {/* Add new form */}
      {addingNew && (
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background:'rgba(56,189,248,0.05)', border:`1px solid ${ACCENT}20` }}>
          <Plus size={14} style={{ color:ACCENT }}/>
          <input
            autoFocus value={newNama} onChange={e=>setNewNama(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&addCabor()}
            placeholder="Nama cabang olahraga baru..."
            className="flex-1 text-sm px-3 py-2 rounded-xl outline-none"
            style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', color:'white' }}
          />
          <button onClick={addCabor} disabled={saving==='new' || !newNama.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
            style={{ background:`${ACCENT}20`, border:`1px solid ${ACCENT}40`, color:ACCENT }}>
            {saving==='new' ? <Spinner size={13}/> : <><Check size={13}/> Simpan</>}
          </button>
          <button onClick={()=>{setAddingNew(false);setNewNama('')}}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <X size={14} className="text-zinc-400"/>
          </button>
        </div>
      )}

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background:'rgba(255,255,255,0.05)' }}>
          {filtered.map(cabor => (
            <div key={cabor.id} className="p-4 flex items-center gap-3 transition-colors"
              style={{ background: cabor.is_active ? 'rgba(2,10,20,0.7)' : 'rgba(0,0,0,0.5)' }}>
              {/* Active indicator */}
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: cabor.is_active ? '#22d3ee' : '#475569' }}/>

              {/* Name / edit */}
              {editingId===cabor.id ? (
                <input
                  autoFocus value={editNama} onChange={e=>setEditNama(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter')saveEdit(cabor.id);if(e.key==='Escape')setEditingId(null)}}
                  className="flex-1 text-xs px-2 py-1 rounded-lg outline-none"
                  style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', color:'white' }}
                />
              ) : (
                <span className="flex-1 text-sm truncate" style={{ color: cabor.is_active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)' }}>
                  {cabor.nama}
                </span>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {editingId===cabor.id ? (
                  <>
                    <button onClick={()=>saveEdit(cabor.id)} disabled={saving===cabor.id}
                      className="p-1.5 rounded-lg hover:bg-green-500/20 transition-colors" title="Simpan">
                      {saving===cabor.id ? <Spinner size={12} color="#22d3ee"/> : <Check size={12} className="text-green-400"/>}
                    </button>
                    <button onClick={()=>setEditingId(null)}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Batal">
                      <X size={12} className="text-zinc-400"/>
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={()=>{setEditingId(cabor.id);setEditNama(cabor.nama)}}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Edit nama">
                      <Edit3 size={12} className="text-zinc-500 hover:text-zinc-300"/>
                    </button>
                    <button onClick={()=>toggleActive(cabor.id, cabor.is_active)} disabled={saving===cabor.id}
                      className="p-1.5 rounded-lg transition-colors" title={cabor.is_active?'Nonaktifkan':'Aktifkan'}
                      style={{ background: cabor.is_active ? 'rgba(74,222,128,0.1)' : 'rgba(100,116,139,0.1)' }}>
                      {saving===cabor.id
                        ? <Spinner size={12} color={cabor.is_active?'#22d3ee':'#64748b'}/>
                        : cabor.is_active
                          ? <ToggleRight size={16} className="text-green-400"/>
                          : <ToggleLeft size={16} className="text-slate-500"/>
                      }
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 py-12 text-center text-sm text-zinc-600">
              {search ? `Tidak ada cabor dengan kata kunci "${search}"` : 'Tidak ada cabor'}
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t flex items-center gap-2" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
          <Info size={12} className="text-zinc-600"/>
          <span className="text-[10px] text-zinc-600">
            Nonaktifkan cabor yang sudah tidak dipakai (data historis tetap terjaga). Edit nama untuk koreksi typo.
          </span>
        </div>
      </Card>
    </div>
  )
}


// ── Shared UI fragments ───────────────────────────────────

export { KlasemenTab, CaborTab }
