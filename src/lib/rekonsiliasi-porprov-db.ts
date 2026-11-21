// src/lib/rekonsiliasi-porprov-db.ts — server saja.
// Muat podium resmi PORPROV XV (porprov15_*) dan medali disahkan kita (laporan_hasil)
// untuk satu kontingen, lalu rekonsiliasi (src/lib/rekonsiliasi-porprov.ts).

import { dbLapor } from './lapor-sesi'
import { baku, cocokCabor } from './konijabar'
import { rekonsiliasi, type MedaliKita, type MedaliResmi } from './rekonsiliasi-porprov'

export interface BarisBeda {
  jenis: string; cabor: string; nomorResmi: string; nomorKita: string; laporanId: number
  /** Nama di podium resmi yang tidak ada di laporan kita (perlu ditambah ke laporan). */
  hanyaResmi: string[]
  /** Nama di laporan kita yang tidak tercantum di podium resmi. */
  hanyaKita: string[]
  /** Podium resmi tanpa nama atlet sama sekali (panitia tidak mencantumkan). */
  resmiTanpaNama: boolean
}
export interface LaporanRekonsiliasi {
  kontingen: { nama: string; peringkat: number | null; emas: number; perak: number; perunggu: number } | null
  arsip: { tanggal: string | null; diolah: string | null }
  jumlah: { resmi: number; kita: number; berpasangan: number }
  resmiSaja: { jenis: string; cabor: string; nomor: string; atlet: string[]; nomorSitusId: number }[]
  kitaSaja: { jenis: string; nomor: string; atlet: string[]; laporanId: number }[]
  nomorBeda: { jenis: string; nomorResmi: string; nomorKita: string; laporanId: number }[]
  atletBeda: BarisBeda[]
}

/** Situs memotong daftar awak di podium halaman nomor pada 8 nama (241 podium tepat 8, tak ada yang lebih). */
const BATAS_NAMA_PODIUM = 8

export async function muatRekonsiliasi(kontingenId: number): Promise<LaporanRekonsiliasi> {
  const db = dbLapor()
  const { data: kon } = await db.from('porprov15_kontingen').select('situs_id, nama, peringkat, emas, perak, perunggu').eq('kontingen_id', kontingenId).maybeSingle()
  const { data: sinkron } = await db.from('porprov15_sinkron').select('arsip, selesai').order('id', { ascending: false }).limit(1).maybeSingle()
  const kosong: LaporanRekonsiliasi = {
    kontingen: null, arsip: { tanggal: sinkron?.arsip ?? null, diolah: sinkron?.selesai ?? null },
    jumlah: { resmi: 0, kita: 0, berpasangan: 0 }, resmiSaja: [], kitaSaja: [], nomorBeda: [], atletBeda: [],
  }
  if (!kon) return kosong

  const [{ data: caborKita }, { data: med }, { data: lap }] = await Promise.all([
    db.from('cabang_olahraga').select('id, nama'),
    db.from('porprov15_medali').select('id, nomor_situs_id, medali, atlet_nama, porprov15_nomor(nama, disiplin, porprov15_cabor(nama, cabor_id))').eq('kontingen_situs_id', kon.situs_id),
    db.from('laporan_hasil').select('id, cabor_id, nomor_teks, hasil, atlet_ids').eq('kontingen_id', kontingenId)
      .in('status', ['disahkan', 'tervalidasi']).in('hasil', ['emas', 'perak', 'perunggu']),
  ])
  // Halaman nomor di situs hanya menulis BATAS_NAMA_PODIUM nama awak pertama (urut abjad). Awak lengkap ada di
  // halaman laga final: gabungkan nama peserta laga kontingen ini yang membawa medali yang sama —
  // hanya bila kontingen punya satu podium untuk nomor & medali itu (supaya dua perunggu tidak tercampur).
  const awak = new Map<string, string[]>()
  const satuPodium = new Map<string, number>()
  ;(med ?? []).forEach((m: any) => { const k = `${m.nomor_situs_id}|${m.medali}`; satuPodium.set(k, (satuPodium.get(k) ?? 0) + 1) })
  for (let hal = 0; ; hal++) {
    const { data } = await db.from('porprov15_laga_peserta').select('medali, atlet_nama, porprov15_laga!inner(nomor_situs_id)')
      .eq('kontingen_situs_id', kon.situs_id).not('medali', 'is', null).range(hal * 1000, hal * 1000 + 999)
    ;(data ?? []).forEach((p: any) => {
      const k = `${p.porprov15_laga?.nomor_situs_id}|${p.medali}`
      awak.set(k, [...(awak.get(k) ?? []), ...(p.atlet_nama ?? [])])
    })
    if (!data || data.length < 1000) break
  }
  const lengkap = (m: any): string[] => {
    const k = `${m.nomor_situs_id}|${m.medali}`
    const terpotong = (m.atlet_nama ?? []).length >= BATAS_NAMA_PODIUM
    const semua = [...(m.atlet_nama ?? []), ...(terpotong && satuPodium.get(k) === 1 ? awak.get(k) ?? [] : [])]
    const lihat = new Set<string>()
    return semua.filter(x => { const b = baku(x); if (lihat.has(b)) return false; lihat.add(b); return true })
  }
  const resmi: MedaliResmi[] = (med ?? []).map((m: any) => {
    const n = m.porprov15_nomor, c = n?.porprov15_cabor
    const awalan = n?.disiplin && n.disiplin !== c?.nama ? `${n.disiplin} · ` : ''
    return {
      id: m.id, nomorSitusId: m.nomor_situs_id, cabor: c?.nama ?? '', jenis: m.medali, atlet: lengkap(m),
      // Situs menulis Equestrian & Pacuan sama-sama "Berkuda": cabor ditentukan per nomor.
      caborId: cocokCabor(c?.nama ?? '', caborKita ?? [], n?.nama) ?? c?.cabor_id ?? null,
      nomor: `${awalan}${n?.nama ?? ''}`,
    }
  })
  const ids = Array.from(new Set((lap ?? []).flatMap((l: any) => l.atlet_ids ?? []))) as number[]
  const nama = new Map<number, string>()
  for (let i = 0; i < ids.length; i += 500) {
    const { data } = await db.from('atlet').select('id, nama_lengkap').in('id', ids.slice(i, i + 500))
    ;(data ?? []).forEach((a: any) => nama.set(a.id, a.nama_lengkap))
  }
  const kita: MedaliKita[] = (lap ?? []).map((l: any) => ({
    id: l.id, caborId: l.cabor_id, nomor: l.nomor_teks ?? '', jenis: l.hasil,
    atlet: (l.atlet_ids ?? []).map((i: number) => nama.get(i)).filter(Boolean),
  }))

  const h = rekonsiliasi(resmi, kita)
  return {
    kontingen: { nama: kon.nama, peringkat: kon.peringkat, emas: kon.emas, perak: kon.perak, perunggu: kon.perunggu },
    arsip: kosong.arsip,
    jumlah: { resmi: resmi.length, kita: kita.length, berpasangan: h.pasangan.length },
    resmiSaja: h.resmiSaja.map(r => ({ jenis: r.jenis, cabor: r.cabor, nomor: r.nomor, atlet: r.atlet, nomorSitusId: r.nomorSitusId })),
    kitaSaja: h.kitaSaja.map(k => ({ jenis: k.jenis, nomor: k.nomor, atlet: k.atlet, laporanId: k.id })),
    nomorBeda: h.pasangan.filter(p => !p.cocokNomor).map(p => ({ jenis: p.resmi.jenis, nomorResmi: p.resmi.nomor, nomorKita: p.kita.nomor, laporanId: p.kita.id })),
    atletBeda: h.pasangan.filter(p => p.atletBeda.hanyaResmi.length || p.atletBeda.hanyaKita.length).map(p => ({
      jenis: p.resmi.jenis, cabor: p.resmi.cabor, nomorResmi: p.resmi.nomor, nomorKita: p.kita.nomor, laporanId: p.kita.id,
      hanyaResmi: p.atletBeda.hanyaResmi, hanyaKita: p.atletBeda.hanyaKita, resmiTanpaNama: p.resmi.atlet.length === 0,
    })),
  }
}
