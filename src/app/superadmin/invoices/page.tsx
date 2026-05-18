'use client'
// src/app/superadmin/invoices/page.tsx
// Billing & Invoice management

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, CheckCircle, Clock, CreditCard,
  Download, Edit3, ExternalLink, Loader2,
  Mail, Plus, RefreshCw, Search, Send,
  Trash2, X, AlertTriangle, FileText,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const C = {
  primary:'#ef4444', secondary:'#f97316', accent:'#fbbf24',
  green:'#10b981', blue:'#3b82f6', muted:'#64748b',
  bg:'#0b0e14', bgCard:'#111827', border:'rgba(255,255,255,0.07)', text:'#f1f5f9',
}

const STATUS_CONFIG: Record<string, { label:string; color:string; bg:string }> = {
  draft:     { label:'Draft',     color:'#64748b', bg:'rgba(100,116,139,0.15)' },
  sent:      { label:'Terkirim',  color:'#3b82f6', bg:'rgba(59,130,246,0.15)'  },
  paid:      { label:'Lunas',     color:'#10b981', bg:'rgba(16,185,129,0.15)'  },
  overdue:   { label:'Terlambat', color:'#ef4444', bg:'rgba(239,68,68,0.15)'   },
  cancelled: { label:'Batal',     color:'#64748b', bg:'rgba(100,116,139,0.1)'  },
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

interface InvoiceForm {
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

const PLANS = ['basic','standard','premium','enterprise']
const PLAN_HARGA: Record<string,number> = {
  basic:500000, standard:1500000, premium:5000000, enterprise:0
}

const EMPTY_FORM: InvoiceForm = {
  kontingen_id:'', plan_id:'premium',
  periode_mulai: new Date().toISOString().slice(0,10),
  periode_akhir: new Date(new Date().setMonth(new Date().getMonth()+1)).toISOString().slice(0,10),
  due_date: new Date(new Date().setDate(new Date().getDate()+14)).toISOString().slice(0,10),
  email_to:'', catatan:'', pajak:'0',
  items: [{ deskripsi:'Langganan Platform PORPROV XV', qty:1, harga:5000000 }],
}

export default function InvoicesPage() {
  const [invoices, setInvoices]   = useState<InvoiceRow[]>([])
  const [kontingens, setKontingens] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('semua')
  const [modal, setModal]         = useState<'new' | InvoiceRow | null>(null)
  const [detailModal, setDetailModal] = useState<InvoiceRow | null>(null)
  const [saving, setSaving]       = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [form, setForm]           = useState<InvoiceForm>(EMPTY_FORM)
  const [animIn, setAnimIn]       = useState(false)
  const [toast, setToast]         = useState<{ msg:string; type:'ok'|'err' } | null>(null)

  const showToast = (msg: string, type: 'ok'|'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: invData }, { data: kData }] = await Promise.all([
        sb.from('invoices').select('*, kontingen(nama), invoice_items(*)').order('created_at', { ascending:false }),
        sb.from('kontingen').select('id, nama').order('nama'),
      ])
      setInvoices((invData ?? []).map((i: any) => ({
        ...i, kontingen_nama: i.kontingen?.nama ?? '—',
      })))
      setKontingens(kData ?? [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void fetchAll(); setTimeout(()=>setAnimIn(true),80) }, [fetchAll])

  // Auto-fill harga saat plan berubah
  useEffect(() => {
    if (form.plan_id && PLAN_HARGA[form.plan_id]) {
      setForm(f => ({
        ...f,
        items: [{ deskripsi:`Langganan Platform PORPROV XV — Paket ${f.plan_id.charAt(0).toUpperCase()+f.plan_id.slice(1)}`, qty:1, harga:PLAN_HARGA[f.plan_id] }]
      }))
    }
  }, [form.plan_id])

  const filtered = useMemo(() => {
    let r = invoices
    if (search) r = r.filter(i => i.nomor.toLowerCase().includes(search.toLowerCase()) || i.kontingen_nama.toLowerCase().includes(search.toLowerCase()))
    if (filterStatus !== 'semua') r = r.filter(i => i.status === filterStatus)
    return r
  }, [invoices, search, filterStatus])

  const summary = useMemo(() => ({
    total:   invoices.length,
    draft:   invoices.filter(i=>i.status==='draft').length,
    sent:    invoices.filter(i=>i.status==='sent').length,
    paid:    invoices.filter(i=>i.status==='paid').length,
    overdue: invoices.filter(i=>i.status==='overdue').length,
    totalRevenue: invoices.filter(i=>i.status==='paid').reduce((a,i)=>a+i.total,0),
    totalPending: invoices.filter(i=>i.status==='sent').reduce((a,i)=>a+i.total,0),
  }), [invoices])

  const subtotal = form.items.reduce((a,i) => a+i.qty*i.harga, 0)
  const pajak    = parseInt(form.pajak || '0')
  const total    = subtotal + pajak

  async function handleCreate() {
    if (!form.kontingen_id || !form.plan_id) return
    setSaving(true)
    try {
      const res = await fetch('/api/superadmin/invoices', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          kontingen_id:  Number(form.kontingen_id),
          plan_id:       form.plan_id,
          periode_mulai: form.periode_mulai,
          periode_akhir: form.periode_akhir,
          due_date:      form.due_date || null,
          email_to:      form.email_to || null,
          catatan:       form.catatan || null,
          subtotal, pajak, total,
          items: form.items,
        }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? 'Gagal', 'err'); return }
      setModal(null)
      await fetchAll()
      showToast(`Invoice ${data.invoice.nomor} berhasil dibuat`)
    } finally { setSaving(false) }
  }

  async function handleAction(inv: InvoiceRow, action: string) {
    setActionLoading(`${inv.id}-${action}`)
    try {
      const res = await fetch('/api/superadmin/invoices', {
        method: 'PATCH',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ id: inv.id, action }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? 'Gagal', 'err'); return }

      if (action === 'midtrans') showToast('Payment link berhasil dibuat!')
      if (action === 'send')    showToast('Email invoice terkirim!')
      if (action === 'paid')    showToast('Invoice ditandai lunas!')
      await fetchAll()
    } finally { setActionLoading(null) }
  }

  async function handleDelete(inv: InvoiceRow) {
    if (!confirm(`Hapus invoice ${inv.nomor}?`)) return
    const res = await fetch('/api/superadmin/invoices', {
      method: 'DELETE',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ id: inv.id }),
    })
    const data = await res.json()
    if (!res.ok) { showToast(data.error ?? 'Gagal', 'err'); return }
    showToast('Invoice dihapus')
    await fetchAll()
  }

  const ani = (d=0) => ({
    style:{ transitionDelay:`${d}ms`, transition:'all 0.5s ease' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
  })
  const inputCls  = "w-full px-4 py-2.5 text-sm rounded-xl border outline-none"
  const inputStyle = { background:'rgba(255,255,255,0.05)', borderColor:C.border, color:C.text }

  return (
    <div className="min-h-screen p-8 space-y-6" style={{ background:C.bg }}>

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[3000] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-semibold text-white"
          style={{ background: toast.type==='ok' ? '#10b981' : '#ef4444' }}>
          {toast.type==='ok' ? <CheckCircle size={16}/> : <AlertTriangle size={16}/>}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div {...ani(0)} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/superadmin"
            className="w-9 h-9 rounded-xl flex items-center justify-center border"
            style={{ borderColor:C.border, color:C.muted }}>
            <ArrowLeft size={16}/>
          </Link>
          <div>
            <h1 className="text-xl font-black text-white">Billing & Invoice</h1>
            <p className="text-xs mt-0.5" style={{ color:C.muted }}>
              Kelola invoice & pembayaran kontingen
            </p>
          </div>
        </div>
        <button onClick={()=>{ setForm(EMPTY_FORM); setModal('new') }}
          className="flex items-center gap-2 px-4 py-2.5 text-sm text-white font-bold rounded-xl"
          style={{ background:`linear-gradient(135deg,${C.primary},${C.secondary})` }}>
          <Plus size={14}/> Buat Invoice
        </button>
      </div>

      {/* KPI */}
      <div {...ani(40)} className="grid grid-cols-5 gap-4">
        {[
          { label:'Total Invoice', value:summary.total,                                         color:C.secondary, icon:FileText   },
          { label:'Draft',         value:summary.draft,                                         color:C.muted,     icon:Edit3      },
          { label:'Terkirim',      value:summary.sent,                                          color:C.blue,      icon:Send       },
          { label:'Lunas',         value:summary.paid,                                          color:C.green,     icon:CheckCircle},
          { label:'Revenue',       value:`Rp ${(summary.totalRevenue/1000000).toFixed(1)}jt`,  color:C.accent,    icon:CreditCard },
        ].map(c => (
          <div key={c.label} className="rounded-2xl p-4 border flex items-center gap-3"
            style={{ background:C.bgCard, borderColor:C.border }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background:`${c.color}20` }}>
              <c.icon size={18} style={{ color:c.color }}/>
            </div>
            <div>
              <div className="text-xl font-black text-white">{c.value}</div>
              <div className="text-xs" style={{ color:C.muted }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div {...ani(60)} className="rounded-2xl p-4 border flex gap-3 items-center"
        style={{ background:C.bgCard, borderColor:C.border }}>
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:C.muted }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Cari nomor invoice atau kontingen..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border outline-none"
            style={{ background:'rgba(255,255,255,0.04)', borderColor:C.border, color:C.text }}/>
        </div>
        <div className="flex gap-1.5">
          {['semua',...Object.keys(STATUS_CONFIG)].map(s => (
            <button key={s} onClick={()=>setFilterStatus(s)}
              className="text-[10px] px-3 py-1.5 rounded-lg border font-bold transition-all"
              style={{
                background: filterStatus===s ? `${STATUS_CONFIG[s]?.color??C.secondary}25` : 'rgba(255,255,255,0.04)',
                borderColor: filterStatus===s ? `${STATUS_CONFIG[s]?.color??C.secondary}50` : C.border,
                color: filterStatus===s ? (STATUS_CONFIG[s]?.color??C.secondary) : C.muted,
              }}>
              {s==='semua' ? 'Semua' : STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>
        <button onClick={()=>void fetchAll()}
          className="w-9 h-9 rounded-xl border flex items-center justify-center"
          style={{ borderColor:C.border, color:C.muted }}>
          <RefreshCw size={14} className={loading?'animate-spin':''}/>
        </button>
      </div>

      {/* Table */}
      <div {...ani(80)} className="rounded-2xl border overflow-hidden"
        style={{ background:C.bgCard, borderColor:C.border }}>
        <div className="grid px-5 py-3 text-[9px] font-black uppercase tracking-wider"
          style={{ gridTemplateColumns:'1fr 2fr 1fr 1fr 1fr auto', background:'rgba(255,255,255,0.02)', color:C.muted }}>
          <div>Nomor</div><div>Kontingen</div><div>Total</div>
          <div>Jatuh Tempo</div><div>Status</div><div>Aksi</div>
        </div>

        {loading ? (
          <div className="py-16 text-center"><Loader2 size={24} className="animate-spin mx-auto" style={{ color:C.secondary }}/></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color:C.muted }}>Tidak ada invoice</div>
        ) : filtered.map(inv => {
          const st = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.draft
          const isLoading = (a: string) => actionLoading === `${inv.id}-${a}`
          return (
            <div key={inv.id}
              className="grid px-5 py-4 border-b items-center transition-colors"
              style={{ gridTemplateColumns:'1fr 2fr 1fr 1fr 1fr auto', borderColor:C.border }}
              onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.02)')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>

              <div>
                <div className="text-sm font-bold text-white">{inv.nomor}</div>
                <div className="text-[10px] mt-0.5" style={{ color:C.muted }}>{inv.plan_id}</div>
              </div>

              <div>
                <div className="text-sm font-semibold text-white">{inv.kontingen_nama}</div>
                <div className="text-[10px] mt-0.5" style={{ color:C.muted }}>
                  {inv.email_to ?? '—'}
                </div>
              </div>

              <div className="text-sm font-bold text-white">
                Rp {inv.total.toLocaleString('id-ID')}
              </div>

              <div className="text-xs" style={{ color: inv.status==='overdue'?'#ef4444':C.muted }}>
                {inv.due_date ? new Date(inv.due_date).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}) : '—'}
              </div>

              <div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background:st.bg, color:st.color }}>
                  {st.label}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {/* Detail */}
                <button onClick={()=>setDetailModal(inv)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center border hover:text-white transition-colors"
                  style={{ borderColor:C.border, color:C.muted }}>
                  <FileText size={12}/>
                </button>

                {/* Midtrans — kalau belum ada payment link */}
                {inv.status !== 'paid' && inv.status !== 'cancelled' && !inv.midtrans_url && (
                  <button onClick={()=>handleAction(inv,'midtrans')} disabled={!!actionLoading}
                    className="w-7 h-7 rounded-lg flex items-center justify-center border hover:text-white transition-colors"
                    style={{ borderColor:C.border, color:C.blue }}
                    title="Generate payment link">
                    {isLoading('midtrans') ? <Loader2 size={12} className="animate-spin"/> : <CreditCard size={12}/>}
                  </button>
                )}

                {/* Open payment link */}
                {inv.midtrans_url && (
                  <a href={inv.midtrans_url} target="_blank" rel="noopener noreferrer"
                    className="w-7 h-7 rounded-lg flex items-center justify-center border hover:text-white transition-colors"
                    style={{ borderColor:C.border, color:C.accent }}
                    title="Buka payment link">
                    <ExternalLink size={12}/>
                  </a>
                )}

                {/* Send email */}
                {inv.status === 'draft' && inv.email_to && (
                  <button onClick={()=>handleAction(inv,'send')} disabled={!!actionLoading}
                    className="w-7 h-7 rounded-lg flex items-center justify-center border hover:text-white transition-colors"
                    style={{ borderColor:C.border, color:C.secondary }}
                    title="Kirim email invoice">
                    {isLoading('send') ? <Loader2 size={12} className="animate-spin"/> : <Mail size={12}/>}
                  </button>
                )}

                {/* Mark paid */}
                {(inv.status === 'sent' || inv.status === 'overdue') && (
                  <button onClick={()=>handleAction(inv,'paid')} disabled={!!actionLoading}
                    className="w-7 h-7 rounded-lg flex items-center justify-center border hover:text-white transition-colors"
                    style={{ borderColor:C.border, color:C.green }}
                    title="Tandai lunas">
                    {isLoading('paid') ? <Loader2 size={12} className="animate-spin"/> : <CheckCircle size={12}/>}
                  </button>
                )}

                {/* Delete draft */}
                {inv.status === 'draft' && (
                  <button onClick={()=>handleDelete(inv)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center border hover:text-red-400 transition-colors"
                    style={{ borderColor:C.border, color:C.muted }}>
                    <Trash2 size={12}/>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Modal Buat Invoice ── */}
      {modal === 'new' && (
        <div className="fixed inset-0 flex items-center justify-center z-[2000] p-4"
          style={{ background:'rgba(0,0,0,0.8)', backdropFilter:'blur(8px)' }}>
          <div className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden"
            style={{ background:C.bgCard, borderColor:C.border }}>

            <div className="px-6 py-4 border-b flex items-center justify-between"
              style={{ borderColor:C.border, background:`linear-gradient(135deg,${C.primary}15,${C.secondary}08)` }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background:`linear-gradient(135deg,${C.primary},${C.secondary})` }}>
                  <FileText size={16} className="text-white"/>
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Buat Invoice Baru</h3>
                  <p className="text-[10px]" style={{ color:C.muted }}>Generate + kirim email + payment link</p>
                </div>
              </div>
              <button onClick={()=>setModal(null)} style={{ color:C.muted }}><X size={16}/></button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color:C.muted }}>Kontingen *</label>
                  <select value={form.kontingen_id} onChange={e=>setForm(f=>({...f,kontingen_id:e.target.value}))}
                    className={inputCls} style={inputStyle}>
                    <option value="">— Pilih Kontingen —</option>
                    {kontingens.map(k=><option key={k.id} value={k.id}>{k.nama}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color:C.muted }}>Plan *</label>
                  <select value={form.plan_id} onChange={e=>setForm(f=>({...f,plan_id:e.target.value}))}
                    className={inputCls} style={inputStyle}>
                    {PLANS.map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color:C.muted }}>Periode Mulai</label>
                  <input type="date" value={form.periode_mulai} onChange={e=>setForm(f=>({...f,periode_mulai:e.target.value}))}
                    className={inputCls} style={inputStyle}/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color:C.muted }}>Periode Akhir</label>
                  <input type="date" value={form.periode_akhir} onChange={e=>setForm(f=>({...f,periode_akhir:e.target.value}))}
                    className={inputCls} style={inputStyle}/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color:C.muted }}>Jatuh Tempo</label>
                  <input type="date" value={form.due_date} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))}
                    className={inputCls} style={inputStyle}/>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color:C.muted }}>Email Penerima</label>
                <input type="email" value={form.email_to} onChange={e=>setForm(f=>({...f,email_to:e.target.value}))}
                  placeholder="email@kontingen.id" className={inputCls} style={inputStyle}/>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color:C.muted }}>Item Invoice</label>
                  <button onClick={()=>setForm(f=>({...f,items:[...f.items,{deskripsi:'',qty:1,harga:0}]}))}
                    className="text-[10px] px-2 py-1 rounded-lg" style={{ background:`${C.secondary}20`, color:C.secondary }}>
                    + Tambah Item
                  </button>
                </div>
                <div className="space-y-2">
                  {form.items.map((item, i) => (
                    <div key={i} className="grid gap-2" style={{ gridTemplateColumns:'2fr 80px 120px 32px' }}>
                      <input value={item.deskripsi} onChange={e=>{const items=[...form.items];items[i].deskripsi=e.target.value;setForm(f=>({...f,items}))}}
                        placeholder="Deskripsi item" className={inputCls} style={inputStyle}/>
                      <input type="number" value={item.qty} onChange={e=>{const items=[...form.items];items[i].qty=Number(e.target.value);setForm(f=>({...f,items}))}}
                        className={inputCls} style={inputStyle}/>
                      <input type="number" value={item.harga} onChange={e=>{const items=[...form.items];items[i].harga=Number(e.target.value);setForm(f=>({...f,items}))}}
                        placeholder="Harga" className={inputCls} style={inputStyle}/>
                      {form.items.length > 1 && (
                        <button onClick={()=>setForm(f=>({...f,items:f.items.filter((_,j)=>j!==i)}))}
                          className="w-8 h-full rounded-lg flex items-center justify-center" style={{ background:'rgba(239,68,68,0.1)', color:'#ef4444' }}>
                          <X size={12}/>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pajak + Total */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color:C.muted }}>Pajak (Rp)</label>
                  <input type="number" value={form.pajak} onChange={e=>setForm(f=>({...f,pajak:e.target.value}))}
                    placeholder="0" className={inputCls} style={inputStyle}/>
                </div>
                <div className="flex flex-col justify-end">
                  <div className="rounded-xl p-3 text-right" style={{ background:`${C.accent}15`, border:`1px solid ${C.accent}30` }}>
                    <div className="text-[10px]" style={{ color:C.muted }}>Subtotal: Rp {subtotal.toLocaleString('id-ID')}</div>
                    <div className="text-lg font-black" style={{ color:C.accent }}>
                      Total: Rp {total.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color:C.muted }}>Catatan</label>
                <textarea value={form.catatan} onChange={e=>setForm(f=>({...f,catatan:e.target.value}))}
                  placeholder="Catatan tambahan..." rows={2}
                  className={`${inputCls} resize-none`} style={inputStyle}/>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor:C.border }}>
              <button onClick={()=>setModal(null)}
                className="px-5 py-2.5 text-sm rounded-xl border" style={{ borderColor:C.border, color:C.muted }}>
                Batal
              </button>
              <button onClick={handleCreate} disabled={saving || !form.kontingen_id}
                className="flex items-center gap-2 px-5 py-2.5 text-sm text-white font-bold rounded-xl disabled:opacity-50"
                style={{ background:`linear-gradient(135deg,${C.primary},${C.secondary})` }}>
                {saving ? <><Loader2 size={14} className="animate-spin"/>Membuat...</> : <><FileText size={14}/>Buat Invoice</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {detailModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[2000] p-4"
          style={{ background:'rgba(0,0,0,0.8)', backdropFilter:'blur(8px)' }}>
          <div className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden"
            style={{ background:C.bgCard, borderColor:C.border }}>
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor:C.border }}>
              <h3 className="text-white font-bold">{detailModal.nomor}</h3>
              <button onClick={()=>setDetailModal(null)} style={{ color:C.muted }}><X size={16}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label:'Kontingen', value:detailModal.kontingen_nama },
                  { label:'Plan',      value:detailModal.plan_id },
                  { label:'Periode',   value:`${detailModal.periode_mulai} s/d ${detailModal.periode_akhir}` },
                  { label:'Status',    value:STATUS_CONFIG[detailModal.status]?.label },
                  { label:'Email',     value:detailModal.email_to ?? '—' },
                  { label:'Jatuh Tempo', value:detailModal.due_date ?? '—' },
                ].map(r => (
                  <div key={r.label}>
                    <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color:C.muted }}>{r.label}</div>
                    <div className="text-white font-semibold">{r.value}</div>
                  </div>
                ))}
              </div>

              {/* Items */}
              <div className="rounded-xl overflow-hidden border" style={{ borderColor:C.border }}>
                {(detailModal.invoice_items ?? []).map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b text-sm"
                    style={{ borderColor:C.border }}>
                    <span style={{ color:C.text }}>{item.deskripsi}</span>
                    <span className="font-bold" style={{ color:C.accent }}>Rp {item.subtotal?.toLocaleString('id-ID')}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-3 font-black text-sm"
                  style={{ background:`${C.accent}10` }}>
                  <span style={{ color:C.accent }}>TOTAL</span>
                  <span style={{ color:C.accent }}>Rp {detailModal.total.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {detailModal.midtrans_url && (
                <a href={detailModal.midtrans_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background:`linear-gradient(135deg,${C.blue},#1d4ed8)` }}>
                  <ExternalLink size={14}/> Buka Payment Link
                </a>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}