'use client'
// src/components/konida/kejuaraan/PrestasiInputForm.tsx
// Modal form untuk admin tambah prestasi atas nama atlet
// Validation built-in, langsung INSERT ke riwayat_prestasi via Supabase

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { X, Loader2, AlertCircle, CheckCircle, Calendar, MapPin, Trophy, Link2 } from 'lucide-react'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const HASIL_OPTIONS = ['Emas', 'Perak', 'Perunggu', 'Juara 4', 'Peserta'] as const
const LEVEL_OPTIONS = ['Internasional', 'Nasional', 'Provinsi', 'Kabupaten', 'Lokal'] as const

interface FormData {
  event:               string
  tahun:               number
  lokasi:              string
  nomor_tanding:       string
  hasil:               typeof HASIL_OPTIONS[number]
  level_event:         typeof LEVEL_OPTIONS[number]
  catatan:             string
  source_document_url: string
}

interface Props {
  atletId:        number
  atletNama:      string
  caborNama:      string
  accent:         string
  onClose:        () => void
  onSuccess:      () => void
  /** Default 'admin'. Set 'atlet' kalau dipakai di Portal Atlet. */
  submittedBy?:   'admin' | 'atlet'
  /** Default 'verified' kalau admin, 'pending' kalau atlet. Override kalau perlu. */
  submissionStatus?: 'pending' | 'verified'
}

export function PrestasiInputForm({
  atletId, atletNama, caborNama, accent,
  onClose, onSuccess,
  submittedBy = 'admin',
  submissionStatus,
}: Props) {
  const currentYear = new Date().getFullYear()
  const defaultStatus = submissionStatus || (submittedBy === 'admin' ? 'verified' : 'pending')
  
  const [form, setForm] = useState<FormData>({
    event:               '',
    tahun:               currentYear,
    lokasi:              '',
    nomor_tanding:       '',
    hasil:               'Peserta',
    level_event:         'Kabupaten',
    catatan:             '',
    source_document_url: '',
  })
  
  const [errors,    setErrors]    = useState<Partial<Record<keyof FormData, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitOk,    setSubmitOk]    = useState(false)
  
  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])
  
  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(s => ({ ...s, [key]: value }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }))
  }
  
  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormData, string>> = {}
    
    if (!form.event.trim())             newErrors.event = 'Wajib diisi'
    if (form.event.length > 200)        newErrors.event = 'Maksimal 200 karakter'
    if (!form.tahun)                    newErrors.tahun = 'Wajib diisi'
    if (form.tahun < 1990 || form.tahun > currentYear + 1)
                                        newErrors.tahun = `1990 - ${currentYear + 1}`
    if (!form.lokasi.trim())            newErrors.lokasi = 'Wajib diisi'
    if (!form.nomor_tanding.trim())     newErrors.nomor_tanding = 'Wajib diisi'
    if (form.source_document_url && !/^https?:\/\//.test(form.source_document_url))
                                        newErrors.source_document_url = 'URL harus diawali http(s)://'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  async function handleSubmit() {
    if (!validate()) return
    
    setSubmitting(true)
    setSubmitError(null)
    
    try {
      const { error } = await sb.from('riwayat_prestasi').insert({
        atlet_id:            atletId,
        event:               form.event.trim(),
        tahun:               form.tahun,
        lokasi:              form.lokasi.trim(),
        nomor_tanding:       form.nomor_tanding.trim(),
        hasil:               form.hasil,
        level_event:         form.level_event,
        catatan:             form.catatan.trim() || null,
        source_document_url: form.source_document_url.trim() || null,
        is_demo:             false,
        submitted_by:        submittedBy,
        submission_status:   defaultStatus,
        submitted_at:        new Date().toISOString(),
        verified_at:         defaultStatus === 'verified' ? new Date().toISOString() : null,
      })
      
      if (error) throw error
      
      setSubmitOk(true)
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 800)
    } catch (e: any) {
      setSubmitError(e?.message || 'Gagal menyimpan. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(2,10,20,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      
      <div
        className="rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ background: '#0f172a', border: `1px solid ${accent}30` }}
        onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-start justify-between"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div>
            <div className="flex items-center gap-2">
              <Trophy size={18} style={{ color: accent }}/>
              <h2 className="text-lg font-bold text-white">Tambah Prestasi</h2>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Atlet: <span className="text-slate-300 font-medium">{atletNama}</span> · <span className="text-slate-400">{caborNama}</span>
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Tutup">
            <X size={16} className="text-slate-400"/>
          </button>
        </div>
        
        {/* Form body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {submitOk && (
            <div className="rounded-xl p-3 flex items-center gap-2 text-sm"
              style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>
              <CheckCircle size={16}/> Berhasil disimpan!
            </div>
          )}
          
          {submitError && (
            <div className="rounded-xl p-3 flex items-center gap-2 text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' }}>
              <AlertCircle size={16}/> {submitError}
            </div>
          )}
          
          {/* Event name */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
              Nama Event <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input type="text" value={form.event} onChange={e => update('event', e.target.value)}
              placeholder="cth: Kejurnas Atletik 2025"
              className="w-full bg-slate-800/50 border rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors"
              style={{ borderColor: errors.event ? '#ef4444' : 'rgba(255,255,255,0.1)' }}/>
            {errors.event && <p className="text-[11px] text-red-400 mt-1">{errors.event}</p>}
          </div>
          
          {/* Tahun + Level row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                Tahun <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input type="number" value={form.tahun} onChange={e => update('tahun', parseInt(e.target.value) || currentYear)}
                min={1990} max={currentYear + 1}
                className="w-full bg-slate-800/50 border rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors tabular-nums"
                style={{ borderColor: errors.tahun ? '#ef4444' : 'rgba(255,255,255,0.1)' }}/>
              {errors.tahun && <p className="text-[11px] text-red-400 mt-1">{errors.tahun}</p>}
            </div>
            
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                Level Event <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select value={form.level_event} onChange={e => update('level_event', e.target.value as any)}
                className="w-full bg-slate-800/50 border rounded-lg px-3 py-2 text-sm text-white outline-none"
                style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                {LEVEL_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          
          {/* Lokasi */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
              Lokasi <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
              <input type="text" value={form.lokasi} onChange={e => update('lokasi', e.target.value)}
                placeholder="cth: Jakarta, Indonesia"
                className="w-full bg-slate-800/50 border rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none transition-colors"
                style={{ borderColor: errors.lokasi ? '#ef4444' : 'rgba(255,255,255,0.1)' }}/>
            </div>
            {errors.lokasi && <p className="text-[11px] text-red-400 mt-1">{errors.lokasi}</p>}
          </div>
          
          {/* Nomor tanding */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
              Nomor Tanding / Kelas <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input type="text" value={form.nomor_tanding} onChange={e => update('nomor_tanding', e.target.value)}
              placeholder="cth: 100m Putra, -60kg Putri, Single, dll"
              className="w-full bg-slate-800/50 border rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors"
              style={{ borderColor: errors.nomor_tanding ? '#ef4444' : 'rgba(255,255,255,0.1)' }}/>
            {errors.nomor_tanding && <p className="text-[11px] text-red-400 mt-1">{errors.nomor_tanding}</p>}
          </div>
          
          {/* Hasil — pill group */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
              Hasil <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {HASIL_OPTIONS.map(h => {
                const colors: Record<string, string> = {
                  'Emas': '#fbbf24', 'Perak': '#cbd5e1', 'Perunggu': '#cd7f32',
                  'Juara 4': '#6b7280', 'Peserta': '#475569',
                }
                const c = colors[h]
                const active = form.hasil === h
                return (
                  <button key={h} type="button" onClick={() => update('hasil', h)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: active ? `${c}25` : 'rgba(255,255,255,0.04)',
                      color:      active ? c : 'rgba(255,255,255,0.5)',
                      border:     active ? `1px solid ${c}60` : '1px solid rgba(255,255,255,0.08)',
                    }}>
                    {h === 'Emas' ? '🥇 ' : h === 'Perak' ? '🥈 ' : h === 'Perunggu' ? '🥉 ' : ''}{h}
                  </button>
                )
              })}
            </div>
          </div>
          
          {/* Source document URL */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
              Link Dokumen Bukti <span className="text-slate-600 normal-case font-normal">(opsional, SK / sertifikat)</span>
            </label>
            <div className="relative">
              <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
              <input type="url" value={form.source_document_url} onChange={e => update('source_document_url', e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-800/50 border rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none transition-colors"
                style={{ borderColor: errors.source_document_url ? '#ef4444' : 'rgba(255,255,255,0.1)' }}/>
            </div>
            {errors.source_document_url && <p className="text-[11px] text-red-400 mt-1">{errors.source_document_url}</p>}
          </div>
          
          {/* Catatan */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
              Catatan <span className="text-slate-600 normal-case font-normal">(opsional)</span>
            </label>
            <textarea value={form.catatan} onChange={e => update('catatan', e.target.value)}
              placeholder="cth: Personal best, bersama tim, dll"
              rows={2}
              className="w-full bg-slate-800/50 border rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors resize-none"
              style={{ borderColor: 'rgba(255,255,255,0.1)' }}/>
          </div>
          
          {/* Info */}
          <div className="rounded-lg px-3 py-2.5 text-[11px] flex items-start gap-2"
            style={{ background: 'rgba(56,189,248,0.06)', color: '#7dd3fc', border: '1px solid rgba(56,189,248,0.15)' }}>
            <AlertCircle size={14} className="shrink-0 mt-0.5"/>
            <div>
              {submittedBy === 'admin' 
                ? <>Submitted as <strong>admin</strong>, langsung <strong>verified</strong>. Untuk submission dari atlet (status pending), gunakan Portal Atlet.</>
                : <>Submitted as <strong>atlet</strong>, status <strong>pending</strong>. Menunggu verifikasi admin sebelum tampil di publik.</>}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3"
          style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(2,10,20,0.5)' }}>
          <button onClick={onClose} disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
            style={{ color: 'rgba(255,255,255,0.5)' }}>
            Batal
          </button>
          <button onClick={handleSubmit} disabled={submitting || submitOk}
            className="px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
            style={{
              background: `${accent}25`,
              color:      accent,
              border:     `1px solid ${accent}50`,
              opacity:    submitting ? 0.6 : 1,
            }}>
            {submitting ? (
              <><Loader2 size={14} className="animate-spin"/> Menyimpan...</>
            ) : submitOk ? (
              <><CheckCircle size={14}/> Tersimpan</>
            ) : (
              <><Trophy size={14}/> Simpan Prestasi</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
