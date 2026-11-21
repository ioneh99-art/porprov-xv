'use client'
// RekonsiliasiPodiumResmi — panel di War Room → Perolehan Medali (setelah PORPROV selesai):
// setiap medali resmi panitia (arsip situs porprov.konijabar.or.id, tabel porprov15_*)
// dipasangkan dengan medali yang disahkan di aplikasi kita. Menampilkan yang tidak
// berpasangan, nama nomor yang ditulis beda, dan daftar atlet yang beda.

import { useEffect, useState } from 'react'
import { ShieldCheck, AlertTriangle, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import type { LaporanRekonsiliasi } from '@/lib/rekonsiliasi-porprov-db'

const WARNA: Record<string, string> = { emas: '#ffd700', perak: '#c0c0c0', perunggu: '#cd7f32' }
const SITUS = 'https://porprov.konijabar.or.id'
const tgl = (iso: string | null) => iso ? new Date(iso).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

function Bagian({ judul, jumlah, warna, buka: bukaAwal = false, children }: { judul: string; jumlah: number; warna: string; buka?: boolean; children: React.ReactNode }) {
  const [buka, setBuka] = useState(bukaAwal)
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02]">
      <button type="button" onClick={() => setBuka(b => !b)} className="w-full flex items-center gap-2 px-4 py-2.5 text-left">
        {buka ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="text-sm font-bold text-white flex-1">{judul}</span>
        <span className="text-xs font-black tabular-nums px-2 py-0.5 rounded-lg" style={{ color: warna, background: `${warna}18` }}>{jumlah}</span>
      </button>
      {buka && <div className="px-4 pb-3">{children}</div>}
    </div>
  )
}

const Lencana = ({ jenis }: { jenis: string }) => (
  <span className="inline-block w-16 text-[10px] font-black uppercase" style={{ color: WARNA[jenis] }}>{jenis}</span>
)

export default function RekonsiliasiPodiumResmi({ q = '' }: { q?: string }) {
  const [r, setR] = useState<LaporanRekonsiliasi | null>(null)
  const [galat, setGalat] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/konida/rekonsiliasi-porprov${q}`, { cache: 'no-store' })
      .then(async x => { const j = await x.json().catch(() => ({})); if (!x.ok) throw new Error(j.error ?? 'Gagal memuat.'); return j })
      .then(setR).catch(e => setGalat(e.message))
  }, [q])

  if (galat) return <section className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-sm text-red-300">Rekonsiliasi akhir: {galat}</section>
  if (!r) return <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-500">Memuat rekonsiliasi akhir…</section>
  if (!r.kontingen) return null

  const lengkap = r.jumlah.resmi === r.jumlah.berpasangan && r.jumlah.kita === r.jumlah.berpasangan
  const atletPerluTambah = r.atletBeda.filter(x => x.hanyaResmi.length)
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-emerald-300"><ShieldCheck size={14} /> Rekonsiliasi akhir</div>
          <h2 className="text-lg font-black text-white mt-1">Medali kita vs podium resmi panitia</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Setiap medali resmi {r.kontingen.nama} di situs panitia dipasangkan dengan medali yang disahkan di aplikasi ini (cabor & jenis medali sama, lalu nomor atau atletnya sama). Arsip situs {r.arsip.tanggal ?? '—'}, diolah {tgl(r.arsip.diolah)}.</p>
        </div>
        <div className={`rounded-xl px-4 py-2.5 border text-sm font-bold ${lengkap ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/40 bg-amber-500/10 text-amber-300'}`}>
          {lengkap ? <span className="flex items-center gap-1.5"><ShieldCheck size={15} /> Semua {r.jumlah.berpasangan} medali cocok</span>
            : <span className="flex items-center gap-1.5"><AlertTriangle size={15} /> {r.jumlah.resmi - r.jumlah.berpasangan + r.jumlah.kita - r.jumlah.berpasangan} medali belum berpasangan</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: 'Medali resmi panitia', v: r.jumlah.resmi, s: `${r.kontingen.emas} · ${r.kontingen.perak} · ${r.kontingen.perunggu} · peringkat ${r.kontingen.peringkat}` },
          { l: 'Disahkan di aplikasi', v: r.jumlah.kita, s: 'laporan disahkan/tervalidasi' },
          { l: 'Berpasangan', v: r.jumlah.berpasangan, s: `${r.nomorBeda.length} dengan nama nomor ditulis beda` },
          { l: 'Atlet resmi belum tercatat', v: atletPerluTambah.reduce((s, x) => s + x.hanyaResmi.length, 0), s: `di ${atletPerluTambah.length} medali beregu` },
        ].map(k => (
          <div key={k.l} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">{k.l}</div>
            <div className="text-2xl font-black text-white tabular-nums">{k.v}</div>
            <div className="text-[10px] text-zinc-500">{k.s}</div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Bagian judul="Resmi, tetapi tidak ada di data kita" jumlah={r.resmiSaja.length} warna={r.resmiSaja.length ? '#f87171' : '#34d399'} buka={r.resmiSaja.length > 0}>
          {r.resmiSaja.length === 0 ? <p className="text-xs text-emerald-300">Tidak ada — setiap medali resmi sudah tercatat di aplikasi.</p> : r.resmiSaja.map((x, i) => (
            <div key={i} className="text-xs py-1 border-t border-white/5"><Lencana jenis={x.jenis} />{x.cabor} · {x.nomor} <span className="text-zinc-500">· {x.atlet.join(', ')}</span></div>
          ))}
        </Bagian>
        <Bagian judul="Disahkan di aplikasi, tetapi tidak ada di podium resmi" jumlah={r.kitaSaja.length} warna={r.kitaSaja.length ? '#f87171' : '#34d399'} buka={r.kitaSaja.length > 0}>
          {r.kitaSaja.length === 0 ? <p className="text-xs text-emerald-300">Tidak ada — semua medali yang disahkan diakui panitia.</p> : r.kitaSaja.map(x => (
            <div key={x.laporanId} className="text-xs py-1 border-t border-white/5"><Lencana jenis={x.jenis} />#{x.laporanId} · {x.nomor} <span className="text-zinc-500">· {x.atlet.join(', ')}</span></div>
          ))}
        </Bagian>
        <Bagian judul="Daftar atlet berbeda (medali beregu)" jumlah={r.atletBeda.length} warna="#fbbf24" buka={atletPerluTambah.length > 0}>
          <p className="text-[11px] text-zinc-500 mb-2">Merah = tercantum di podium resmi tetapi tidak ada di laporan kita (perlu ditambahkan ke laporan agar tercatat di prestasi atlet). Abu-abu = ada di laporan kita, tidak dicantumkan panitia (biasanya cadangan/ofisial tim).</p>
          {[...r.atletBeda].sort((a, b) => b.hanyaResmi.length - a.hanyaResmi.length).map(x => (
            <div key={x.laporanId} className="text-xs py-1.5 border-t border-white/5">
              <div><Lencana jenis={x.jenis} /><span className="text-zinc-200">{x.nomorResmi}</span> <span className="text-zinc-600">· laporan #{x.laporanId}</span></div>
              {x.hanyaResmi.length > 0 && <div className="pl-16 text-red-300">Belum di laporan kita: {x.hanyaResmi.join(', ')}</div>}
              {x.hanyaKita.length > 0 && <div className="pl-16 text-zinc-500">Hanya di laporan kita: {x.hanyaKita.join(', ')}{x.resmiTanpaNama ? ' (panitia tidak mencantumkan nama)' : ''}</div>}
            </div>
          ))}
        </Bagian>
        <Bagian judul="Nama nomor ditulis berbeda (tetap berpasangan)" jumlah={r.nomorBeda.length} warna="#94a3b8">
          {r.nomorBeda.map(x => (
            <div key={x.laporanId} className="text-xs py-1 border-t border-white/5"><Lencana jenis={x.jenis} />resmi <span className="text-zinc-200">“{x.nomorResmi}”</span> · kita <span className="text-zinc-300">“{x.nomorKita}”</span> <span className="text-zinc-600">#{x.laporanId}</span></div>
          ))}
        </Bagian>
      </div>
      <p className="text-[11px] text-zinc-500">Karena semua medali yang disahkan sudah cocok dengan podium resmi, evaluasi target di grafik bawah (target KONI 54) dan kartu Misi Emas di War Room kini setara dengan hasil resmi panitia.</p>
      <a href={`${SITUS}/kontingen/${r.kontingen.nama.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:underline">Halaman resmi {r.kontingen.nama} di situs panitia <ExternalLink size={11} /></a>
    </section>
  )
}
