'use client'
// src/app/superadmin/invoices/page.tsx — JARVIS THEME
// Plans loaded dynamically from DB via getPlans()

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CheckCircle, ChevronDown, ChevronUp, CreditCard,
  Download, Edit3, ExternalLink, FileText,
  Loader2, Mail, Plus, RefreshCw,
  Search, Send, Trash2, X,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { getPlans, type Plan } from '@/lib/subscriptions'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const C = {
  primary:   '#00f3ff',
  secondary: '#00ff66',
  accent:    '#ffb000',
  alert:     '#ff3366',
  purple:    '#a855f7',
  bg:        'rgba(10,25,47,0.4)',
  border:    'rgba(0,243,255,0.2)',
  muted:     '#7a8b9e',
}

const STATUS: Record<string, { l:string; c:string }> = {
  draft:     { l:'DRAFT',    c:'#7a8b9e' },
  sent:      { l:'TERKIRIM', c:'#00f3ff' },
  paid:      { l:'LUNAS',    c:'#00ff66' },
  overdue:   { l:'TERLAMBAT',c:'#ff3366' },
  cancelled: { l:'BATAL',    c:'#7a8b9e' },
}

const DEFAULT_SHOW = 10

function fmtRp(n: number) {
  if (n >= 1_000_000) return `Rp ${(n/1_000_000).toFixed(1)}jt`
  if (n >= 1_000)     return `Rp ${(n/1_000).toFixed(0)}rb`
  return `Rp ${n.toLocaleString('id-ID')}`
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})
}

interface InvoiceRow {
  id:             string
  nomor:          string
  kontingen_id:   number
  kontingen_nama: string
  plan_id:        string
  periode_mulai:  string
  periode_akhir:  string
  subtotal:       number
  pajak:          number
  total:          number
  status:         string
  midtrans_url:   string | null
  due_date:       string | null
  sent_at:        string | null
  paid_at:        string | null
  email_to:       string | null
  catatan:        string | null
  created_at:     string
  invoice_items:  any[]
}

interface InvForm {
  kontingen_id:  string
  plan_id:       string
  periode_mulai: string
  periode_akhir: string
  due_date:      string
  email_to:      string
  catatan:       string
  pajak:         string
  items: { deskripsi:string; qty:number; harga:number }[]
}

function emptyForm(plans: Plan[]): InvForm {
  const p0 = plans[plans.length - 1] // default ke plan tertinggi
  return {
    kontingen_id: '', plan_id: p0?.id ?? '',
    periode_mulai: new Date().toISOString().slice(0,10),
    periode_akhir: new Date(new Date().setMonth(new Date().getMonth()+1)).toISOString().slice(0,10),
    due_date: new Date(new Date().setDate(new Date().getDate()+14)).toISOString().slice(0,10),
    email_to: '', catatan: '', pajak: '0',
    items: [{ deskripsi: `Langganan Platform PORPROV XV${p0 ? ` — ${p0.nama}` : ''}`, qty:1, harga: p0?.harga_bulan ?? 0 }],
  }
}

export default function InvoicesPage() {
  const [invoices,   setInvoices]   = useState<InvoiceRow[]>([])
  const [plans,      setPlans]      = useState<Plan[]>([])
  const [kontingens, setKontingens] = useState<{id:number;nama:string}[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [filterSt,   setFilterSt]   = useState('semua')
  const [showAll,    setShowAll]    = useState(false)
  const [modal,      setModal]      = useState<'new' | InvoiceRow | null>(null)
  const [detail,     setDetail]     = useState<InvoiceRow | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [actLoad,    setActLoad]    = useState<string | null>(null)
  const [form,       setForm]       = useState<InvForm>(emptyForm([]))
  const [animIn,     setAnimIn]     = useState(false)
  const [toast,      setToast]      = useState<{msg:string;ok:boolean}|null>(null)

  function showToast(msg:string, ok=true) {
    setToast({msg,ok}); setTimeout(()=>setToast(null),3000)
  }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    // Baca invoices lewat server (service key + guard superadmin); anon read ditutup (data finansial).
    const [invData, planData, { data:kData }] = await Promise.all([
      fetch('/api/superadmin/invoices').then(r => r.ok ? r.json() : []).catch(() => []),
      getPlans(),
      sb.from('kontingen').select('id,nama').order('nama'),
    ])
    setInvoices((invData ?? []).map((i:any) => ({ ...i, kontingen_nama: i.kontingen?.nama ?? '—' })))
    setPlans(planData)
    setKontingens(kData ?? [])
    setLoading(false)
    setTimeout(()=>setAnimIn(true),80)
  }, [])

  useEffect(() => { void fetchAll() }, [fetchAll])

  // When plan selection changes in form, auto-update item harga from real plan price
  useEffect(() => {
    if (!form.plan_id || !plans.length) return
    const pl = plans.find(p => p.id === form.plan_id)
    if (!pl) return
    setForm(f => ({
      ...f,
      items: [{ deskripsi:`Langganan Platform PORPROV XV — ${pl.nama}`, qty:1, harga:pl.harga_bulan }],
    }))
  }, [form.plan_id, plans]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let r = invoices
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(i => i.nomor.toLowerCase().includes(q) || i.kontingen_nama.toLowerCase().includes(q))
    }
    if (filterSt !== 'semua') r = r.filter(i => i.status === filterSt)
    return r
  }, [invoices, search, filterSt])

  const displayed   = showAll ? filtered : filtered.slice(0, DEFAULT_SHOW)
  const hiddenCount = filtered.length - DEFAULT_SHOW

  const summary = useMemo(() => ({
    total:     invoices.length,
    draft:     invoices.filter(i=>i.status==='draft').length,
    sent:      invoices.filter(i=>i.status==='sent').length,
    paid:      invoices.filter(i=>i.status==='paid').length,
    overdue:   invoices.filter(i=>i.status==='overdue').length,
    revenue:   invoices.filter(i=>i.status==='paid').reduce((a,i)=>a+i.total,0),
    pending:   invoices.filter(i=>i.status==='sent').reduce((a,i)=>a+i.total,0),
  }), [invoices])

  const subtotal = form.items.reduce((a,i)=>a+i.qty*i.harga,0)
  const pajak    = parseInt(form.pajak||'0')
  const total    = subtotal + pajak

  async function handleCreate() {
    if (!form.kontingen_id || !form.plan_id) return
    setSaving(true)
    try {
      const res = await fetch('/api/superadmin/invoices', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          kontingen_id: Number(form.kontingen_id), plan_id: form.plan_id,
          periode_mulai: form.periode_mulai, periode_akhir: form.periode_akhir,
          due_date: form.due_date || null, email_to: form.email_to || null,
          catatan: form.catatan || null, subtotal, pajak, total, items: form.items,
        }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? 'Gagal membuat invoice', false); return }
      setModal(null)
      await fetchAll()
      showToast(`Invoice ${data.invoice?.nomor} berhasil dibuat`)
    } finally { setSaving(false) }
  }

  async function handleAction(inv: InvoiceRow, action: string) {
    setActLoad(`${inv.id}-${action}`)
    try {
      const res = await fetch('/api/superadmin/invoices', {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({id:inv.id, action}),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? 'Gagal', false); return }
      const msgs: Record<string,string> = {
        midtrans:'Payment link berhasil dibuat', send:'Email invoice terkirim', paid:'Invoice ditandai LUNAS',
      }
      showToast(msgs[action] ?? 'Berhasil')
      await fetchAll()
    } finally { setActLoad(null) }
  }

  async function handleDelete(inv: InvoiceRow) {
    if (!confirm(`Hapus invoice ${inv.nomor}?`)) return
    const res = await fetch('/api/superadmin/invoices', {
      method:'DELETE', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({id:inv.id}),
    })
    const data = await res.json()
    if (!res.ok) { showToast(data.error ?? 'Gagal', false); return }
    showToast('Invoice dihapus')
    await fetchAll()
  }

  const panel = { background: C.bg, border:`1px solid ${C.border}`, backdropFilter:'blur(10px)' }
  const ani   = (d=0) => ({
    style:{ transitionDelay:`${d}ms`, transition:'all 0.5s ease' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
  })

  return (
    <div className="p-6 space-y-5 font-sci min-h-screen" style={{ color:'#f1f5f9' }}>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 text-xs font-mono border backdrop-blur-md"
          style={{ background:toast.ok?'rgba(0,255,102,0.1)':'rgba(255,51,102,0.1)', borderColor:toast.ok?C.secondary:C.alert, color:toast.ok?C.secondary:C.alert }}>
          {toast.ok?'✓':'✗'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div {...ani(0)} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border flex items-center justify-center relative"
            style={{ borderColor:C.accent, background:'rgba(255,176,0,0.06)' }}>
            <div className="absolute inset-0 animate-pulse" style={{ background:'rgba(255,176,0,0.04)' }}/>
            <FileText size={18} style={{ color:C.accent }} className="z-10"/>
          </div>
          <div>
            <h1 className="font-lcd font-bold text-xl tracking-widest" style={{ color:C.accent, textShadow:`0 0 12px ${C.accent}` }}>
              BILLING_INVOICES
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color:C.muted }}>
              Invoice · Pembayaran · Revenue tracking · {invoices.length} invoice
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>void fetchAll()} disabled={loading}
            className="p-2 border" style={{ borderColor:C.border, color:C.muted }}>
            <RefreshCw size={13} className={loading?'animate-spin':''}/>
          </button>
          <button onClick={()=>{ setForm(emptyForm(plans)); setModal('new') }}
            className="flex items-center gap-2 px-4 py-2 text-[10px] font-mono border uppercase tracking-wider"
            style={{ borderColor:C.accent, color:C.accent, background:'rgba(255,176,0,0.06)' }}>
            <Plus size={12}/> BUAT_INVOICE
          </button>
        </div>
      </div>

      {/* KPI */}
      <div {...ani(30)} className="grid grid-cols-3 md:grid-cols-7 gap-2">
        {[
          { l:'TOTAL',    v:summary.total,          c:C.muted     },
          { l:'DRAFT',    v:summary.draft,           c:'#7a8b9e'   },
          { l:'TERKIRIM', v:summary.sent,            c:C.primary   },
          { l:'LUNAS',    v:summary.paid,            c:C.secondary },
          { l:'TERLAMBAT',v:summary.overdue,         c:C.alert     },
          { l:'REVENUE',  v:fmtRp(summary.revenue),  c:C.accent    },
          { l:'PENDING',  v:fmtRp(summary.pending),  c:C.purple    },
        ].map(s => (
          <div key={s.l} className="p-3 relative overflow-hidden" style={panel}>
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background:s.c }}/>
            <div className="text-[8px] font-lcd uppercase tracking-widest mb-1" style={{ color:C.muted }}>{s.l}</div>
            <div className="font-lcd font-bold text-lg leading-tight" style={{ color:s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div {...ani(50)} className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 border px-3 py-1.5 flex-1 min-w-48" style={{ borderColor:C.border }}>
          <Search size={11} style={{ color:C.muted }}/>
          <input value={search} onChange={e=>{setSearch(e.target.value);setShowAll(false)}}
            placeholder="Cari nomor / kontingen..." className="bg-transparent text-xs font-mono text-white outline-none flex-1"/>
        </div>
        {['semua',...Object.keys(STATUS)].map(s => {
          const st = STATUS[s]
          const active = filterSt === s
          return (
            <button key={s} onClick={()=>{setFilterSt(s);setShowAll(false)}}
              className="px-3 py-1.5 text-[10px] font-mono border uppercase tracking-wider transition-all"
              style={{
                borderColor: active ? (st?.c ?? C.accent) : C.border,
                color:       active ? (st?.c ?? C.accent) : C.muted,
                background:  active ? `${st?.c ?? C.accent}10` : 'transparent',
              }}>
              {s === 'semua' ? `ALL (${invoices.length})` : `${st.l} (${invoices.filter(i=>i.status===s).length})`}
            </button>
          )
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin" style={{ color:C.accent }}/>
        </div>
      ) : (
        <div {...ani(70)} style={panel}>
          {/* Table header */}
          <div className="grid px-5 py-3 text-[9px] font-lcd uppercase tracking-widest border-b"
            style={{ gridTemplateColumns:'1.2fr 2fr 1fr 1fr 1fr auto', borderColor:C.border, background:'rgba(255,176,0,0.03)', color:C.muted }}>
            <div>NOMOR</div><div>KONTINGEN</div><div>TOTAL</div>
            <div>JATUH TEMPO</div><div>STATUS</div><div>AKSI</div>
          </div>

          {filtered.length === 0 && (
            <div className="py-16 text-center text-xs font-mono" style={{ color:C.muted }}>NO_INVOICE_FOUND</div>
          )}

          {displayed.map(inv => {
            const st = STATUS[inv.status] ?? STATUS.draft
            const al = (a:string) => actLoad === `${inv.id}-${a}`
            const planNama = plans.find(p=>p.id===inv.plan_id)?.nama ?? inv.plan_id
            return (
              <div key={inv.id}
                className="grid px-5 py-3.5 border-b items-center group transition-colors"
                style={{ gridTemplateColumns:'1.2fr 2fr 1fr 1fr 1fr auto', borderColor:'rgba(0,243,255,0.06)' }}
                onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,176,0,0.02)')}
                onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>

                {/* Nomor */}
                <div>
                  <div className="text-xs font-mono font-bold text-white">{inv.nomor}</div>
                  <div className="text-[9px] font-mono mt-0.5" style={{ color:C.muted }}>{planNama.toUpperCase()}</div>
                </div>

                {/* Kontingen */}
                <div>
                  <div className="text-sm font-semibold text-white truncate">{inv.kontingen_nama}</div>
                  <div className="text-[9px] font-mono mt-0.5 truncate" style={{ color:C.muted }}>{inv.email_to ?? '—'}</div>
                </div>

                {/* Total */}
                <div className="font-lcd font-bold text-sm" style={{ color:C.accent }}>
                  {fmtRp(inv.total)}
                </div>

                {/* Due date */}
                <div className="text-xs font-mono" style={{ color:inv.status==='overdue'?C.alert:C.muted }}>
                  {inv.due_date ? fmtDate(inv.due_date) : '—'}
                </div>

                {/* Status */}
                <div>
                  <span className="text-[9px] font-lcd font-bold px-2 py-1"
                    style={{ background:`${st.c}15`, color:st.c, border:`1px solid ${st.c}30` }}>
                    {st.l}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Btn title="Detail" onClick={()=>setDetail(inv)} color={C.muted}><FileText size={11}/></Btn>

                  {inv.status !== 'paid' && inv.status !== 'cancelled' && !inv.midtrans_url && (
                    <Btn title="Generate payment link" onClick={()=>handleAction(inv,'midtrans')} disabled={!!actLoad} color={C.primary}>
                      {al('midtrans') ? <Loader2 size={11} className="animate-spin"/> : <CreditCard size={11}/>}
                    </Btn>
                  )}

                  {inv.midtrans_url && (
                    <a href={inv.midtrans_url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 border transition-all" style={{ borderColor:`${C.accent}40`, color:C.accent }}
                      title="Buka payment link">
                      <ExternalLink size={11}/>
                    </a>
                  )}

                  {inv.status === 'draft' && inv.email_to && (
                    <Btn title="Kirim email" onClick={()=>handleAction(inv,'send')} disabled={!!actLoad} color={C.secondary}>
                      {al('send') ? <Loader2 size={11} className="animate-spin"/> : <Send size={11}/>}
                    </Btn>
                  )}

                  {(inv.status === 'sent' || inv.status === 'overdue') && (
                    <Btn title="Tandai lunas" onClick={()=>handleAction(inv,'paid')} disabled={!!actLoad} color={C.secondary}>
                      {al('paid') ? <Loader2 size={11} className="animate-spin"/> : <CheckCircle size={11}/>}
                    </Btn>
                  )}

                  {inv.status === 'draft' && (
                    <Btn title="Hapus draft" onClick={()=>handleDelete(inv)} color={C.alert}><Trash2 size={11}/></Btn>
                  )}
                </div>
              </div>
            )
          })}

          {/* Expand/collapse */}
          {filtered.length > DEFAULT_SHOW && (
            <div className="px-5 py-3 border-t" style={{ borderColor:C.border }}>
              <button onClick={()=>setShowAll(p=>!p)}
                className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider"
                style={{ color:C.accent }}>
                {showAll
                  ? <><ChevronUp size={12}/> COLLAPSE</>
                  : <><ChevronDown size={12}/> EXPAND — {hiddenCount} invoice tersembunyi</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ MODAL BUAT INVOICE ══════════════════════════════ */}
      {modal === 'new' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)' }}>
          <div className="w-full max-w-2xl flex flex-col font-sci"
            style={{ ...panel, borderColor:`${C.accent}40`, maxHeight:'92vh' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
              style={{ borderColor:`${C.accent}20` }}>
              <div>
                <div className="font-lcd font-bold tracking-widest text-sm" style={{ color:C.accent }}>BUAT_INVOICE_BARU</div>
                <div className="text-[10px] font-mono mt-0.5" style={{ color:C.muted }}>Generate · Email · Payment Link</div>
              </div>
              <button onClick={()=>setModal(null)} className="p-2 border" style={{ borderColor:C.border, color:C.muted }}><X size={14}/></button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ scrollbarWidth:'thin' }}>

              {/* Kontingen + Plan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FLabel>KONTINGEN *</FLabel>
                  <select value={form.kontingen_id} onChange={e=>setForm(f=>({...f,kontingen_id:e.target.value}))}
                    className="w-full bg-transparent border px-3 py-2 text-xs font-mono text-white outline-none"
                    style={{ borderColor:C.border, background:'rgba(10,25,47,0.6)' }}>
                    <option value="" style={{ background:'#0a192f' }}>— Pilih Kontingen —</option>
                    {kontingens.map(k=><option key={k.id} value={k.id} style={{ background:'#0a192f' }}>{k.nama}</option>)}
                  </select>
                </div>
                <div>
                  <FLabel>PLAN *</FLabel>
                  <select value={form.plan_id} onChange={e=>setForm(f=>({...f,plan_id:e.target.value}))}
                    className="w-full bg-transparent border px-3 py-2 text-xs font-mono text-white outline-none"
                    style={{ borderColor:C.border, background:'rgba(10,25,47,0.6)' }}>
                    {plans.map(p=><option key={p.id} value={p.id} style={{ background:'#0a192f' }}>{p.nama}</option>)}
                  </select>
                </div>
              </div>

              {/* Periode + due */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { l:'PERIODE MULAI', k:'periode_mulai' },
                  { l:'PERIODE AKHIR', k:'periode_akhir' },
                  { l:'JATUH TEMPO',   k:'due_date'      },
                ].map(({l,k}) => (
                  <div key={k}>
                    <FLabel>{l}</FLabel>
                    <input type="date" value={(form as any)[k]}
                      onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
                      className="w-full bg-transparent border px-2 py-1.5 text-xs font-mono text-white outline-none"
                      style={{ borderColor:C.border, colorScheme:'dark' }}/>
                  </div>
                ))}
              </div>

              {/* Email */}
              <div>
                <FLabel>EMAIL PENERIMA</FLabel>
                <input type="email" value={form.email_to} onChange={e=>setForm(f=>({...f,email_to:e.target.value}))}
                  placeholder="email@kontingen.id"
                  className="w-full bg-transparent border px-3 py-2 text-xs font-mono text-white outline-none"
                  style={{ borderColor:C.border }}/>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <FLabel>ITEM INVOICE</FLabel>
                  <button onClick={()=>setForm(f=>({...f,items:[...f.items,{deskripsi:'',qty:1,harga:0}]}))}
                    className="text-[9px] font-mono px-2 py-1 border" style={{ borderColor:`${C.secondary}40`, color:C.secondary }}>
                    + ITEM
                  </button>
                </div>
                <div className="space-y-1.5">
                  {form.items.map((item,i) => (
                    <div key={i} className="grid gap-1.5" style={{ gridTemplateColumns:'2fr 60px 110px 28px' }}>
                      <input value={item.deskripsi}
                        onChange={e=>{const it=[...form.items];it[i].deskripsi=e.target.value;setForm(f=>({...f,items:it}))}}
                        placeholder="Deskripsi"
                        className="bg-transparent border px-2 py-1.5 text-xs font-mono text-white outline-none"
                        style={{ borderColor:C.border }}/>
                      <input type="number" value={item.qty}
                        onChange={e=>{const it=[...form.items];it[i].qty=Number(e.target.value);setForm(f=>({...f,items:it}))}}
                        className="bg-transparent border px-2 py-1.5 text-xs font-mono text-white outline-none text-center"
                        style={{ borderColor:C.border }}/>
                      <input type="number" value={item.harga}
                        onChange={e=>{const it=[...form.items];it[i].harga=Number(e.target.value);setForm(f=>({...f,items:it}))}}
                        placeholder="Harga"
                        className="bg-transparent border px-2 py-1.5 text-xs font-mono text-white outline-none"
                        style={{ borderColor:C.border }}/>
                      {form.items.length > 1 && (
                        <button onClick={()=>setForm(f=>({...f,items:f.items.filter((_,j)=>j!==i)}))}
                          className="border flex items-center justify-center"
                          style={{ borderColor:`${C.alert}30`, color:C.alert }}><X size={11}/></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pajak + Total */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FLabel>PAJAK (Rp)</FLabel>
                  <input type="number" value={form.pajak} onChange={e=>setForm(f=>({...f,pajak:e.target.value}))}
                    placeholder="0"
                    className="w-full bg-transparent border px-2 py-1.5 text-xs font-mono text-white outline-none"
                    style={{ borderColor:C.border }}/>
                </div>
                <div className="flex flex-col justify-end">
                  <div className="p-3 border text-right" style={{ borderColor:`${C.accent}40`, background:`${C.accent}08` }}>
                    <div className="text-[9px] font-mono" style={{ color:C.muted }}>Subtotal: {fmtRp(subtotal)}</div>
                    <div className="font-lcd font-bold text-lg" style={{ color:C.accent }}>Total: {fmtRp(total)}</div>
                  </div>
                </div>
              </div>

              {/* Catatan */}
              <div>
                <FLabel>CATATAN</FLabel>
                <textarea value={form.catatan} onChange={e=>setForm(f=>({...f,catatan:e.target.value}))}
                  rows={2} placeholder="Catatan tambahan..."
                  className="w-full bg-transparent border px-2 py-1.5 text-xs font-mono text-white outline-none resize-none"
                  style={{ borderColor:C.border }}/>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t flex-shrink-0"
              style={{ borderColor:`${C.accent}15`, background:'rgba(0,0,0,0.2)' }}>
              <button onClick={()=>setModal(null)} disabled={saving}
                className="px-5 py-2 text-[10px] font-mono border uppercase tracking-wider"
                style={{ borderColor:C.border, color:C.muted }}>CANCEL</button>
              <button onClick={handleCreate} disabled={saving||!form.kontingen_id||!form.plan_id}
                className="flex items-center gap-2 px-6 py-2 text-[10px] font-mono border uppercase tracking-wider disabled:opacity-40"
                style={{ borderColor:C.accent, color:C.accent, background:'rgba(255,176,0,0.08)' }}>
                {saving ? <><Loader2 size={12} className="animate-spin"/>SAVING...</> : <><FileText size={12}/>BUAT_INVOICE</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DETAIL MODAL ════════════════════════════════════ */}
      {detail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)' }}>
          <div className="w-full max-w-md font-sci" style={{ ...panel, borderColor:`${C.accent}40` }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor:`${C.accent}20` }}>
              <div>
                <div className="font-lcd font-bold tracking-widest text-sm" style={{ color:C.accent }}>{detail.nomor}</div>
                <div className="text-[9px] font-mono mt-0.5" style={{ color:C.muted }}>{detail.kontingen_nama}</div>
              </div>
              <button onClick={()=>setDetail(null)} className="p-2 border" style={{ borderColor:C.border, color:C.muted }}><X size={14}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { l:'PLAN',       v: plans.find(p=>p.id===detail.plan_id)?.nama ?? detail.plan_id },
                  { l:'STATUS',     v: STATUS[detail.status]?.l ?? detail.status },
                  { l:'PERIODE',    v:`${fmtDate(detail.periode_mulai)} – ${fmtDate(detail.periode_akhir)}` },
                  { l:'JATUH TEMPO',v: detail.due_date ? fmtDate(detail.due_date) : '—' },
                  { l:'EMAIL',      v: detail.email_to ?? '—' },
                  { l:'DIBAYAR',    v: detail.paid_at ? fmtDate(detail.paid_at) : '—' },
                ].map(r => (
                  <div key={r.l}>
                    <div className="text-[9px] font-mono uppercase tracking-widest mb-0.5" style={{ color:C.muted }}>{r.l}</div>
                    <div className="font-semibold text-white truncate">{r.v}</div>
                  </div>
                ))}
              </div>

              {/* Items */}
              <div className="border" style={{ borderColor:C.border }}>
                {(detail.invoice_items ?? []).map((item:any, i:number) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 border-b text-xs"
                    style={{ borderColor:'rgba(0,243,255,0.06)' }}>
                    <span className="text-white">{item.deskripsi}</span>
                    <span className="font-bold font-mono" style={{ color:C.accent }}>{fmtRp(item.subtotal ?? 0)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-3 py-2 text-xs font-bold font-lcd"
                  style={{ background:`${C.accent}08`, color:C.accent }}>
                  <span>TOTAL</span><span>{fmtRp(detail.total)}</span>
                </div>
              </div>

              {detail.midtrans_url && (
                <a href={detail.midtrans_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-[10px] font-mono border uppercase tracking-wider"
                  style={{ borderColor:`${C.primary}40`, color:C.primary, background:`${C.primary}08` }}>
                  <ExternalLink size={12}/> BUKA_PAYMENT_LINK
                </a>
              )}

              {detail.catatan && (
                <div className="text-[10px] font-mono p-2 border" style={{ borderColor:C.border, color:C.muted }}>
                  {detail.catatan}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Btn({ children, title, onClick, disabled, color }: {
  children: ReactNode; title?: string; onClick?: ()=>void; disabled?: boolean; color: string
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className="p-1.5 border transition-all disabled:opacity-40"
      style={{ borderColor:`${color}40`, color }}>
      {children}
    </button>
  )
}

function FLabel({ children }: { children: ReactNode }) {
  return (
    <label className="block text-[9px] font-mono uppercase tracking-widest mb-1.5" style={{ color:'#7a8b9e' }}>
      {children}
    </label>
  )
}
